import { NextRequest, NextResponse } from "next/server";
import {
  boardPinLimiter,
  clearBoardSessionCookie,
  isEventPinConfigured,
  setBoardSessionCookie,
  verifyEventPin,
} from "@/lib/board-auth";
import { formatWait, getClientKey, sleep } from "@/lib/rate-limit";

const FAILED_ATTEMPT_DELAY_MS = 1000;

export const POST = async (request: NextRequest) => {
  if (!isEventPinConfigured()) {
    return NextResponse.json(
      { error: "The board isn't open yet. Please check with the tournament desk." },
      { status: 503 }
    );
  }

  const clientKey = getClientKey(request);
  const { blocked, retryAfterSeconds } = boardPinLimiter.isBlocked(clientKey);
  if (blocked) {
    return NextResponse.json(
      {
        error: `Too many incorrect PINs. Try again in ${formatWait(retryAfterSeconds)}, or ask the tournament desk.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const submittedPin = String(body?.pin ?? "").trim();

    if (!/^\d{4}$/.test(submittedPin)) {
      return NextResponse.json(
        { error: "Enter all 4 digits of the Team PIN." },
        { status: 400 }
      );
    }

    if (!verifyEventPin(submittedPin)) {
      boardPinLimiter.recordFailure(clientKey);
      await sleep(FAILED_ATTEMPT_DELAY_MS);
      return NextResponse.json(
        { error: "That PIN isn't right. Check the PIN posted at the tournament desk." },
        { status: 401 }
      );
    }

    await setBoardSessionCookie();
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't check the PIN. Try again in a moment." },
      { status: 500 }
    );
  }
};

export const DELETE = async () => {
  await clearBoardSessionCookie();
  return NextResponse.json({ authenticated: false });
};
