import { z } from "zod";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_NOTIFICATION_OPTIONS,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "../constants/schedule";
import type { AiScheduleDraft } from "../types/aiSchedule";
import type {
  ScheduleFormValues,
  ScheduleNotificationMinutes,
} from "../types/schedule";
import { parseDate } from "./dateUtils";
import {
  isScheduleCategory,
  isSchedulePriority,
  isScheduleRepeat,
} from "./scheduleUtils";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const NOTIFICATION_MINUTES = SCHEDULE_NOTIFICATION_OPTIONS.map(
  (option) => option.value,
);

// 문자열 모양뿐 아니라 윤년과 월별 일수까지 확인합니다.
export const isValidScheduleDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = parseDate(value);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

export const isValidScheduleTime = (value: string) => TIME_PATTERN.test(value);

export const isScheduleNotificationMinutes = (
  value: unknown,
): value is ScheduleNotificationMinutes =>
  typeof value === "number" &&
  NOTIFICATION_MINUTES.includes(value as ScheduleNotificationMinutes);

const nullableDateSchema = z
  .string()
  .refine(isValidScheduleDate, "실제로 존재하는 YYYY-MM-DD 날짜여야 합니다.")
  .nullable();

const nullableTimeSchema = z
  .string()
  .refine(isValidScheduleTime, "시간은 HH:mm 형식이어야 합니다.")
  .nullable();

// Structured Output과 클라이언트 재검증에서 함께 사용할 Draft 스키마입니다.
export const aiScheduleDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200).nullable(),
    date: nullableDateSchema,
    time: nullableTimeSchema,
    category: z.enum(SCHEDULE_CATEGORIES),
    priority: z.enum(SCHEDULE_PRIORITIES),
    repeat: z.enum(SCHEDULE_REPEATS),
    repeatEndDate: nullableDateSchema,
    notificationEnabled: z.boolean(),
    notificationMinutesBefore: z
      .union([z.literal(0), z.literal(5), z.literal(10), z.literal(30), z.literal(60)])
      .nullable(),
    needsClarification: z.boolean(),
    missingFields: z.array(z.string().trim().min(1).max(50)).max(10),
    clarificationQuestions: z.array(z.string().trim().min(1).max(300)).max(10),
  })
  .strict()
  .superRefine((draft, context) => {
    // 기존 타입 가드도 사용하여 현재 프로젝트 상수와의 일치를 이중 확인합니다.
    if (!isScheduleCategory(draft.category)) {
      context.addIssue({ code: "custom", path: ["category"], message: "허용되지 않은 카테고리입니다." });
    }
    if (!isSchedulePriority(draft.priority)) {
      context.addIssue({ code: "custom", path: ["priority"], message: "허용되지 않은 우선순위입니다." });
    }
    if (!isScheduleRepeat(draft.repeat)) {
      context.addIssue({ code: "custom", path: ["repeat"], message: "허용되지 않은 반복 방식입니다." });
    }
    if (draft.repeat === "반복 안함" && draft.repeatEndDate !== null) {
      context.addIssue({ code: "custom", path: ["repeatEndDate"], message: "반복 안함 일정에는 반복 종료일을 지정할 수 없습니다." });
    }
    if (draft.repeatEndDate !== null) {
      if (draft.date === null || draft.repeatEndDate < draft.date) {
        context.addIssue({ code: "custom", path: ["repeatEndDate"], message: "반복 종료일은 시작일과 같거나 이후여야 합니다." });
      }
    }
    if (
      draft.notificationEnabled &&
      !isScheduleNotificationMinutes(draft.notificationMinutesBefore)
    ) {
      context.addIssue({ code: "custom", path: ["notificationMinutesBefore"], message: "알림 사용 시 허용된 알림 시간이 필요합니다." });
    }
    if (!draft.notificationEnabled && draft.notificationMinutesBefore !== null) {
      context.addIssue({ code: "custom", path: ["notificationMinutesBefore"], message: "알림 미사용 시 알림 시간은 null이어야 합니다." });
    }
  });

export const aiScheduleRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
    context: z
      .object({
        localDate: z.string().refine(isValidScheduleDate),
        localTime: z.string().refine(isValidScheduleTime),
        timeZone: z.string().trim().min(1).max(100),
        utcOffsetMinutes: z.number().int().min(-840).max(840),
        locale: z.string().trim().min(2).max(35),
        weekStartsOn: z.literal("monday"),
      })
      .strict(),
  })
  .strict()
  .superRefine((request, context) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: request.context.timeZone });
    } catch {
      context.addIssue({ code: "custom", path: ["context", "timeZone"], message: "유효한 IANA 시간대가 아닙니다." });
    }
  });

export type AiScheduleDraftValidationResult =
  | { success: true; data: AiScheduleDraft }
  | { success: false; errors: string[] };

export const validateAiScheduleDraft = (
  value: unknown,
): AiScheduleDraftValidationResult => {
  const result = aiScheduleDraftSchema.safeParse(value);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "draft"}: ${issue.message}`,
    ),
  };
};

export type AiDraftConversionResult =
  | { success: true; values: ScheduleFormValues }
  | { success: false; errors: string[] };

// 필수값과 확인 절차가 모두 완료된 Draft만 기존 일정 폼 값으로 변환합니다.
export const convertAiDraftToScheduleFormValues = (
  value: unknown,
): AiDraftConversionResult => {
  const validation = validateAiScheduleDraft(value);
  if (!validation.success) return validation;

  const draft = validation.data;
  const errors: string[] = [];
  if (draft.title === null) errors.push("제목을 입력해 주세요.");
  if (draft.date === null) errors.push("날짜를 입력해 주세요.");
  if (draft.time === null) errors.push("시간을 입력해 주세요.");
  if (draft.needsClarification) errors.push("확인이 필요한 항목을 먼저 입력해 주세요.");
  if (errors.length > 0 || draft.title === null || draft.date === null || draft.time === null) {
    return { success: false, errors };
  }

  return {
    success: true,
    values: {
      title: draft.title,
      date: draft.date,
      time: draft.time,
      category: draft.category,
      priority: draft.priority,
      repeat: draft.repeat,
      ...(draft.repeatEndDate ? { repeatEndDate: draft.repeatEndDate } : {}),
      ...(draft.notificationEnabled && draft.notificationMinutesBefore !== null
        ? {
            notificationEnabled: true,
            notificationMinutesBefore: draft.notificationMinutesBefore,
          }
        : {}),
    },
  };
};
