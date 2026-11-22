import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courts, matchStatusEnum, type MatchStatus } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getAdminCourtsAndPlayersData,
  getBoardCourtsData,
} from "@/lib/queries";
import { cookies } from "next/headers";
import { BOARD_PIN_COOKIE_NAME } from "@/app/api/board-auth/route";
import { adminUnauthorizedResponse, isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<string>(matchStatusEnum.enumValues);

export const GET = async (request: NextRequest) => {
  try {
    const view = request.nextUrl.searchParams.get("view") ?? "board";

    if (view === "admin") {
      if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();
      const data = await getAdminCourtsAndPlayersData();
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    // Check PIN cookie for /board polling
    const cookieStore = await cookies();
    const isPinVerified =
      cookieStore.get(BOARD_PIN_COOKIE_NAME)?.value === "true";

    if (!isPinVerified) {
      return NextResponse.json(
        { error: "PIN authentication required" },
        { status: 401 }
      );
    }

    const boardData = await getBoardCourtsData();
    return NextResponse.json(boardData, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Failed to fetch courts:", error);
    return NextResponse.json(
      { error: "Failed to load court assignments." },
      { status: 500 }
    );
  }
};

export const PATCH = async (request: NextRequest) => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const body = await request.json();
    const courtId = Number(body?.courtId);
    const action = body?.action as string | undefined;

    if (!courtId || Number.isNaN(courtId)) {
      return NextResponse.json(
        { error: "Valid courtId is required." },
        { status: 400 }
      );
    }

    if (action === "clear") {
      await db
        .update(courts)
        .set({
          status: "Open",
          player1Id: null,
          player2Id: null,
          player3Id: null,
          player4Id: null,
          updatedAt: new Date(),
        })
        .where(eq(courts.id, courtId));

      const updatedData = await getAdminCourtsAndPlayersData();
      return NextResponse.json(updatedData);
    }

    const status = body?.status as MatchStatus | undefined;
    if (status && !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid match status value." },
        { status: 400 }
      );
    }

    const player1Id =
      body?.player1Id === null || body?.player1Id === ""
        ? null
        : body?.player1Id !== undefined
        ? Number(body.player1Id)
        : undefined;

    const player2Id =
      body?.player2Id === null || body?.player2Id === ""
        ? null
        : body?.player2Id !== undefined
        ? Number(body.player2Id)
        : undefined;

    const updatePayload: Partial<typeof courts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status) {
      updatePayload.status = status;
    }
    if (player1Id !== undefined) {
      updatePayload.player1Id = player1Id;
    }
    if (player2Id !== undefined) {
      updatePayload.player2Id = player2Id;
    }

    // If status is explicitly set to Open or Maintenance and clearPlayers is true
    if (
      (status === "Open" || status === "Maintenance") &&
      body?.clearPlayers === true
    ) {
      updatePayload.player1Id = null;
      updatePayload.player2Id = null;
    }

    await db
      .update(courts)
      .set(updatePayload)
      .where(eq(courts.id, courtId));

    const updatedData = await getAdminCourtsAndPlayersData();
    return NextResponse.json(updatedData);
  } catch (error) {
    console.error("Error updating court:", error);
    return NextResponse.json(
      { error: "Failed to update court assignment." },
      { status: 500 }
    );
  }
};
