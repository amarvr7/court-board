import type { NextRequest } from "next/server";

/**
 * Small in-memory limiter for failed login attempts.
 *
 * It counts FAILED attempts only, per client IP, inside a rolling window.
 * Families on the same venue Wi-Fi share one IP, so the limit is set high
 * enough that normal typos from many parents won't lock everyone out, but
 * low enough that guessing all 10,000 PINs would take days.
 *
 * Note: counts live in server memory, so they reset if the server restarts.
 */
interface AttemptRecord {
  failures: number;
  windowStartedAt: number;
}

export interface RateLimiter {
  isBlocked: (key: string) => { blocked: boolean; retryAfterSeconds: number };
  recordFailure: (key: string) => void;
  reset: (key: string) => void;
}

export const createRateLimiter = ({
  maxFailures,
  windowMs,
}: {
  maxFailures: number;
  windowMs: number;
}): RateLimiter => {
  const attempts = new Map<string, AttemptRecord>();

  const getActiveRecord = (key: string): AttemptRecord | null => {
    const record = attempts.get(key);
    if (!record) return null;
    if (Date.now() - record.windowStartedAt > windowMs) {
      attempts.delete(key);
      return null;
    }
    return record;
  };

  return {
    isBlocked: (key) => {
      const record = getActiveRecord(key);
      if (!record || record.failures < maxFailures) {
        return { blocked: false, retryAfterSeconds: 0 };
      }
      const msLeft = windowMs - (Date.now() - record.windowStartedAt);
      return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(msLeft / 1000)) };
    },
    recordFailure: (key) => {
      const record = getActiveRecord(key);
      if (record) {
        record.failures += 1;
      } else {
        attempts.set(key, { failures: 1, windowStartedAt: Date.now() });
      }
      // Keep memory bounded.
      if (attempts.size > 5000) {
        const oldestKey = attempts.keys().next().value;
        if (oldestKey !== undefined) attempts.delete(oldestKey);
      }
    },
    reset: (key) => {
      attempts.delete(key);
    },
  };
};

export const getClientKey = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
};

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const formatWait = (seconds: number): string => {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "about a minute" : `about ${minutes} minutes`;
};
