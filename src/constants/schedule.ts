import type {
  ScheduleCategory,
  SchedulePriority,
  ScheduleRepeat,
} from "../types/schedule";
import type {
  ScheduleCategoryFilter,
  ScheduleDateRangeFilter,
  ScheduleSortOption,
} from "../types/ui";

export const THEME_STORAGE_KEY = "schedule-theme";

export const SCHEDULE_CATEGORIES = [
  "업무",
  "개인",
  "운동",
  "공부",
  "기타",
] as const satisfies readonly ScheduleCategory[];

// 화면의 카테고리 필터에는 전체 보기 항목을 함께 제공합니다.
export const SCHEDULE_FILTER_CATEGORIES = [
  "전체",
  ...SCHEDULE_CATEGORIES,
] as const satisfies readonly ScheduleCategoryFilter[];

// 날짜 범위 필터 버튼에 표시할 값을 한곳에서 관리합니다.
export const SCHEDULE_DATE_RANGE_FILTERS = [
  "전체",
  "오늘",
  "내일",
  "이번 주",
  "이번 달",
] as const satisfies readonly ScheduleDateRangeFilter[];

// 정렬 선택 상자에 표시할 옵션을 한곳에서 관리합니다.
export const SCHEDULE_SORT_OPTIONS = [
  "날짜 빠른순",
  "날짜 늦은순",
  "시간 빠른순",
  "우선순위 높은순",
  "미완료 일정 우선",
] as const satisfies readonly ScheduleSortOption[];

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
  "매년",
] as const satisfies readonly ScheduleRepeat[];

export const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export const getDefaultTime = () => "09:00";
export const getDefaultCategory = (): ScheduleCategory => "업무";
export const getDefaultPriority = (): SchedulePriority => "보통";
export const getDefaultRepeat = (): ScheduleRepeat => "반복 안함";
