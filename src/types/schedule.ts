// 일정에서 사용할 수 있는 카테고리입니다.
export type ScheduleCategory =
  | "업무"
  | "개인"
  | "운동"
  | "공부"
  | "기타";

// 일정의 우선순위입니다.
export type SchedulePriority =
  | "높음"
  | "보통"
  | "낮음";

// 일정의 반복 규칙입니다.
export type ScheduleRepeat =
  | "반복 안함"
  | "매일"
  | "매주"
  | "매월";

// 일정 한 개의 전체 데이터 구조입니다.
export interface Schedule {
  // Firestore 문서 ID입니다.
  id: string;

  // 일정 제목입니다.
  title: string;

  // 일정 완료 여부입니다.
  completed: boolean;

  // 일정 날짜입니다.
  // YYYY-MM-DD 형식으로 저장합니다.
  date: string;

  // 일정 시간입니다.
  // HH:mm 형식으로 저장합니다.
  time: string;

  // 일정 카테고리입니다.
  category: ScheduleCategory;

  // 일정 우선순위입니다.
  priority: SchedulePriority;

  // 일정 반복 규칙입니다.
  repeat: ScheduleRepeat;
}

export type ScheduleData = Omit<Schedule, "id">;

export type ScheduleFormValues = Omit<ScheduleData, "completed">;
