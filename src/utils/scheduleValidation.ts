import type { ScheduleFormValues } from "../types/schedule";
import {
  validateAiScheduleDraft,
} from "../../shared/aiScheduleValidation.js";
import {
  validateScheduleFormValues,
} from "../../shared/scheduleContract.js";

// 기존 클라이언트 import 경로의 호환성을 유지하면서 공용 검증 구현을 그대로 노출합니다.
export {
  aiScheduleDraftSchema,
  aiScheduleRequestSchema,
  isScheduleNotificationMinutes,
  isValidScheduleDate,
  isValidScheduleTime,
  validateAiScheduleDraft,
} from "../../shared/aiScheduleValidation.js";
export type { AiScheduleDraftValidationResult } from "../../shared/aiScheduleValidation.js";
export {
  scheduleDataSchema,
  scheduleFormValuesSchema,
  validateScheduleData,
  validateScheduleFormValues,
} from "../../shared/scheduleContract.js";
export type {
  ScheduleContractIssue,
  ScheduleContractValidationResult,
} from "../../shared/scheduleContract.js";

export type AiDraftConversionResult =
  | { success: true; values: ScheduleFormValues }
  | { success: false; errors: string[] };

// 폼 타입에 의존하는 변환만 클라이언트 영역에 남겨 공용 검증이 src를 참조하지 않게 합니다.
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
  // AI 응답 상태가 서로 모순되더라도 누락 항목이나 확인 질문이 남아 있으면 바로 저장하지 않습니다.
  if (draft.missingFields.length > 0) errors.push("누락된 항목을 먼저 입력해 주세요.");
  if (draft.clarificationQuestions.length > 0) errors.push("확인 질문에 답한 뒤 저장해 주세요.");
  if (errors.length > 0 || draft.title === null || draft.date === null || draft.time === null) {
    return { success: false, errors };
  }

  const formValidation = validateScheduleFormValues({
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
  });
  if (!formValidation.success) {
    return { success: false, errors: formValidation.errors };
  }

  return { success: true, values: formValidation.data };
};
