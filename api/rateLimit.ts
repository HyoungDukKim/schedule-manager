const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

type RateLimitEntry = { count: number; resetAt: number };
const requestsByUser = new Map<string, RateLimitEntry>();

// 서버리스 인스턴스 한 개 안에서만 동작하는 보조 제한입니다.
export const checkAiRateLimit = (userId: string, now = Date.now()) => {
  const current = requestsByUser.get(userId);
  if (!current || current.resetAt <= now) {
    requestsByUser.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};
