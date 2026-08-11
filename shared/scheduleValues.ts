// 서버와 브라우저가 동일한 일정 허용값을 사용하도록 공용 영역에서 관리합니다.
export const SCHEDULE_CATEGORIES = ["업무", "개인", "운동", "공부", "기타"] as const;

export const SCHEDULE_PRIORITIES = ["높음", "보통", "낮음"] as const;

export const SCHEDULE_REPEATS = [
  "반복 안함",
  "매일",
  "매주",
  "매월",
  "매년",
] as const;

export const SCHEDULE_NOTIFICATION_MINUTES = [0, 5, 10, 30, 60] as const;

