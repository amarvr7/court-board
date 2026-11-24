import { db } from "@/db";
import { courts, players, type CourtZone, type MatchStatus } from "@/db/schema";
import { asc } from "drizzle-orm";
import { formatPlayerPrivacyName } from "@/lib/format-player";

export interface BoardPlayerDTO {
  id: number;
  displayName: string; // Strictly "First L." for privacy on /board
  firstName: string;
  lastInitial: string;
}

export interface AdminPlayerDTO {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  privacyName: string;
}

/**
 * Side A = player1 (+ player3 as partner in doubles)
 * Side B = player2 (+ player4 as partner in doubles)
 */
export interface BoardCourtDTO {
  id: number;
  sortOrder: number;
  name: string;
  zone: CourtZone;
  status: MatchStatus;
  player1: BoardPlayerDTO | null;
  player2: BoardPlayerDTO | null;
  player3: BoardPlayerDTO | null;
  player4: BoardPlayerDTO | null;
  updatedAt: string;
}

export interface AdminCourtDTO {
  id: number;
  sortOrder: number;
  name: string;
  zone: CourtZone;
  status: MatchStatus;
  player1Id: number | null;
  player2Id: number | null;
  player3Id: number | null;
  player4Id: number | null;
  player1: AdminPlayerDTO | null;
  player2: AdminPlayerDTO | null;
  player3: AdminPlayerDTO | null;
  player4: AdminPlayerDTO | null;
  updatedAt: string;
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

  const playerMap = new Map<number, BoardPlayerDTO>();
  for (const p of allPlayers) {
    playerMap.set(p.id, {
      id: p.id,
      displayName: formatPlayerPrivacyName(p.firstName, p.lastName),
      firstName: p.firstName,
      lastInitial: p.lastName.trim().charAt(0).toUpperCase(),
    });
  }

  const formattedCourts: BoardCourtDTO[] = allCourts.map((c) => ({
    id: c.id,
    sortOrder: c.sortOrder,
    name: c.name,
    zone: c.zone,
    status: c.status,
    player1: pick(playerMap, c.player1Id),
    player2: pick(playerMap, c.player2Id),
    player3: pick(playerMap, c.player3Id),
    player4: pick(playerMap, c.player4Id),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return {
    courts: formattedCourts,
    fetchedAt: new Date().toISOString(),
  };
};

export const getAdminCourtsAndPlayersData = async (): Promise<{
  courts: AdminCourtDTO[];
  players: AdminPlayerDTO[];
}> => {
  const [allCourts, allPlayers] = await Promise.all([
    db.select().from(courts).orderBy(asc(courts.sortOrder)),
    db.select().from(players).orderBy(asc(players.firstName), asc(players.lastName)),
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
    player2Id: c.player2Id,
    player3Id: c.player3Id,
    player4Id: c.player4Id,
    player1: pick(playerMap, c.player1Id),
    player2: pick(playerMap, c.player2Id),
    player3: pick(playerMap, c.player3Id),
    player4: pick(playerMap, c.player4Id),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return {
    courts: adminCourts,
    players: adminPlayers,
  };
};
