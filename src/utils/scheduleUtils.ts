import type {
  Schedule,
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";
import {
  DEFAULT_SCHEDULES,
  SCHEDULE_CATEGORIES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
  STORAGE_KEY,
  getDefaultCategory,
  getDefaultPriority,
  getDefaultRepeat,
  getDefaultTime,
} from "../constants/schedule";
import { getDateDifference, getToday, parseDate } from "./dateUtils";

export const isScheduleCategory = (value: unknown): value is ScheduleCategory =>
  SCHEDULE_CATEGORIES.includes(value as ScheduleCategory);

export const isSchedulePriority = (value: unknown): value is SchedulePriority =>
  SCHEDULE_PRIORITIES.includes(value as SchedulePriority);

export const isScheduleRepeat = (value: unknown): value is ScheduleRepeat =>
  SCHEDULE_REPEATS.includes(value as ScheduleRepeat);

export const loadSchedules = (): Schedule[] => {
  try {
    const savedSchedules = localStorage.getItem(STORAGE_KEY);
    if (!savedSchedules) return DEFAULT_SCHEDULES;

    const parsedSchedules: unknown = JSON.parse(savedSchedules);
    if (!Array.isArray(parsedSchedules)) return DEFAULT_SCHEDULES;

    return parsedSchedules.map((schedule) => ({
      ...schedule,
      date: typeof schedule.date === "string" ? schedule.date : getToday(),
      time: typeof schedule.time === "string" ? schedule.time : getDefaultTime(),
      category: isScheduleCategory(schedule.category)
        ? schedule.category
        : getDefaultCategory(),
      priority: isSchedulePriority(schedule.priority)
        ? schedule.priority
        : getDefaultPriority(),
      repeat: isScheduleRepeat(schedule.repeat)
        ? schedule.repeat
        : getDefaultRepeat(),
    })) as Schedule[];
  } catch (error) {
    console.error("일정 데이터를 불러오는 중 오류가 발생했습니다.", error);
    return DEFAULT_SCHEDULES;
  }
};

export const filterSchedules = (schedules: Schedule[], searchText: string) => {
  const normalized = searchText.trim().toLowerCase();
  if (!normalized) return schedules;

  return schedules.filter(
    (schedule) =>
      schedule.title.toLowerCase().includes(normalized) ||
      schedule.category.toLowerCase().includes(normalized),
  );
};

export const isScheduleOnDate = (schedule: Schedule, targetDate: Date) => {
  const scheduleDate = parseDate(schedule.date);
  if (targetDate < scheduleDate) return false;

  if (schedule.repeat === "반복 안함") {
    return (
      scheduleDate.getFullYear() === targetDate.getFullYear() &&
      scheduleDate.getMonth() === targetDate.getMonth() &&
      scheduleDate.getDate() === targetDate.getDate()
    );
  }

  if (schedule.repeat === "매일") return true;

  const difference = getDateDifference(scheduleDate, targetDate);
  if (schedule.repeat === "매주") return difference % 7 === 0;
  if (schedule.repeat === "매월") return scheduleDate.getDate() === targetDate.getDate();

  return false;
};
