import type { ScheduleCategory } from "./schedule";

// 화면에서 사용할 보기 방식입니다.
export type ViewMode = "list" | "calendar" | "statistics";

// 애플리케이션 테마 종류입니다.
export type Theme = "light" | "dark";

// 카테고리 필터에서 선택할 수 있는 값입니다.
export type ScheduleCategoryFilter = "전체" | ScheduleCategory;
