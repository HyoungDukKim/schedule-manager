import { z } from "zod";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_NOTIFICATION_MINUTES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "./scheduleValues.js";

export type AiScheduleDraft = {
  title: string | null;
  date: string | null;
  time: string | null;
  category: (typeof SCHEDULE_CATEGORIES)[number];
  priority: (typeof SCHEDULE_PRIORITIES)[number];
  repeat: (typeof SCHEDULE_REPEATS)[number];
  repeatEndDate: string | null;
  notificationEnabled: boolean;
  notificationMinutesBefore: (typeof SCHEDULE_NOTIFICATION_MINUTES)[number] | null;
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

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// UTC 생성자를 사용해 실행 서버의 시간대와 무관하게 실제 달력 날짜인지 확인합니다.
export const isValidScheduleDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const isValidScheduleTime = (value: string) => TIME_PATTERN.test(value);

export const isScheduleNotificationMinutes = (
  value: unknown,
): value is (typeof SCHEDULE_NOTIFICATION_MINUTES)[number] =>
  typeof value === "number" &&
  SCHEDULE_NOTIFICATION_MINUTES.some((minutes) => minutes === value);

const nullableDateSchema = z
  .string()
  .refine(isValidScheduleDate, "실제로 존재하는 YYYY-MM-DD 날짜여야 합니다.")
  .nullable();

const nullableTimeSchema = z
  .string()
  .refine(isValidScheduleTime, "시간은 HH:mm 형식이어야 합니다.")
  .nullable();

// Structured Output과 클라이언트 재검증에서 함께 사용하는 단일 Draft 스키마입니다.
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
    if (draft.repeat === "반복 안함" && draft.repeatEndDate !== null) {
      context.addIssue({ code: "custom", path: ["repeatEndDate"], message: "반복 안함 일정에는 반복 종료일을 지정할 수 없습니다." });
    }
    if (draft.repeatEndDate !== null && (draft.date === null || draft.repeatEndDate < draft.date)) {
      context.addIssue({ code: "custom", path: ["repeatEndDate"], message: "반복 종료일은 시작일과 같거나 이후여야 합니다." });
    }
    if (draft.notificationEnabled && !isScheduleNotificationMinutes(draft.notificationMinutesBefore)) {
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
