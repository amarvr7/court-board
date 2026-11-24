import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createRateLimiter } from "@/lib/rate-limit";

export const ADMIN_COOKIE_NAME = "court_board_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

// 10 wrong admin passwords per network every 15 minutes.
export const adminLoginLimiter = createRateLimiter({
  maxFailures: 10,
  windowMs: 15 * 60 * 1000,
});

const getAdminPassword = (): string => (process.env.ADMIN_PASSWORD ?? "").trim();

export const isAdminPasswordConfigured = (): boolean =>
  getAdminPassword().length > 0;

const digest = (value: string): Buffer =>
  createHmac("sha256", "court-board-compare").update(value).digest();

/**
 * Session token = HMAC(secret, password). It cannot be forged without the
 * secret, and changing ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) signs everyone out.
 */
export const createAdminSessionToken = (): string => {
  const password = getAdminPassword();
  const secret = (process.env.ADMIN_SESSION_SECRET ?? "").trim() || password;
  return createHmac("sha256", secret)
    .update(`court-board-admin:${password}`)
    .digest("hex");
};

export const verifyAdminPassword = (candidate: string): boolean => {
  const password = getAdminPassword();
  if (!password) return false;
  return timingSafeEqual(digest(candidate), digest(password));
};

export const isAdminAuthenticated = async (): Promise<boolean> => {
  if (!isAdminPasswordConfigured()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return timingSafeEqual(digest(token), digest(createAdminSessionToken()));
};

export const adminUnauthorizedResponse = () =>
  NextResponse.json(
    { error: "Admin sign-in required." },
    { status: 401 }
  );
