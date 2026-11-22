import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const BOARD_PIN_COOKIE_NAME = "event_board_pin_verified";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const submittedPin = String(body?.pin ?? "").trim();
    const expectedPin = (process.env.EVENT_PIN ?? "2026").trim();

    if (!submittedPin || submittedPin.length !== 4) {
      return NextResponse.json(
        { error: "Please enter a valid 4-digit Event PIN." },
        { status: 400 }
      );
    }

    if (submittedPin !== expectedPin) {
      return NextResponse.json(
        { error: "Incorrect Event PIN. Please check with the tournament desk." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(BOARD_PIN_COOKIE_NAME, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify PIN at this time." },
      { status: 500 }
    );
  }
};

export const DELETE = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(BOARD_PIN_COOKIE_NAME);
  return NextResponse.json({ authenticated: false });
};
