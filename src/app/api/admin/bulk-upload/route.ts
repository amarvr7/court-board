import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courts, players, type Court, type MatchStatus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseFullName } from "@/lib/format-player";
import { getAdminCourtsAndPlayersData } from "@/lib/queries";
import { adminUnauthorizedResponse, isAdminAuthenticated } from "@/lib/admin-auth";
import { findAssignmentConflicts, type PlayerKey } from "@/lib/assignments";
import type { BulkUploadRow } from "@/lib/bulk-upload-types";

const VALID_STATUSES = new Map<string, MatchStatus>([
  ["warmup", "Warmup"],
  ["warm up", "Warmup"],
  ["in progress", "In Progress"],
  ["in_progress", "In Progress"],
  ["inprogress", "In Progress"],
  ["active", "In Progress"],
  ["open", "Open"],
  ["maintenance", "Maintenance"],
]);

const normalizeStatus = (raw?: string): MatchStatus | null => {
  if (!raw || !raw.trim()) return null;
  return VALID_STATUSES.get(raw.trim().toLowerCase()) ?? null;
};

interface ResolvedName {
  key: PlayerKey; // existing player id, or "new:<full name>" for a new player
  fullName: string;
  firstName: string;
  lastName: string;
}

interface PlannedCourtUpdate {
  court: Court;
  status: MatchStatus;
  slots: [ResolvedName | null, ResolvedName | null, ResolvedName | null, ResolvedName | null];
}

export const POST = async (request: NextRequest) => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const body = await request.json();
    const rows: BulkUploadRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "The file has no rows with a court name." },
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

    const resolveName = (
      fullNameRaw?: string,
      firstRaw?: string,
      lastRaw?: string
    ): ResolvedName | null => {
      const combined =
        firstRaw && firstRaw.trim()
          ? `${firstRaw.trim()} ${(lastRaw ?? "").trim()}`
          : (fullNameRaw ?? "").trim();
      if (!combined.trim()) return null;

      const parsed = parseFullName(combined);
      if (!parsed.firstName) return null;

      const lookupKey = parsed.fullName.toLowerCase();
      const existing = playerByFullName.get(lookupKey);
      return {
        key: existing ? existing.id : `new:${lookupKey}`,
        ...parsed,
      };
    };

    // ---- Pass 1: read every row and check it, without writing anything ----
    const unmatchedCourts: string[] = [];
    const problems: string[] = [];
    const planned = new Map<number, PlannedCourtUpdate>();

    for (const row of rows) {
      const rawCourtName = (row.courtName ?? "").trim();
      if (!rawCourtName) continue;

      const court = courtByName.get(rawCourtName.toLowerCase());
      if (!court) {
        unmatchedCourts.push(rawCourtName);
        continue;
      }

      if (planned.has(court.id)) {
        problems.push(`${court.name} is listed more than once in the file.`);
        continue;
      }

      const sideA = resolveName(row.player1, row.player1FirstName, row.player1LastName);
      const sideB = resolveName(row.player2, row.player2FirstName, row.player2LastName);
      const sideAPartner = resolveName(row.player1Partner);
      const sideBPartner = resolveName(row.player2Partner);
      const hasPlayers = Boolean(sideA || sideB || sideAPartner || sideBPartner);

      let status = normalizeStatus(row.status);
      if (row.status && row.status.trim() && !status) {
        problems.push(
          `${court.name}: "${row.status}" isn't a status. Use Warmup, In Progress, Open, or Maintenance.`
        );
        continue;
      }
      if (!status) status = hasPlayers ? "In Progress" : "Open";

      planned.set(court.id, {
        court,
        status,
        slots: [sideA, sideB, sideAPartner, sideBPartner],
      });
    }

    // ---- Check that nobody ends up on two courts once the file is applied ----
    const displayNameByKey = new Map<PlayerKey, string>(
      existingPlayers.map((p) => [p.id, p.fullName])
    );
    for (const plan of planned.values()) {
      for (const slot of plan.slots) {
        if (slot) displayNameByKey.set(slot.key, slot.fullName);
      }
    }

    const conflicts = findAssignmentConflicts(
      existingCourts.map((c) => {
        const plan = planned.get(c.id);
        return {
          courtName: c.name,
          playerIds: plan
            ? plan.slots.map((s) => s?.key ?? null)
            : [c.player1Id, c.player2Id, c.player3Id, c.player4Id],
        };
      })
    );

    for (const { playerId, courtNames } of conflicts) {
      const name = displayNameByKey.get(playerId) ?? "A player";
      const uniqueCourts = Array.from(new Set(courtNames));
      if (uniqueCourts.length === 1) {
        problems.push(`${name} is listed twice on ${uniqueCourts[0]}.`);
      } else {
        problems.push(
          `${name} would be on ${uniqueCourts.join(" and ")}. If that's two different players with the same name, add a middle initial to one of them. If they moved courts, clear the old court or include it in the file.`
        );
      }
    }

    if (problems.length > 0) {
      return NextResponse.json(
        {
          error: "Nothing was saved. Fix these rows and upload the file again.",
          problems,
          unmatchedCourts,
        },
        { status: 409 }
      );
    }

    // ---- Pass 2: create new players, then save the courts ----
    const createdIdByKey = new Map<PlayerKey, number>();
    const getPlayerId = async (slot: ResolvedName | null): Promise<number | null> => {
      if (!slot) return null;
      if (typeof slot.key === "number") return slot.key;
      const already = createdIdByKey.get(slot.key);
      if (already) return already;

      const [created] = await db
        .insert(players)
        .values({
          firstName: slot.firstName,
          lastName: slot.lastName,
          fullName: slot.fullName,
        })
        .returning();
      createdIdByKey.set(slot.key, created.id);
      return created.id;
    };

    let updatedCourtsCount = 0;
    for (const plan of planned.values()) {
      const [p1, p2, p3, p4] = await Promise.all(plan.slots.map(getPlayerId));
      await db
        .update(courts)
        .set({
          status: plan.status,
          player1Id: p1,
          player2Id: p2,
          player3Id: p3,
          player4Id: p4,
          updatedAt: new Date(),
        })
        .where(eq(courts.id, plan.court.id));
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
      { error: "Couldn't save the order of play. Try again in a moment." },
      { status: 500 }
    );
  }
};
