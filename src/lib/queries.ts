import { db } from "@/db";
import {
  courts,
  players,
  deskSettings,
  type CourtZone,
  type MatchStatus,
} from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  extractLastNameAndCoach,
  formatPlayerPrivacyName,
  formatOpponentPrivacyName,
} from "@/lib/format-player";

export interface BoardPlayerDTO {
  id: number;
  displayName: string; // "First L. - Coach" (or "First L.") on /board
  firstName: string;
  lastInitial: string;
  movedAt: string | null;
}

export interface AdminPlayerDTO {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  privacyName: string;
}

/**
 * Our side = player1 (+ player3 as partner in doubles)
 * Opponent side = free-text opponentName (+ opponentPartnerName)
 */
export interface BoardCourtDTO {
  id: number;
  sortOrder: number;
  name: string;
  zone: CourtZone;
  status: MatchStatus;
  player1: BoardPlayerDTO | null;
  player3: BoardPlayerDTO | null;
  opponentName: string | null;
  opponentPartnerName: string | null;
  opponentDisplayName: string | null;
  opponentPartnerDisplayName: string | null;
  statusChangedAt: string | null;
  updatedAt: string;
}

export interface AdminCourtDTO {
  id: number;
  sortOrder: number;
  name: string;
  zone: CourtZone;
  status: MatchStatus;
  player1Id: number | null;
  player3Id: number | null;
  player1: AdminPlayerDTO | null;
  player3: AdminPlayerDTO | null;
  opponentName: string | null;
  opponentPartnerName: string | null;
  statusChangedAt: string | null;
  player1MovedAt: string | null;
  player3MovedAt: string | null;
  updatedAt: string;
}

export interface DeskSettingsDTO {
  coachEmails: string;
}

const pick = <T,>(map: Map<number, T>, id: number | null): T | null =>
  id ? (map.get(id) ?? null) : null;

export const getBoardCourtsData = async (): Promise<{
  courts: BoardCourtDTO[];
  fetchedAt: string;
}> => {
  const [allCourts, allPlayers] = await Promise.all([
    db.select().from(courts).orderBy(asc(courts.sortOrder)),
    db.select().from(players),
  ]);

  const playerMap = new Map<number, Omit<BoardPlayerDTO, "movedAt">>();
  for (const p of allPlayers) {
    const { lastName: cleanLast } = extractLastNameAndCoach(p.lastName);
    playerMap.set(p.id, {
      id: p.id,
      displayName: formatPlayerPrivacyName(p.firstName, p.lastName),
      firstName: p.firstName,
      lastInitial: cleanLast.charAt(0).toUpperCase(),
    });
  }

  const formattedCourts: BoardCourtDTO[] = allCourts.map((c) => {
    const base1 = pick(playerMap, c.player1Id);
    const base3 = pick(playerMap, c.player3Id);
    return {
      id: c.id,
      sortOrder: c.sortOrder,
      name: c.name,
      zone: c.zone,
      status: c.status,
      player1: base1
        ? {
            ...base1,
            movedAt: c.player1MovedAt?.toISOString() ?? null,
          }
        : null,
      player3: base3
        ? {
            ...base3,
            movedAt: c.player3MovedAt?.toISOString() ?? null,
          }
        : null,
      opponentName: c.opponentName,
      opponentPartnerName: c.opponentPartnerName,
      opponentDisplayName: formatOpponentPrivacyName(c.opponentName),
      opponentPartnerDisplayName: formatOpponentPrivacyName(
        c.opponentPartnerName
      ),
      statusChangedAt: c.statusChangedAt?.toISOString() ?? null,
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  return {
    courts: formattedCourts,
    fetchedAt: new Date().toISOString(),
  };
};

export const getAdminCourtsAndPlayersData = async (): Promise<{
  courts: AdminCourtDTO[];
  players: AdminPlayerDTO[];
  deskSettings: DeskSettingsDTO;
}> => {
  const [allCourts, allPlayers, settingsRows] = await Promise.all([
    db.select().from(courts).orderBy(asc(courts.sortOrder)),
    db
      .select()
      .from(players)
      .orderBy(asc(players.firstName), asc(players.lastName)),
    db.select().from(deskSettings).limit(1),
  ]);

  const playerMap = new Map<number, AdminPlayerDTO>();
  const adminPlayers: AdminPlayerDTO[] = allPlayers.map((p) => {
    const dto: AdminPlayerDTO = {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: p.fullName,
      privacyName: formatPlayerPrivacyName(p.firstName, p.lastName),
    };
    playerMap.set(p.id, dto);
    return dto;
  });

  const adminCourts: AdminCourtDTO[] = allCourts.map((c) => ({
    id: c.id,
    sortOrder: c.sortOrder,
    name: c.name,
    zone: c.zone,
    status: c.status,
    player1Id: c.player1Id,
    player3Id: c.player3Id,
    player1: pick(playerMap, c.player1Id),
    player3: pick(playerMap, c.player3Id),
    opponentName: c.opponentName,
    opponentPartnerName: c.opponentPartnerName,
    statusChangedAt: c.statusChangedAt?.toISOString() ?? null,
    player1MovedAt: c.player1MovedAt?.toISOString() ?? null,
    player3MovedAt: c.player3MovedAt?.toISOString() ?? null,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return {
    courts: adminCourts,
    players: adminPlayers,
    deskSettings: {
      coachEmails: settingsRows[0]?.coachEmails ?? "",
    },
  };
};

export const getOrCreateDeskSettings = async (): Promise<DeskSettingsDTO> => {
  const rows = await db.select().from(deskSettings).limit(1);
  if (rows[0]) {
    return { coachEmails: rows[0].coachEmails };
  }
  const [created] = await db
    .insert(deskSettings)
    .values({ coachEmails: "" })
    .returning();
  return { coachEmails: created.coachEmails };
};
