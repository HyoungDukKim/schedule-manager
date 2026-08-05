import type {
  Schedule,
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";
import type {
  ScheduleCategoryFilter,
  ScheduleSortOption,
} from "../types/ui";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "../constants/schedule";
import { getDateDifference, parseDate } from "./dateUtils";

// Firestore에서 받은 값이 허용된 일정 카테고리인지 확인합니다.
export const isScheduleCategory = (value: unknown): value is ScheduleCategory =>
  SCHEDULE_CATEGORIES.includes(value as ScheduleCategory);

// Firestore에서 받은 값이 허용된 일정 우선순위인지 확인합니다.
export const isSchedulePriority = (value: unknown): value is SchedulePriority =>
  SCHEDULE_PRIORITIES.includes(value as SchedulePriority);

// Firestore에서 받은 값이 허용된 반복 규칙인지 확인합니다.
export const isScheduleRepeat = (value: unknown): value is ScheduleRepeat =>
  SCHEDULE_REPEATS.includes(value as ScheduleRepeat);

// 검색어를 정규화한 뒤 일정 제목에 포함되는 항목만 반환합니다.
// 소문자로 변환해 영문 제목 검색 시 대소문자를 구분하지 않습니다.
export const filterSchedules = (
  schedules: Schedule[],
  searchText: string,
  categoryFilter: ScheduleCategoryFilter,
) => {
  const normalized = searchText.trim().toLowerCase();

  // 제목 검색 조건과 카테고리 조건을 모두 만족하는 일정만 반환합니다.
  return schedules.filter((schedule) => {
    // 검색어가 없으면 모든 제목이 검색 조건을 만족합니다.
    const matchesTitle =
      !normalized || schedule.title.toLowerCase().includes(normalized);

    // "전체"를 선택하면 모든 카테고리가 필터 조건을 만족합니다.
    const matchesCategory =
      categoryFilter === "전체" || schedule.category === categoryFilter;

    return matchesTitle && matchesCategory;
  });
};

// 우선순위순 정렬에서 높은 우선순위가 먼저 오도록 숫자 값을 지정합니다.
const PRIORITY_ORDER: Record<SchedulePriority, number> = {
  높음: 0,
  보통: 1,
  낮음: 2,
};

// 날짜와 시간이 모두 같을 때도 일정한 순서를 유지하기 위한 제목 비교 함수입니다.
const compareTitles = (first: Schedule, second: Schedule) =>
  first.title.localeCompare(second.title, "ko");

// 검색과 카테고리 필터가 끝난 배열의 복사본을 선택한 방식으로 정렬합니다.
export const sortSchedules = (
  schedules: Schedule[],
  sortOption: ScheduleSortOption,
) => {
  // 원본 schedules 배열을 변경하지 않도록 전개 연산자로 먼저 복사합니다.
  const copiedSchedules = [...schedules];

  return copiedSchedules.sort((first, second) => {
    // 날짜와 시간을 합친 문자열은 YYYY-MM-DD HH:mm 형식이라 문자열 비교가 가능합니다.
    const firstDateTime = `${first.date} ${first.time}`;
    const secondDateTime = `${second.date} ${second.time}`;

    if (sortOption === "날짜 빠른순") {
      return firstDateTime.localeCompare(secondDateTime) || compareTitles(first, second);
    }

    if (sortOption === "날짜 늦은순") {
      return secondDateTime.localeCompare(firstDateTime) || compareTitles(first, second);
    }

    if (sortOption === "시간순") {
      return (
        first.time.localeCompare(second.time) ||
        first.date.localeCompare(second.date) ||
        compareTitles(first, second)
      );
    }

    if (sortOption === "우선순위순") {
      return (
        PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority] ||
        firstDateTime.localeCompare(secondDateTime) ||
        compareTitles(first, second)
      );
    }

    // 완료 여부를 숫자로 바꾸면 미완료(false)가 완료(true)보다 먼저 배치됩니다.
    return (
      Number(first.completed) - Number(second.completed) ||
      firstDateTime.localeCompare(secondDateTime) ||
      compareTitles(first, second)
    );
  });
};

// 지정한 날짜에 단일 또는 반복 일정이 표시되어야 하는지 확인합니다.
export const isScheduleOnDate = (schedule: Schedule, targetDate: Date) => {
  const scheduleDate = parseDate(schedule.date);

  // 일정 시작일보다 이전 날짜에는 일정을 표시하지 않습니다.
  if (targetDate < scheduleDate) return false;

  // 반복하지 않는 일정은 저장된 날짜와 대상 날짜가 같을 때만 표시합니다.
  if (schedule.repeat === "반복 안함") {
    return (
      scheduleDate.getFullYear() === targetDate.getFullYear() &&
      scheduleDate.getMonth() === targetDate.getMonth() &&
      scheduleDate.getDate() === targetDate.getDate()
    );
  }

  // 매일 반복 일정은 시작일 이후 모든 날짜에 표시합니다.
  if (schedule.repeat === "매일") return true;

  // 시작일과 대상 날짜의 차이로 주간 또는 월간 반복 여부를 계산합니다.
  const difference = getDateDifference(scheduleDate, targetDate);
  if (schedule.repeat === "매주") return difference % 7 === 0;
  if (schedule.repeat === "매월") return scheduleDate.getDate() === targetDate.getDate();

  return false;
};
