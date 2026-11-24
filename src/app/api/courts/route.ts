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
const LIVE_STATUSES = new Set<MatchStatus>(["Warmup", "In Progress"]);

const readPlayerId = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const readText = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || null;
};

const clearMatchPayload = () => ({
  status: "Open" as MatchStatus,
  player1Id: null,
  player2Id: null,
  player3Id: null,
  player4Id: null,
  opponentName: null,
  opponentPartnerName: null,
  statusChangedAt: null,
  player1MovedAt: null,
  player3MovedAt: null,
  updatedAt: new Date(),
});

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
        .set(clearMatchPayload())
        .where(eq(courts.id, courtId));

      const updatedData = await getAdminCourtsAndPlayersData();
      return NextResponse.json(updatedData);
    }

    const allCourts = await db.select().from(courts);
    const targetCourt = allCourts.find((c) => c.id === courtId);
    if (!targetCourt) {
      return NextResponse.json({ error: "Court not found." }, { status: 404 });
    }

    // Move an existing match to a different (empty) court
    if (action === "move") {
      const toCourtId = Number(body?.toCourtId);
      if (!toCourtId || Number.isNaN(toCourtId)) {
        return NextResponse.json(
          { error: "Valid toCourtId is required." },
          { status: 400 }
        );
      }
      if (toCourtId === courtId) {
        return NextResponse.json(
          { error: "That match is already on this court." },
          { status: 400 }
        );
      }

      const destination = allCourts.find((c) => c.id === toCourtId);
      if (!destination) {
        return NextResponse.json(
          { error: "Destination court not found." },
          { status: 404 }
        );
      }

      const destOccupied =
        destination.player1Id != null ||
        destination.player3Id != null ||
        Boolean(destination.opponentName?.trim()) ||
        destination.status === "Warmup" ||
        destination.status === "In Progress";

      if (destOccupied) {
        return NextResponse.json(
          {
            error: `${destination.name} already has a match. Clear it first.`,
          },
          { status: 409 }
        );
      }

      const now = new Date();
      await db
        .update(courts)
        .set({
          status: targetCourt.status,
          player1Id: targetCourt.player1Id,
          player2Id: null,
          player3Id: targetCourt.player3Id,
          player4Id: null,
          opponentName: targetCourt.opponentName,
          opponentPartnerName: targetCourt.opponentPartnerName,
          statusChangedAt: targetCourt.statusChangedAt,
          player1MovedAt: targetCourt.player1Id ? now : null,
          player3MovedAt: targetCourt.player3Id ? now : null,
          updatedAt: now,
        })
        .where(eq(courts.id, toCourtId));

      await db
        .update(courts)
        .set(clearMatchPayload())
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

    const nextPlayer1 = readPlayerId(body?.player1Id);
    const nextPlayer3 = readPlayerId(body?.player3Id);
    const nextOpponent = readText(body?.opponentName);
    const nextOpponentPartner = readText(body?.opponentPartnerName);

    const assigningMatch =
      nextPlayer1 !== undefined ||
      nextPlayer3 !== undefined ||
      nextOpponent !== undefined ||
      nextOpponentPartner !== undefined ||
      (status !== undefined && LIVE_STATUSES.has(status));

    // Block saving a new assignment onto an already-occupied court unless
    // we're only flipping status / clearing fields on the same court.
    const currentlyOccupied =
      targetCourt.player1Id != null ||
      targetCourt.player3Id != null ||
      Boolean(targetCourt.opponentName?.trim());

    const replacingPlayers =
      (nextPlayer1 !== undefined && nextPlayer1 !== targetCourt.player1Id) ||
      (nextPlayer3 !== undefined && nextPlayer3 !== targetCourt.player3Id) ||
      (nextOpponent !== undefined &&
        nextOpponent !== (targetCourt.opponentName ?? null)) ||
      (nextOpponentPartner !== undefined &&
        nextOpponentPartner !== (targetCourt.opponentPartnerName ?? null));

    if (
      currentlyOccupied &&
      replacingPlayers &&
      body?.forceReplace !== true &&
      action !== "update"
    ) {
      // Allow in-place edits via action "update"; block accidental overwrite
      // when using the add-match form (no action).
      if (!action) {
        return NextResponse.json(
          {
            error: `${targetCourt.name} already has a match. Clear it first, then add a new one.`,
          },
          { status: 409 }
        );
      }
    }

    const now = new Date();
    const updatePayload: Partial<typeof courts.$inferInsert> = {
      updatedAt: now,
      player2Id: null,
      player4Id: null,
    };

    if (status) {
      updatePayload.status = status;
      if (status !== targetCourt.status) {
        updatePayload.statusChangedAt = now;
      }
    }

    const resolvedPlayer1 =
      nextPlayer1 !== undefined ? nextPlayer1 : targetCourt.player1Id;
    const resolvedPlayer3 =
      nextPlayer3 !== undefined ? nextPlayer3 : targetCourt.player3Id;

    if (nextPlayer1 !== undefined) {
      updatePayload.player1Id = nextPlayer1;
      // Mark moved if this player was already on a different court
      if (nextPlayer1 != null) {
        const previousCourt = allCourts.find(
          (c) =>
            c.id !== courtId &&
            (c.player1Id === nextPlayer1 || c.player3Id === nextPlayer1)
        );
        updatePayload.player1MovedAt = previousCourt ? now : null;
      } else {
        updatePayload.player1MovedAt = null;
      }
    }

    if (nextPlayer3 !== undefined) {
      updatePayload.player3Id = nextPlayer3;
      if (nextPlayer3 != null) {
        const previousCourt = allCourts.find(
          (c) =>
            c.id !== courtId &&
            (c.player1Id === nextPlayer3 || c.player3Id === nextPlayer3)
        );
        updatePayload.player3MovedAt = previousCourt ? now : null;
      } else {
        updatePayload.player3MovedAt = null;
      }
    }

    if (nextOpponent !== undefined) {
      updatePayload.opponentName = nextOpponent;
    }
    if (nextOpponentPartner !== undefined) {
      updatePayload.opponentPartnerName = nextOpponentPartner;
    }

    // New live match without an existing clock starts now
    const willBeLive =
      (status && LIVE_STATUSES.has(status)) ||
      (!status && LIVE_STATUSES.has(targetCourt.status));
    if (
      willBeLive &&
      !targetCourt.statusChangedAt &&
      updatePayload.statusChangedAt === undefined
    ) {
      updatePayload.statusChangedAt = now;
    }

    if (assigningMatch && !status && targetCourt.status === "Open") {
      updatePayload.status = "In Progress";
      updatePayload.statusChangedAt = now;
    }

    // A player can only be on one court, and only once on that court.
    const conflicts = findAssignmentConflicts(
      allCourts.map((c) => ({
        courtName: c.name,
        playerIds:
          c.id === courtId
            ? [resolvedPlayer1, resolvedPlayer3]
            : [c.player1Id, c.player3Id],
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
