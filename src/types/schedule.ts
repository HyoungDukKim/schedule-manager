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
  | "매월"
  | "매년";

// 일정 알림을 얼마나 일찍 표시할지 나타내는 허용 값입니다.
export type ScheduleNotificationMinutes = 0 | 5 | 10 | 30 | 60;

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

  // 반복 종료일입니다. 값이 없으면 종료 없이 계속 반복합니다.
  // 기존 Firestore 문서와 호환되도록 선택 필드로 유지합니다.
  repeatEndDate?: string;

  // 기존 Firestore 문서와 호환되도록 알림 설정은 선택 필드로 유지합니다.
  notificationEnabled?: boolean;
  notificationMinutesBefore?: ScheduleNotificationMinutes;
}

export type ScheduleData = Omit<Schedule, "id">;

export type ScheduleFormValues = Omit<ScheduleData, "completed">;
