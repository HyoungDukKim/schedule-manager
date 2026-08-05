import type { ScheduleCategory } from "./schedule";

// 화면에서 사용할 보기 방식입니다.
export type ViewMode = "list" | "calendar" | "statistics";

// 애플리케이션 테마 종류입니다.
export type Theme = "light" | "dark";

// 카테고리 필터에서 선택할 수 있는 값입니다.
export type ScheduleCategoryFilter = "전체" | ScheduleCategory;

// 일정 목록에서 선택할 수 있는 정렬 방식입니다.
export type ScheduleSortOption =
  | "날짜 빠른순"
  | "날짜 늦은순"
  | "시간 빠른순"
  | "우선순위 높은순"
  | "미완료 일정 우선";
