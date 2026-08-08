import { useCallback, useEffect, useRef, useState } from "react";
import type { Schedule } from "../../types/schedule";
import { getDueScheduleNotifications } from "../../utils/notificationUtils";

type Props = {
  userId: string;
  schedules: Schedule[];
};

type PermissionState = NotificationPermission | "unsupported";

// 이전 버전은 알림 표시 전에 키를 저장했으므로 새 버전 키로 잘못된 이력을 초기화합니다.
const HISTORY_PREFIX = "schedule-notification-history-v2:";
const HISTORY_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL = 30_000;
// 30초 polling이 경계에서 조금 늦어져도 놓치지 않도록 두 주기까지 허용합니다.
const MAX_NOTIFICATION_DELAY = CHECK_INTERVAL * 2;

// 사용자별 알림 이력을 읽고 오래된 키는 제거합니다.
const readHistory = (userId: string) => {
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) as Record<string, number> : {};
    const oldestAllowed = Date.now() - HISTORY_MAX_AGE;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, timestamp]) => timestamp >= oldestAllowed),
    );
  } catch {
    return {} as Record<string, number>;
  }
};

const writeHistory = (userId: string, history: Record<string, number>) => {
  try {
    localStorage.setItem(`${HISTORY_PREFIX}${userId}`, JSON.stringify(history));
  } catch {
    // 저장 공간을 사용할 수 없어도 현재 실행 중인 메모리 이력은 계속 사용합니다.
  }
};

function NotificationCenter({ userId, schedules }: Props) {
  const supported = "Notification" in window;
  const [permission, setPermission] = useState<PermissionState>(
    supported ? Notification.permission : "unsupported",
  );
  const [message, setMessage] = useState("");
  const schedulesRef = useRef(schedules);
  // 현재 시각과 브라우저 저장소는 effect에서 읽어 렌더 함수를 순수하게 유지합니다.
  const lastCheckRef = useRef<Date | null>(null);
  const historyRef = useRef<Record<string, number>>({});
  const pendingKeysRef = useRef(new Set<string>());

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  useEffect(() => {
    historyRef.current = readHistory(userId);
    pendingKeysRef.current.clear();
    lastCheckRef.current = null;
  }, [userId]);

  // 권한 요청은 브라우저 정책에 맞게 사용자가 버튼을 누른 경우에만 실행합니다.
  const requestPermission = useCallback(async () => {
    if (!supported) {
      setMessage("이 브라우저는 알림 기능을 지원하지 않습니다.");
      return;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      setMessage("브라우저 설정에서 이 사이트의 알림 권한을 허용해 주세요.");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    setMessage(
      result === "granted"
        ? "일정 알림이 켜졌습니다. 앱이 실행 중일 때 알림을 받을 수 있습니다."
        : "알림이 허용되지 않았습니다. 브라우저 설정에서 변경할 수 있습니다.",
    );
  }, [supported]);

  const showNotification = useCallback(async (
    title: string,
    body: string,
    tag: string,
  ) => {
    const options: NotificationOptions = {
      body,
      tag,
      icon: "/pwa-192x192.png",
      badge: "/pwa-64x64.png",
    };

    try {
      // 현재 브라우저에서 검증된 Notification 생성자를 우선 사용합니다.
      new Notification(title, options);
      return;
    } catch (notificationError) {
      // 일부 모바일 브라우저는 생성자 대신 활성 Service Worker 알림만 허용합니다.
      // ready는 활성 등록이 없을 때 끝없이 대기할 수 있으므로 사용하지 않습니다.
      const registration = "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined;
      if (!registration?.active) throw notificationError;
      await registration.showNotification(title, options);
    }
  }, []);

  const checkNotifications = useCallback(() => {
    if (!supported || Notification.permission !== "granted") return;

    const now = new Date();
    const earliestCatchUp = now.getTime() - MAX_NOTIFICATION_DELAY;
    const previousCheck = lastCheckRef.current?.getTime() ?? earliestCatchUp;
    const from = new Date(Math.max(previousCheck, earliestCatchUp));
    const dueNotifications = getDueScheduleNotifications(
      schedulesRef.current,
      from,
      now,
    );
    lastCheckRef.current = now;

    dueNotifications.forEach(({ schedule, occurrenceDate, key }) => {
      const isDuplicate = Boolean(historyRef.current[key]);
      if (isDuplicate || pendingKeysRef.current.has(key)) return;

      // 비동기 호출 중 다음 polling이 실행되는 경우만 메모리 pending 키로 막습니다.
      pendingKeysRef.current.add(key);
      void showNotification(
        schedule.title,
        `${occurrenceDate} ${schedule.time} 일정이 곧 시작됩니다.`,
        key,
      ).then(() => {
        // Notification 호출이 성공한 뒤에만 영구 중복 방지 이력을 기록합니다.
        historyRef.current[key] = Date.now();
        writeHistory(userId, historyRef.current);
      }).catch((error: unknown) => {
        console.error("일정 알림 표시 실패", error);
        setMessage("알림을 표시하지 못했습니다. Console의 오류 내용을 확인해 주세요.");
      }).finally(() => {
        pendingKeysRef.current.delete(key);
      });
    });
  }, [showNotification, supported, userId]);

  useEffect(() => {
    checkNotifications();
    const intervalId = window.setInterval(checkNotifications, CHECK_INTERVAL);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (supported) setPermission(Notification.permission);
        checkNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkNotifications, supported]);

  const statusText = permission === "unsupported"
    ? "알림 미지원"
    : permission === "granted"
      ? "알림 허용됨"
      : permission === "denied"
        ? "알림 차단됨"
        : "알림 권한 필요";

  return (
    <section className="notification-center" aria-labelledby="notification-title">
      <div>
        <h3 id="notification-title">일정 알림</h3>
        <p>
          {permission === "granted"
            ? "알림을 설정한 일정은 앱이 실행 중일 때 알려드립니다."
            : "일정 알림을 받으려면 브라우저 알림 권한을 허용해 주세요."}
        </p>
        <span className={`notification-permission notification-permission-${permission}`}>
          {statusText}
        </span>
      </div>

      {permission === "default" && (
        <button type="button" onClick={() => void requestPermission()}>
          알림 켜기
        </button>
      )}

      {permission === "denied" && (
        <p className="notification-help" role="status">
          권한이 차단되어 있습니다. 브라우저의 사이트 설정에서 직접 허용해 주세요.
        </p>
      )}
      {message && <p className="notification-message" role="status">{message}</p>}
    </section>
  );
}

export default NotificationCenter;
