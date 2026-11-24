import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courts, players, matchStatusEnum, type MatchStatus } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getAdminCourtsAndPlayersData,
  getBoardCourtsData,
} from "@/lib/queries";
import { isBoardAuthenticated } from "@/lib/board-auth";
import { adminUnauthorizedResponse, isAdminAuthenticated } from "@/lib/admin-auth";
import { findAssignmentConflicts } from "@/lib/assignments";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<string>(matchStatusEnum.enumValues);

const PLAYER_SLOTS = ["player1Id", "player2Id", "player3Id", "player4Id"] as const;
type PlayerSlot = (typeof PLAYER_SLOTS)[number];

/** undefined = not sent (leave as is), null = clear, number = assign */
const readPlayerId = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

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

    if (!(await isBoardAuthenticated())) {
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

    const allCourts = await db.select().from(courts);
    const targetCourt = allCourts.find((c) => c.id === courtId);
    if (!targetCourt) {
      return NextResponse.json({ error: "Court not found." }, { status: 404 });
    }

    const updatePayload: Partial<typeof courts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (status) updatePayload.status = status;

    const nextSlots: Record<PlayerSlot, number | null> = {
      player1Id: targetCourt.player1Id,
      player2Id: targetCourt.player2Id,
      player3Id: targetCourt.player3Id,
      player4Id: targetCourt.player4Id,
    };

    for (const slot of PLAYER_SLOTS) {
      const value = readPlayerId(body?.[slot]);
      if (value !== undefined) {
        nextSlots[slot] = value;
        updatePayload[slot] = value;
      }
    }

    if ((status === "Open" || status === "Maintenance") && body?.clearPlayers === true) {
      for (const slot of PLAYER_SLOTS) {
        nextSlots[slot] = null;
        updatePayload[slot] = null;
      }
    }

    // A player can only be on one court, and only once on that court.
    const conflicts = findAssignmentConflicts(
      allCourts.map((c) => ({
        courtName: c.name,
        playerIds:
          c.id === courtId
            ? Object.values(nextSlots)
            : [c.player1Id, c.player2Id, c.player3Id, c.player4Id],
      }))
    );

    if (conflicts.length > 0) {
      const allPlayers = await db.select().from(players);
      const nameById = new Map(allPlayers.map((p) => [p.id, p.fullName]));
      const { playerId, courtNames } = conflicts[0];
      const name = nameById.get(Number(playerId)) ?? "That player";
      const otherCourts = courtNames.filter((n) => n !== targetCourt.name);
      const message =
        otherCourts.length > 0
          ? `${name} is already on ${otherCourts.join(", ")}. Clear that court first, then assign them here.`
          : `${name} is already on ${targetCourt.name}. Each player can only be listed once per court.`;
      return NextResponse.json({ error: message }, { status: 409 });
    }

    await db.update(courts).set(updatePayload).where(eq(courts.id, courtId));

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
