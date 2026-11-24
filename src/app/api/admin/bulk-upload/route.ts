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

interface PlannedCourtUpdate {
  court: Court;
  status: MatchStatus;
  player1Id: number | null;
  player3Id: number | null;
  opponentName: string | null;
  opponentPartnerName: string | null;
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

    const resolveRosterPlayer = (
      raw?: string
    ): { id: number; fullName: string } | null | "missing" => {
      const trimmed = (raw ?? "").trim();
      if (!trimmed) return null;
      const parsed = parseFullName(trimmed);
      if (!parsed.firstName) return null;
      const existing = playerByFullName.get(parsed.fullName.toLowerCase());
      if (!existing) return "missing";
      return { id: existing.id, fullName: existing.fullName };
    };

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

      const ourPlayer = resolveRosterPlayer(row.player);
      const ourPartner = resolveRosterPlayer(row.partner);

      if (ourPlayer === "missing") {
        problems.push(
          `${court.name}: "${row.player}" is not on the roster. Add them on the Roster tab first.`
        );
        continue;
      }
      if (ourPartner === "missing") {
        problems.push(
          `${court.name}: partner "${row.partner}" is not on the roster. Add them on the Roster tab first.`
        );
        continue;
      }

      const opponentName = (row.opponent ?? "").trim().replace(/\s+/g, " ") || null;
      const opponentPartnerName =
        (row.opponentPartner ?? "").trim().replace(/\s+/g, " ") || null;

      const hasMatch = Boolean(
        ourPlayer || ourPartner || opponentName || opponentPartnerName
      );

      let status = normalizeStatus(row.status);
      if (row.status && row.status.trim() && !status) {
        problems.push(
          `${court.name}: "${row.status}" isn't a status. Use Warmup, In Progress, Open, or Maintenance.`
        );
        continue;
      }
      if (!status) status = hasMatch ? "In Progress" : "Open";

      planned.set(court.id, {
        court,
        status,
        player1Id: ourPlayer?.id ?? null,
        player3Id: ourPartner?.id ?? null,
        opponentName,
        opponentPartnerName,
      });
    }

    const displayNameByKey = new Map<PlayerKey, string>(
      existingPlayers.map((p) => [p.id, p.fullName])
    );

    const conflicts = findAssignmentConflicts(
      existingCourts.map((c) => {
        const plan = planned.get(c.id);
        return {
          courtName: c.name,
          playerIds: plan
            ? [plan.player1Id, plan.player3Id]
            : [c.player1Id, c.player3Id],
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
          `${name} would be on ${uniqueCourts.join(" and ")}. Clear the old court or include it in the file.`
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

    const now = new Date();
    let updatedCourtsCount = 0;
    for (const plan of planned.values()) {
      const isLive = plan.status === "Warmup" || plan.status === "In Progress";
      await db
        .update(courts)
        .set({
          status: plan.status,
          player1Id: plan.player1Id,
          player2Id: null,
          player3Id: plan.player3Id,
          player4Id: null,
          opponentName: plan.opponentName,
          opponentPartnerName: plan.opponentPartnerName,
          statusChangedAt: isLive ? now : null,
          player1MovedAt: null,
          player3MovedAt: null,
          updatedAt: now,
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
