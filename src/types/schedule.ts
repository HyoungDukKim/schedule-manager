import type {
  SCHEDULE_CATEGORIES,
  SCHEDULE_NOTIFICATION_MINUTES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "../../shared/scheduleValues.js";
import type {
  ScheduleContractData,
  ScheduleContractFormValues,
} from "../../shared/scheduleContract.js";

// 공용 허용값 배열에서 타입도 파생하여 UI와 서버 사이의 값 목록 차이를 막습니다.
export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

// 일정의 우선순위입니다.
export type SchedulePriority = (typeof SCHEDULE_PRIORITIES)[number];

// 일정의 반복 규칙입니다.
export type ScheduleRepeat = (typeof SCHEDULE_REPEATS)[number];

// 일정 알림을 얼마나 일찍 표시할지 나타내는 허용 값입니다.
export type ScheduleNotificationMinutes =
  (typeof SCHEDULE_NOTIFICATION_MINUTES)[number];

// 공용 계약을 통과한 Firestore 일정에 문서 ID만 더한 화면용 타입입니다.
export interface Schedule extends ScheduleContractData {
  // Firestore 문서 ID입니다.
  id: string;
}

export type ScheduleData = ScheduleContractData;

export type ScheduleFormValues = ScheduleContractFormValues;
