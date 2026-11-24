import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courts, players } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { parseFullName } from "@/lib/format-player";
import { getAdminCourtsAndPlayersData } from "@/lib/queries";
import {
  adminUnauthorizedResponse,
  isAdminAuthenticated,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** POST — add roster names (one per line in `names` string, or `names` array) */
export const POST = async (request: NextRequest) => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const body = await request.json();
    const rawLines: string[] = Array.isArray(body?.names)
      ? body.names.map((n: unknown) => String(n ?? ""))
      : String(body?.names ?? "")
          .split("\n")
          .map((line: string) => line);

    const existing = await db.select().from(players);
    const existingByFull = new Map(
      existing.map((p) => [p.fullName.toLowerCase().trim(), p])
    );

    const toInsert: Array<{
      firstName: string;
      lastName: string;
      fullName: string;
    }> = [];
    const skipped: string[] = [];
    const seenInBatch = new Set<string>();

    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parsed = parseFullName(trimmed);
      if (!parsed.firstName) continue;

      const key = parsed.fullName.toLowerCase();
      if (existingByFull.has(key) || seenInBatch.has(key)) {
        skipped.push(parsed.fullName);
        continue;
      }
      seenInBatch.add(key);
      toInsert.push(parsed);
    }

    if (toInsert.length > 0) {
      await db.insert(players).values(toInsert);
    }

    const data = await getAdminCourtsAndPlayersData();
    return NextResponse.json({
      addedCount: toInsert.length,
      skipped,
      ...data,
    });
  } catch (error) {
    console.error("Roster add error:", error);
    return NextResponse.json(
      { error: "Couldn't add players to the roster." },
      { status: 500 }
    );
  }
};

/** DELETE — remove one roster player by id (refused if on a court) */
export const DELETE = async (request: NextRequest) => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const body = await request.json();
    const playerId = Number(body?.playerId);
    if (!playerId || Number.isNaN(playerId)) {
      return NextResponse.json(
        { error: "Valid playerId is required." },
        { status: 400 }
      );
    }

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    const onCourt = await db
      .select()
      .from(courts)
      .where(
        or(eq(courts.player1Id, playerId), eq(courts.player3Id, playerId))
      )
      .limit(1);

    if (onCourt.length > 0) {
      return NextResponse.json(
        {
          error: `${player.fullName} is on ${onCourt[0].name}. Clear that match first, then remove them.`,
        },
        { status: 409 }
      );
    }

    await db.delete(players).where(eq(players.id, playerId));

    const data = await getAdminCourtsAndPlayersData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Roster delete error:", error);
    return NextResponse.json(
      { error: "Couldn't remove that player." },
      { status: 500 }
    );
  }
};
