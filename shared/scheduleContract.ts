import { z } from "zod";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_NOTIFICATION_MINUTES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_REPEATS,
} from "./scheduleValues.js";

// Schedule의 모든 저장·읽기 경로가 공유하는 공식 필드 제한입니다.
export const SCHEDULE_TITLE_MAX_LENGTH = 200;
export const SCHEDULE_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const SCHEDULE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// UTC 생성자를 사용해 실행 환경의 시간대와 무관하게 실제 달력 날짜인지 확인합니다.
export const isValidScheduleDate = (value: string) => {
  if (!SCHEDULE_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const isValidScheduleTime = (value: string) =>
  SCHEDULE_TIME_PATTERN.test(value);

export const isScheduleNotificationMinutes = (
  value: unknown,
): value is (typeof SCHEDULE_NOTIFICATION_MINUTES)[number] =>
  typeof value === "number" &&
  SCHEDULE_NOTIFICATION_MINUTES.some((minutes) => minutes === value);

const scheduleEditableShape = {
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(
    SCHEDULE_TITLE_MAX_LENGTH,
    `제목은 ${SCHEDULE_TITLE_MAX_LENGTH}자 이하여야 합니다.`,
  ),
  date: z.string().refine(
    isValidScheduleDate,
    "실제로 존재하는 YYYY-MM-DD 날짜여야 합니다.",
  ),
  time: z.string().refine(
    isValidScheduleTime,
    "시간은 HH:mm 형식이어야 합니다.",
  ),
  category: z.enum(SCHEDULE_CATEGORIES, "알 수 없는 카테고리입니다."),
  priority: z.enum(SCHEDULE_PRIORITIES, "알 수 없는 우선순위입니다."),
  repeat: z.enum(SCHEDULE_REPEATS, "알 수 없는 반복 방식입니다."),
  repeatEndDate: z.string().refine(
    isValidScheduleDate,
    "반복 종료일은 실제로 존재하는 YYYY-MM-DD 날짜여야 합니다.",
  ).optional(),
  notificationEnabled: z.boolean().optional(),
  notificationMinutesBefore: z.custom<
    (typeof SCHEDULE_NOTIFICATION_MINUTES)[number]
  >(
    isScheduleNotificationMinutes,
    "알림 시간은 0, 5, 10, 30, 60분 중 하나여야 합니다.",
  ).optional(),
};

type SchedulePolicyFields = {
  date: string;
  repeat: (typeof SCHEDULE_REPEATS)[number];
  repeatEndDate?: string;
  notificationEnabled?: boolean;
  notificationMinutesBefore?: (typeof SCHEDULE_NOTIFICATION_MINUTES)[number];
};

// 필드별 형식 검증 뒤 필드 사이의 관계를 한 곳에서 검증합니다.
const validateSchedulePolicy = (
  value: SchedulePolicyFields,
  context: z.RefinementCtx,
) => {
  if (value.repeat === "반복 안함" && value.repeatEndDate !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["repeatEndDate"],
      message: "반복 안함 일정에는 반복 종료일을 지정할 수 없습니다.",
    });
  }
  if (
    value.repeat !== "반복 안함" &&
    value.repeatEndDate !== undefined &&
    value.repeatEndDate < value.date
  ) {
    context.addIssue({
      code: "custom",
      path: ["repeatEndDate"],
      message: "반복 종료일은 시작일과 같거나 이후여야 합니다.",
    });
  }

  if (
    value.notificationEnabled === true &&
    !isScheduleNotificationMinutes(value.notificationMinutesBefore)
  ) {
    context.addIssue({
      code: "custom",
      path: ["notificationMinutesBefore"],
      message: "알림 사용 시 0, 5, 10, 30, 60분 중 하나가 필요합니다.",
    });
  }
  if (
    value.notificationEnabled !== true &&
    value.notificationMinutesBefore !== undefined
  ) {
    context.addIssue({
      code: "custom",
      path: ["notificationMinutesBefore"],
      message: "알림을 사용하지 않을 때는 알림 시간을 저장할 수 없습니다.",
    });
  }
};

// 과거의 notificationEnabled:false 단독 문서는 표준 형태인 필드 없음으로 정규화합니다.
const normalizeDisabledNotification = <T extends SchedulePolicyFields>(value: T) => {
  if (value.notificationEnabled !== false) return value;
  const normalized = { ...value };

  // 알림 미사용 일정은 두 선택 필드를 모두 생략하는 표준 저장 형태로 통일합니다.
  delete normalized.notificationEnabled;
  delete normalized.notificationMinutesBefore;
  return normalized;
};

const scheduleFormValuesInputSchema = z
  .object(scheduleEditableShape)
  .strict()
  .superRefine(validateSchedulePolicy);

const scheduleDataInputSchema = z
  .object({
    ...scheduleEditableShape,
    completed: z.boolean(),
  })
  .strict()
  .superRefine(validateSchedulePolicy);

export const scheduleFormValuesSchema = scheduleFormValuesInputSchema.transform(
  normalizeDisabledNotification,
);
export const scheduleDataSchema = scheduleDataInputSchema.transform(
  normalizeDisabledNotification,
);

export type ScheduleContractFormValues = z.output<typeof scheduleFormValuesSchema>;
export type ScheduleContractData = z.output<typeof scheduleDataSchema>;

export type ScheduleContractIssue = {
  field: string;
  message: string;
};

export type ScheduleContractValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: ScheduleContractIssue[]; errors: string[] };

const toValidationResult = <T>(
  result: z.ZodSafeParseResult<T>,
): ScheduleContractValidationResult<T> => {
  if (result.success) return { success: true, data: result.data };
  const issues = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "schedule",
    message: issue.message,
  }));
  return {
    success: false,
    issues,
    errors: issues.map(({ field, message }) => `${field}: ${message}`),
  };
};

export const validateScheduleFormValues = (
  value: unknown,
): ScheduleContractValidationResult<ScheduleContractFormValues> =>
  toValidationResult(scheduleFormValuesSchema.safeParse(value));

export const validateScheduleData = (
  value: unknown,
): ScheduleContractValidationResult<ScheduleContractData> =>
  toValidationResult(scheduleDataSchema.safeParse(value));
