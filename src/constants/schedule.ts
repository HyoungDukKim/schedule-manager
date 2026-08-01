import type {
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";

export const THEME_STORAGE_KEY = "schedule-theme";

export const SCHEDULE_CATEGORIES = [
  "업무",
  "개인",
  "운동",
  "공부",
  "기타",
] as const satisfies readonly ScheduleCategory[];

export const SCHEDULE_PRIORITIES = [
  "높음",
  "보통",
  "낮음",
] as const satisfies readonly SchedulePriority[];

export const SCHEDULE_REPEATS = [
  "반복 안함",
  "매일",
  "매주",
  "매월",
] as const satisfies readonly ScheduleRepeat[];

export const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export const getDefaultTime = () => "09:00";
export const getDefaultCategory = (): ScheduleCategory => "업무";
export const getDefaultPriority = (): SchedulePriority => "보통";
export const getDefaultRepeat = (): ScheduleRepeat => "반복 안함";
