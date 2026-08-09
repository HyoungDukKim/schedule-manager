import type {
  ScheduleCategory,
  ScheduleNotificationMinutes,
  SchedulePriority,
  ScheduleRepeat,
} from "./schedule";

// AI 분석 단계에서는 필수 일정 정보가 빠질 수 있으므로 기존 폼 타입과 분리합니다.
export type AiScheduleDraft = {
  title: string | null;
  date: string | null;
  time: string | null;
  category: ScheduleCategory;
  priority: SchedulePriority;
  repeat: ScheduleRepeat;
  repeatEndDate: string | null;
  notificationEnabled: boolean;
  notificationMinutesBefore: ScheduleNotificationMinutes | null;
  needsClarification: boolean;
  missingFields: string[];
  clarificationQuestions: string[];
};

export type AiScheduleRequestContext = {
  localDate: string;
  localTime: string;
  timeZone: string;
  utcOffsetMinutes: number;
  locale: string;
  weekStartsOn: "monday";
};

export type AiScheduleRequest = {
  text: string;
  context: AiScheduleRequestContext;
};
