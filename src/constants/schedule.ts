import type {
  Schedule,
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";
import { getToday } from "../utils/dateUtils";

export const STORAGE_KEY = "schedules";
export const THEME_STORAGE_KEY = "schedule-theme";

export const SCHEDULE_CATEGORIES: ScheduleCategory[] = [
  "업무",
  "개인",
  "운동",
  "공부",
  "기타",
];

export const SCHEDULE_PRIORITIES: SchedulePriority[] = [
  "높음",
  "보통",
  "낮음",
];

export const SCHEDULE_REPEATS: ScheduleRepeat[] = [
  "반복 안함",
  "매일",
  "매주",
  "매월",
];

export const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 1,
    title: "팀 회의",
    completed: false,
    date: getToday(),
    time: "09:00",
    category: "업무",
    priority: "높음",
    repeat: "매주",
  },
  {
    id: 2,
    title: "저녁 운동",
    completed: false,
    date: getToday(),
    time: "18:00",
    category: "운동",
    priority: "보통",
    repeat: "매일",
  },
  {
    id: 3,
    title: "책 읽기",
    completed: true,
    date: getToday(),
    time: "20:00",
    category: "공부",
    priority: "낮음",
    repeat: "반복 안함",
  },
];

export const getDefaultTime = () => "09:00";
export const getDefaultCategory = (): ScheduleCategory => "업무";
export const getDefaultPriority = (): SchedulePriority => "보통";
export const getDefaultRepeat = (): ScheduleRepeat => "반복 안함";
