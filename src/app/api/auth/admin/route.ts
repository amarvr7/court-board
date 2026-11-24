import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminLoginLimiter,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { formatWait, getClientKey, sleep } from "@/lib/rate-limit";

const FAILED_ATTEMPT_DELAY_MS = 750;

export const POST = async (request: NextRequest) => {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Admin password is not configured on the server." },
      { status: 503 }
    );
  }

  const clientKey = getClientKey(request);
  const { blocked, retryAfterSeconds } = adminLoginLimiter.isBlocked(clientKey);
  if (blocked) {
    return NextResponse.json(
      { error: `Too many incorrect passwords. Try again in ${formatWait(retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const password = String(body?.password ?? "");

    if (!password || !verifyAdminPassword(password)) {
      adminLoginLimiter.recordFailure(clientKey);
      await sleep(FAILED_ATTEMPT_DELAY_MS);
      return NextResponse.json(
        { error: "Incorrect admin password." },
        { status: 401 }
      );
    }

    adminLoginLimiter.reset(clientKey);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't check the password. Try again in a moment." },
      { status: 500 }
    );
  }
};

export const DELETE = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ authenticated: false });
};
