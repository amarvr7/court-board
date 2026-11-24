import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createRateLimiter } from "@/lib/rate-limit";

export const BOARD_PIN_COOKIE_NAME = "event_board_session";
export const BOARD_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

// 30 wrong PINs per network every 15 minutes. Guessing all 10,000 PINs would
// take over three days, while a busy venue Wi-Fi still has room for typos.
export const boardPinLimiter = createRateLimiter({
  maxFailures: 30,
  windowMs: 15 * 60 * 1000,
});

const getEventPin = (): string => (process.env.EVENT_PIN ?? "").trim();

export const isEventPinConfigured = (): boolean => /^\d{4}$/.test(getEventPin());

const digest = (value: string): Buffer =>
  createHmac("sha256", "court-board-compare").update(value).digest();

const safeEqual = (a: string, b: string): boolean =>
  timingSafeEqual(digest(a), digest(b));

/**
 * The board cookie holds a signed token instead of a plain "true".
 * It can't be created by hand without the server secret, and changing
 * EVENT_PIN signs every device out of the board.
 */
const createBoardSessionToken = (): string => {
  const pin = getEventPin();
  const secret =
    (process.env.BOARD_SESSION_SECRET ?? "").trim() ||
    (process.env.ADMIN_SESSION_SECRET ?? "").trim() ||
    pin;
  return createHmac("sha256", secret).update(`court-board-board:${pin}`).digest("hex");
};

export const verifyEventPin = (candidate: string): boolean => {
  if (!isEventPinConfigured()) return false;
  return safeEqual(candidate, getEventPin());
};

export const setBoardSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set(BOARD_PIN_COOKIE_NAME, createBoardSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BOARD_SESSION_MAX_AGE_SECONDS,
  });
};

export const clearBoardSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(BOARD_PIN_COOKIE_NAME);
};

export const isBoardAuthenticated = async (): Promise<boolean> => {
  if (!isEventPinConfigured()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(BOARD_PIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return safeEqual(token, createBoardSessionToken());
};
