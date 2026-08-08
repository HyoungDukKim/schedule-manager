import type {
  Schedule,
  ScheduleNotificationMinutes,
} from "../types/schedule";
import { addDays, formatDate, getLocalDate } from "./dateUtils";
import { isScheduleOnDate } from "./scheduleUtils";

export type DueScheduleNotification = {
  schedule: Schedule;
  occurrenceDate: string;
  notificationAt: Date;
  key: string;
};

const ALLOWED_MINUTES = new Set<ScheduleNotificationMinutes>([0, 5, 10, 30, 60]);

// Date 객체를 사용자의 로컬 날짜 문자열로 바꿉니다.
export const formatLocalDate = (date: Date) =>
  formatDate(date.getFullYear(), date.getMonth(), date.getDate());

// 일정의 특정 발생일과 HH:mm 값을 합쳐 로컬 시각을 만듭니다.
export const getScheduleOccurrenceTime = (schedule: Schedule, date: Date) => {
  const [hour, minute] = schedule.time.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  );
};

// polling 경계에서 정확히 같은 밀리초를 요구하지 않고 검사 구간 안에 들어왔는지 확인합니다.
export const isNotificationDue = (
  notificationAt: Date,
  from: Date,
  now: Date,
) => notificationAt <= now && notificationAt > from;

// 마지막 확인 시각과 현재 시각 사이에 도달한 알림만 반환하는 순수 함수입니다.
export const getDueScheduleNotifications = (
  schedules: Schedule[],
  from: Date,
  now: Date,
): DueScheduleNotification[] => {
  if (now < from) return [];

  const today = getLocalDate(now);
  const candidateDates = [today, addDays(today, 1)];

  return schedules.flatMap((schedule) => {
    const minutes = schedule.notificationMinutesBefore;
    if (
      schedule.completed ||
      schedule.notificationEnabled !== true ||
      minutes === undefined ||
      !ALLOWED_MINUTES.has(minutes)
    ) {
      return [];
    }

    return candidateDates.flatMap((occurrenceDate) => {
      if (!isScheduleOnDate(schedule, occurrenceDate)) return [];

      const occurrenceTime = getScheduleOccurrenceTime(schedule, occurrenceDate);
      const notificationAt = new Date(
        occurrenceTime.getTime() - minutes * 60_000,
      );
      if (!isNotificationDue(notificationAt, from, now)) return [];

      const occurrenceDateText = formatLocalDate(occurrenceDate);
      return [{
        schedule,
        occurrenceDate: occurrenceDateText,
        notificationAt,
        key: `${schedule.id}:${occurrenceDateText}:${notificationAt.getTime()}`,
      }];
    });
  });
};
