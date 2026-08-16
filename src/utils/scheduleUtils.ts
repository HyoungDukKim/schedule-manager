import type {
  Schedule,
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";
import type {
  ScheduleCategoryFilter,
  ScheduleDateRangeFilter,
  ScheduleSortOption,
} from "../types/ui";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "../constants/schedule";
import {
  addDays,
  getDateDifference,
  getLocalDate,
  getMondayOfWeek,
  isSameLocalDate,
  parseDate,
} from "./dateUtils";

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

// 높은 우선순위에 더 작은 숫자를 지정하여 높음 → 보통 → 낮음 순서를 만듭니다.
const PRIORITY_ORDER: Record<SchedulePriority, number> = {
  높음: 0,
  보통: 1,
  낮음: 2,
};

// 날짜를 먼저 비교하고, 날짜가 같으면 더 빠른 시간을 앞에 배치합니다.
const compareDateTimeAscending = (first: Schedule, second: Schedule) =>
  first.date.localeCompare(second.date) || first.time.localeCompare(second.time);

// 앞의 조건이 모두 같을 때 제목으로 비교하여 화면 순서를 일정하게 유지합니다.
const compareTitles = (first: Schedule, second: Schedule) =>
  first.title.localeCompare(second.title, "ko");

// 검색과 카테고리 필터가 끝난 일정의 복사본만 선택한 방식으로 정렬합니다.
export const sortSchedules = (
  schedules: Schedule[],
  sortOption: ScheduleSortOption,
) => {
  // 전개 연산자로 새 배열을 만들어 원본 schedules 배열을 보호합니다.
  const copiedSchedules = [...schedules];

  return copiedSchedules.sort((first, second) => {
    if (sortOption === "날짜 빠른순") {
      return compareDateTimeAscending(first, second) || compareTitles(first, second);
    }

    if (sortOption === "날짜 늦은순") {
      // 날짜는 늦은 날짜부터, 같은 날짜 안에서는 빠른 시간부터 표시합니다.
      return (
        second.date.localeCompare(first.date) ||
        first.time.localeCompare(second.time) ||
        compareTitles(first, second)
      );
    }

    if (sortOption === "시간 빠른순") {
      return (
        first.time.localeCompare(second.time) ||
        first.date.localeCompare(second.date) ||
        compareTitles(first, second)
      );
    }

    if (sortOption === "우선순위 높은순") {
      return (
        PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority] ||
        compareDateTimeAscending(first, second) ||
        compareTitles(first, second)
      );
    }

    // 남은 옵션은 미완료(false)를 완료(true)보다 먼저 배치합니다.
    return (
      Number(first.completed) - Number(second.completed) ||
      compareDateTimeAscending(first, second) ||
      compareTitles(first, second)
    );
  });
};

// 날짜 범위 안에서 일정이 한 번이라도 실제로 표시되는지 확인합니다.
const occursInDateRange = (schedule: Schedule, startDate: Date, endDate: Date) => {
  for (
    let targetDate = startDate;
    targetDate <= endDate;
    targetDate = addDays(targetDate, 1)
  ) {
    // 기존 반복 일정 판정 함수를 재사용하여 매일·매주·매월 일정을 포함합니다.
    if (isScheduleOnDate(schedule, targetDate)) return true;
  }

  return false;
};

// 선택한 필터가 나타내는 로컬 시작일과 종료일을 계산합니다.
const getDateRange = (
  dateRangeFilter: ScheduleDateRangeFilter,
  referenceDate = new Date(),
) => {
  if (dateRangeFilter === "전체") return null;

  const today = getLocalDate(referenceDate);

  if (dateRangeFilter === "내일") {
    const tomorrow = addDays(today, 1);
    return { startDate: tomorrow, endDate: tomorrow };
  }

  if (dateRangeFilter === "이번 주") {
    const monday = getMondayOfWeek(today);
    return { startDate: monday, endDate: addDays(monday, 6) };
  }

  if (dateRangeFilter === "이번 달") {
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };
  }

  return { startDate: today, endDate: today };
};

