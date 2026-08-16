import { auth } from "../firebase";
import type { AiScheduleDraft, AiScheduleRequest } from "../types/aiSchedule";
import { formatDate, padNumber } from "../utils/dateUtils";
import { validateAiScheduleDraft } from "../utils/scheduleValidation";

const CLIENT_TIMEOUT_MS = 20_000;

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "로그인이 필요합니다.",
  INVALID_AUTH_TOKEN: "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.",
  RATE_LIMITED: "AI 분석 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  OPENAI_RATE_LIMITED: "AI 서비스 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  AI_TIMEOUT: "AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.",
  AI_REFUSAL: "이 요청은 AI가 분석할 수 없습니다.",
  INVALID_AI_OUTPUT: "AI 분석 결과가 올바르지 않습니다. 다시 시도해 주세요.",
  AI_NOT_CONFIGURED: "AI 서버 설정이 완료되지 않았습니다.",
  SERVER_NOT_CONFIGURED: "서버 인증 설정이 완료되지 않았습니다.",
  OPENAI_API_ERROR: "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

type ErrorEnvelope = { error?: { code?: unknown; message?: unknown } };
type SuccessEnvelope = { draft?: unknown };

export const createRequestContext = (
  now = new Date(),
): AiScheduleRequest["context"] => {
  return {
    localDate: formatDate(now.getFullYear(), now.getMonth(), now.getDate()),
    localTime: `${padNumber(now.getHours())}:${padNumber(now.getMinutes())}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    // getTimezoneOffset은 UTC보다 빠른 지역에서 음수이므로 API 표현은 부호를 뒤집습니다.
    utcOffsetMinutes: -now.getTimezoneOffset(),
    locale: navigator.language || "ko-KR",
    weekStartsOn: "monday",
  };
};

const getErrorMessage = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null;
  const envelope = value as ErrorEnvelope;
  const code = envelope.error?.code;
  if (typeof code === "string" && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return typeof envelope.error?.message === "string" ? envelope.error.message : null;
};

export const analyzeNaturalLanguageSchedule = async (
  text: string,
): Promise<AiScheduleDraft> => {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch("/api/parse-schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text, context: createRequestContext() }),
      cache: "no-store",
      signal: controller.signal,
    });

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        getErrorMessage(body) ?? "AI 일정 분석에 실패했습니다. 다시 시도해 주세요.",
      );
    }

    const draft = typeof body === "object" && body !== null
      ? (body as SuccessEnvelope).draft
      : undefined;
    const validation = validateAiScheduleDraft(draft);
    if (!validation.success) {
      throw new Error("AI 분석 결과가 올바르지 않습니다. 다시 시도해 주세요.");
    }
    return validation.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.", {
        cause: error,
      });
    }
    if (!navigator.onLine) {
      throw new Error("인터넷 연결을 확인해 주세요.", { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
