import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// 네트워크와 새 버전 상태를 기존 화면 위에 작게 안내합니다.
function PwaStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // vite-plugin-pwa가 만든 서비스 워커를 등록하고 업데이트 상태를 받습니다.
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("PWA 서비스 워커를 등록하지 못했습니다.", error);
    },
  });

  useEffect(() => {
    // 브라우저의 온라인·오프라인 전환을 즉시 화면에 반영합니다.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="pwa-notice offline" role="status">
        인터넷 연결을 확인해 주세요.
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div className="pwa-notice update" role="status">
        <span>새 버전이 있습니다. 새로고침해 적용할 수 있습니다.</span>
        <div className="pwa-notice-actions">
          <button type="button" onClick={() => void updateServiceWorker(true)}>
            새로고침
          </button>
          <button type="button" onClick={() => setNeedRefresh(false)}>
            나중에
          </button>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="pwa-notice ready" role="status">
        <span>오프라인 실행 준비가 완료되었습니다.</span>
        <button type="button" onClick={() => setOfflineReady(false)}>
          확인
        </button>
      </div>
    );
  }

  return null;
}

export default PwaStatus;