// 달력의 각 날짜가 현재 선택한 날짜 범위 안에 있는지 확인합니다.
export const isDateInScheduleRange = (
  targetDate: Date,
  dateRangeFilter: ScheduleDateRangeFilter,
  referenceDate = new Date(),
) => {
  const dateRange = getDateRange(dateRangeFilter, referenceDate);
  if (!dateRange) return true;

  const localTargetDate = getLocalDate(targetDate);
  return (
    localTargetDate >= dateRange.startDate && localTargetDate <= dateRange.endDate
  );
};

// 검색과 카테고리 필터가 끝난 일정에 로컬 날짜 범위를 적용합니다.
export const filterSchedulesByDateRange = (
  schedules: Schedule[],
  dateRangeFilter: ScheduleDateRangeFilter,
  referenceDate = new Date(),
) => {
  const dateRange = getDateRange(dateRangeFilter, referenceDate);
  if (!dateRange) return schedules;

  return schedules.filter((schedule) =>
    occursInDateRange(schedule, dateRange.startDate, dateRange.endDate),
  );
};

// 반복 규칙과 선택적 종료일만으로 특정 로컬 날짜의 발생 여부를 계산합니다.
export const isRecurringDate = (
  startDate: Date,
  targetDate: Date,
  repeat: ScheduleRepeat,
  endDate?: Date,
) => {
  // 시간 값의 영향을 받지 않도록 두 날짜를 모두 로컬 자정으로 맞춥니다.
  const localStartDate = getLocalDate(startDate);
  const localTargetDate = getLocalDate(targetDate);

  // 모든 반복은 시작일 당일부터 가능하며 시작일 이전에는 발생하지 않습니다.
  if (localTargetDate < localStartDate) return false;

  // 종료일이 있으면 종료일 당일까지 허용하고 다음 날부터 차단합니다.
  if (endDate && localTargetDate > getLocalDate(endDate)) return false;

  if (repeat === "반복 안함") {
    return isSameLocalDate(localStartDate, localTargetDate);
  }

  // 매일 반복은 시작일 이후의 모든 로컬 날짜에 발생합니다.
  if (repeat === "매일") return true;

  if (repeat === "매주") {
    // 시작일로부터 7일 단위인지 검사하므로 시작일과 같은 요일에만 발생합니다.
    return getDateDifference(localStartDate, localTargetDate) % 7 === 0;
  }

  if (repeat === "매월") {
    // 같은 일(day)이 실제로 존재하는 달에만 발생하며 없는 달은 건너뜁니다.
    return localStartDate.getDate() === localTargetDate.getDate();
  }

  // 매년은 같은 월과 일에만 발생합니다.
  // 평년에는 2월 29일이 없으므로 윤년의 2월 29일에만 자연스럽게 일치합니다.
  return (
    localStartDate.getMonth() === localTargetDate.getMonth() &&
    localStartDate.getDate() === localTargetDate.getDate()
  );
};

// 저장된 일정의 시작일과 반복 규칙을 이용해 특정 날짜의 표시 여부를 확인합니다.
export const isScheduleOnDate = (schedule: Schedule, targetDate: Date) =>
  isRecurringDate(
    parseDate(schedule.date),
    targetDate,
    schedule.repeat,
    schedule.repeatEndDate ? parseDate(schedule.repeatEndDate) : undefined,
  );

// 선택한 날짜에 실제 발생하는 일정의 복사본을 시간과 제목 순으로 정렬합니다.
export const getSchedulesForDate = (
  schedules: Schedule[],
  targetDate: Date,
) => schedules
  .filter((schedule) => isScheduleOnDate(schedule, targetDate))
  .sort((first, second) =>
    first.time.localeCompare(second.time) ||
    first.title.localeCompare(second.title, "ko"),
  );
