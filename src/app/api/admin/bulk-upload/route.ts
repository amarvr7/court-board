import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courts, players, matchStatusEnum, type MatchStatus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseFullName } from "@/lib/format-player";
import { getAdminCourtsAndPlayersData } from "@/lib/queries";
import { adminUnauthorizedResponse, isAdminAuthenticated } from "@/lib/admin-auth";

export interface BulkUploadRow {
  courtName?: string;
  status?: string;
  player1?: string;
  player2?: string;
  player1FirstName?: string;
  player1LastName?: string;
  player2FirstName?: string;
  player2LastName?: string;
}

const VALID_STATUSES = new Map<string, MatchStatus>([
  ["warmup", "Warmup"],
  ["in progress", "In Progress"],
  ["in_progress", "In Progress"],
  ["inprogress", "In Progress"],
  ["active", "In Progress"],
  ["open", "Open"],
  ["maintenance", "Maintenance"],
]);

const normalizeStatus = (raw?: string): MatchStatus => {
  if (!raw) return "Open";
  const key = raw.trim().toLowerCase();
  return VALID_STATUSES.get(key) ?? "Open";
};

export const POST = async (request: NextRequest) => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const body = await request.json();
    const rows: BulkUploadRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid CSV rows provided." },
        { status: 400 }
      );
    }

    const existingCourts = await db.select().from(courts);
    const courtByName = new Map(
      existingCourts.map((c) => [c.name.toLowerCase().trim(), c])
    );

    const existingPlayers = await db.select().from(players);
    const playerByFullName = new Map(
      existingPlayers.map((p) => [p.fullName.toLowerCase().trim(), p])
    );

    const resolveOrCreatePlayerId = async (
      fullNameRaw?: string,
      firstRaw?: string,
      lastRaw?: string
    ): Promise<number | null> => {
      const combined =
        firstRaw && lastRaw
          ? `${firstRaw.trim()} ${lastRaw.trim()}`
          : (fullNameRaw ?? "").trim();

      if (!combined) return null;

      const parsed = parseFullName(combined);
      if (!parsed.firstName) return null;

      const lookupKey = parsed.fullName.toLowerCase();
      const existing = playerByFullName.get(lookupKey);
      if (existing) {
        return existing.id;
      }

      const [created] = await db
        .insert(players)
        .values({
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          fullName: parsed.fullName,
        })
        .returning();

      if (created) {
        playerByFullName.set(lookupKey, created);
        return created.id;
      }
      return null;
    };

    let updatedCourtsCount = 0;
    const unmatchedCourts: string[] = [];

    for (const row of rows) {
      const rawCourtName = (row.courtName ?? "").trim();
      if (!rawCourtName) continue;

      const targetCourt = courtByName.get(rawCourtName.toLowerCase());
      if (!targetCourt) {
        unmatchedCourts.push(rawCourtName);
        continue;
      }

      const p1Id = await resolveOrCreatePlayerId(
        row.player1,
        row.player1FirstName,
        row.player1LastName
      );
      const p2Id = await resolveOrCreatePlayerId(
        row.player2,
        row.player2FirstName,
        row.player2LastName
      );

      let nextStatus = normalizeStatus(row.status);
      if (!row.status && (p1Id || p2Id)) {
        nextStatus = "In Progress";
      }

      await db
        .update(courts)
        .set({
          status: nextStatus,
          player1Id: p1Id,
          player2Id: p2Id,
          updatedAt: new Date(),
        })
        .where(eq(courts.id, targetCourt.id));

      updatedCourtsCount++;
    }

    const updatedData = await getAdminCourtsAndPlayersData();

    return NextResponse.json({
      updatedCourtsCount,
      unmatchedCourts,
      ...updatedData,
    });
  } catch (error) {
    console.error("Bulk CSV upload error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk CSV court assignments." },
      { status: 500 }
    );
  }
};
