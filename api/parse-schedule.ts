import type { IncomingMessage, ServerResponse } from "node:http";
import OpenAI from "openai";
import { aiScheduleRequestSchema } from "../shared/aiScheduleValidation.js";
import {
  AiOutputMissingError,
  AiOutputValidationError,
  AiRefusalError,
  analyzeScheduleText,
} from "./aiSchedule.js";
import {
  FirebaseAdminConfigurationError,
  verifyFirebaseIdToken,
} from "./firebaseAdmin.js";
import { checkAiRateLimit } from "./rateLimit.js";

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse;

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_TEXT_LENGTH = 500;

class RequestTooLargeError extends Error {}

const sendJson = (
  response: VercelResponse,
  statusCode: number,
  body: Record<string, unknown>,
) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
};

const readJsonBody = async (request: VercelRequest) => {
  if (request.body !== undefined) {
    if (typeof request.body === "string") return JSON.parse(request.body) as unknown;
    return request.body;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_REQUEST_BYTES) throw new RequestTooLargeError();
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
};

const getBearerToken = (authorization: string | string[] | undefined) => {
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
};

// 자연어 일정 파싱용 Vercel Function 기본 뼈대입니다.
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, {
      error: { code: "METHOD_NOT_ALLOWED", message: "POST 요청만 허용됩니다." },
    });
    return;
  }

  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !contentType.toLowerCase().startsWith("application/json")) {
    sendJson(response, 400, {
      error: { code: "INVALID_CONTENT_TYPE", message: "Content-Type은 application/json이어야 합니다." },
    });
    return;
  }

  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    sendJson(response, 401, {
      error: { code: "AUTH_REQUIRED", message: "로그인이 필요합니다." },
    });
    return;
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    sendJson(response, 413, {
      error: { code: "REQUEST_TOO_LARGE", message: "요청 크기가 너무 큽니다." },
    });
    return;
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      sendJson(response, 413, {
        error: { code: "REQUEST_TOO_LARGE", message: "요청 크기가 너무 큽니다." },
      });
      return;
    }
    sendJson(response, 400, {
      error: { code: "INVALID_JSON", message: "올바른 JSON 요청이 아닙니다." },
    });
    return;
  }

  if (
    typeof rawBody === "object" &&
    rawBody !== null &&
    "text" in rawBody &&
    typeof rawBody.text === "string" &&
    rawBody.text.length > MAX_TEXT_LENGTH
  ) {
    sendJson(response, 413, {
      error: { code: "TEXT_TOO_LONG", message: `자연어 입력은 ${MAX_TEXT_LENGTH}자 이하여야 합니다.` },
    });
    return;
  }

  const parsedRequest = aiScheduleRequestSchema.safeParse(rawBody);
  if (!parsedRequest.success) {
    sendJson(response, 400, {
      error: {
        code: "INVALID_REQUEST",
        message: "요청 데이터 형식이 올바르지 않습니다.",
        fields: parsedRequest.error.issues.map((issue) => issue.path.join(".")),
      },
    });
    return;
  }

  let userId: string;
  try {
    const decodedToken = await verifyFirebaseIdToken(token);
    userId = decodedToken.uid;
  } catch (error) {
    if (error instanceof FirebaseAdminConfigurationError) {
      sendJson(response, 503, {
        error: { code: "SERVER_NOT_CONFIGURED", message: "서버 인증 설정이 완료되지 않았습니다." },
      });
      return;
    }
    sendJson(response, 401, {
      error: { code: "INVALID_AUTH_TOKEN", message: "로그인 정보가 유효하지 않습니다." },
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      error: { code: "AI_NOT_CONFIGURED", message: "AI 서버 설정이 완료되지 않았습니다." },
    });
    return;
  }

  const rateLimit = checkAiRateLimit(userId);
  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    sendJson(response, 429, {
      error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." },
    });
    return;
  }

  try {
    const draft = await analyzeScheduleText(
      parsedRequest.data,
      process.env.OPENAI_API_KEY,
    );
    sendJson(response, 200, { draft });
  } catch (error) {
    if (error instanceof AiRefusalError) {
      sendJson(response, 422, {
        error: { code: "AI_REFUSAL", message: "이 요청은 AI가 분석할 수 없습니다." },
      });
      return;
    }
    if (
      error instanceof AiOutputMissingError ||
      error instanceof AiOutputValidationError
    ) {
      sendJson(response, 502, {
        error: { code: "INVALID_AI_OUTPUT", message: "AI 분석 결과를 확인할 수 없습니다. 다시 시도해 주세요." },
      });
      return;
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      sendJson(response, 504, {
        error: { code: "AI_TIMEOUT", message: "AI 응답 시간이 초과되었습니다. 다시 시도해 주세요." },
      });
      return;
    }
    if (error instanceof OpenAI.RateLimitError) {
      sendJson(response, 429, {
        error: { code: "OPENAI_RATE_LIMITED", message: "AI 요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      });
      return;
    }
    if (error instanceof OpenAI.APIError) {
      sendJson(response, 502, {
        error: { code: "OPENAI_API_ERROR", message: "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      });
      return;
    }

    sendJson(response, 500, {
      error: { code: "INTERNAL_ERROR", message: "일정 분석 중 오류가 발생했습니다." },
    });
  }
}
