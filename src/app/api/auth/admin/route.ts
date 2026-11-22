import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

const FAILED_ATTEMPT_DELAY_MS = 750;

export const POST = async (request: NextRequest) => {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Admin password is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const password = String(body?.password ?? "");

    if (!password || !verifyAdminPassword(password)) {
      // Slow down brute-force attempts.
      await new Promise((resolve) => setTimeout(resolve, FAILED_ATTEMPT_DELAY_MS));
      return NextResponse.json(
        { error: "Incorrect admin password." },
        { status: 401 }
      );
    }

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
      { error: "Unable to verify password at this time." },
      { status: 500 }
    );
  }
};

export const DELETE = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ authenticated: false });
};
