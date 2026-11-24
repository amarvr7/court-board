import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  courts,
  players,
  deskSettings,
  type CourtZone,
  type MatchStatus,
} from "./schema";
import { createInterface } from "node:readline/promises";

export interface SeedCourtDefinition {
  sortOrder: number;
  name: string;
  zone: CourtZone;
}

/**
 * Exact 49 courts in order across the 5 facility zones:
 * 1. Stadium: Stadium Hard, Stadium Clay (2)
 * 2. Hard Courts: Hard 1 through Hard 28 (28)
 * 3. East Clay: East Clay 1 through East Clay 9 (9)
 * 4. Legacy: Legacy 1 through Legacy 6 (6)
 * 5. Indoors: Indoors 1 through Indoors 4 (4)
 */
export const buildFacilityCourtsList = (): SeedCourtDefinition[] => {
  const list: SeedCourtDefinition[] = [];
  let order = 1;

  list.push({ sortOrder: order++, name: "Stadium Hard", zone: "Stadium" });
  list.push({ sortOrder: order++, name: "Stadium Clay", zone: "Stadium" });

  for (let i = 1; i <= 28; i++) {
    list.push({
      sortOrder: order++,
      name: `Hard ${i}`,
      zone: "Hard Courts",
    });
  }

  for (let i = 1; i <= 9; i++) {
    list.push({
      sortOrder: order++,
      name: `East Clay ${i}`,
      zone: "East Clay",
    });
  }

  for (let i = 1; i <= 6; i++) {
    list.push({
      sortOrder: order++,
      name: `Legacy ${i}`,
      zone: "Legacy",
    });
  }

  for (let i = 1; i <= 4; i++) {
    list.push({
      sortOrder: order++,
      name: `Indoors ${i}`,
      zone: "Indoors",
    });
  }

  return list;
};

/** Short Ascender sample roster for local testing. */
export const SAMPLE_ROSTER: Array<{ firstName: string; lastName: string }> = [
  { firstName: "Maya", lastName: "Reyes" },
  { firstName: "Leo", lastName: "Tran" },
  { firstName: "Sam", lastName: "Lee" },
  { firstName: "Ava", lastName: "Chen" },
  { firstName: "Noah", lastName: "Patel" },
  { firstName: "Zoe", lastName: "Martinez" },
  { firstName: "Eli", lastName: "Brooks" },
  { firstName: "Nina", lastName: "Okoye" },
];

/**
 * The seed wipes every court and player. Make the person running it type
 * RESET first, so it can't be run against the live event database by accident.
 * (For scripted use: npm run db:seed -- --yes)
 */
const confirmReset = async (databaseUrl: string): Promise<boolean> => {
  if (process.argv.includes("--yes")) return true;

  let host = "unknown database";
  try {
    host = new URL(databaseUrl).host;
  } catch {
    // keep default label
  }

  console.log("");
  console.log("⚠️  This deletes ALL courts, players, and desk settings and loads sample test data.");
  console.log(`   Database: ${host}`);
  console.log("   Do not run this on the live event database.");
  console.log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "Type RESET to continue, or press Enter to cancel: "
  );
  rl.close();
  return answer.trim() === "RESET";
};

const runSeed = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in environment");
  }

  if (!(await confirmReset(databaseUrl))) {
    console.log("Cancelled. Nothing was changed.");
    process.exit(0);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);
  const now = new Date();

  console.log("Clearing existing courts, players, and desk settings...");
  await db.delete(courts);
  await db.delete(players);
  await db.delete(deskSettings);

  console.log("Inserting sample Ascender roster...");
  const insertedPlayers = await db
    .insert(players)
    .values(
      SAMPLE_ROSTER.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
      }))
    )
    .returning();

  console.log(`Inserted ${insertedPlayers.length} roster players.`);

  const byName = new Map(
    insertedPlayers.map((p) => [p.fullName.toLowerCase(), p])
  );
  const find = (fullName: string) => byName.get(fullName.toLowerCase())!;

  const courtDefinitions = buildFacilityCourtsList();
  console.log(`Inserting ${courtDefinitions.length} facility courts...`);

  // Sample matches: Maya vs Jordan (Hard 12), Leo vs Ana (East Clay 3),
  // Sam warmup (Stadium Hard), Ava+Eli doubles (Hard 1)
  type SeedMatch = {
    courtName: string;
    status: MatchStatus;
    player: string;
    partner?: string;
    opponent: string;
    opponentPartner?: string;
  };

  const sampleMatches: SeedMatch[] = [
    {
      courtName: "Hard 12",
      status: "In Progress",
      player: "Maya Reyes",
      opponent: "Jordan Smith",
    },
    {
      courtName: "East Clay 3",
      status: "In Progress",
      player: "Leo Tran",
      opponent: "Ana Perez",
    },
    {
      courtName: "Stadium Hard",
      status: "Warmup",
      player: "Sam Lee",
      opponent: "Chris Davis",
    },
    {
      courtName: "Hard 1",
      status: "In Progress",
      player: "Ava Chen",
      partner: "Eli Brooks",
      opponent: "Jordan Smith",
      opponentPartner: "Kai Nguyen",
    },
  ];

  const matchByCourt = new Map(
    sampleMatches.map((m) => [m.courtName.toLowerCase(), m])
  );

  const courtRows = courtDefinitions.map((courtDef) => {
    const match = matchByCourt.get(courtDef.name.toLowerCase());
    if (!match) {
      return {
        sortOrder: courtDef.sortOrder,
        name: courtDef.name,
        zone: courtDef.zone,
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
      };
    }

    const player = find(match.player);
    const partner = match.partner ? find(match.partner) : null;

    return {
      sortOrder: courtDef.sortOrder,
      name: courtDef.name,
      zone: courtDef.zone,
      status: match.status,
      player1Id: player.id,
      player2Id: null,
      player3Id: partner?.id ?? null,
      player4Id: null,
      opponentName: match.opponent,
      opponentPartnerName: match.opponentPartner ?? null,
      statusChangedAt: now,
      player1MovedAt: null,
      player3MovedAt: null,
    };
  });

  const insertedCourts = await db.insert(courts).values(courtRows).returning();
  console.log(`Inserted ${insertedCourts.length} courts across 5 zones.`);
  console.log(`Assigned ${sampleMatches.length} sample matches.`);

  await db.insert(deskSettings).values({
    coachEmails: "",
    updatedAt: now,
  });

  const zoneCounts = insertedCourts.reduce<Record<string, number>>((acc, c) => {
    acc[c.zone] = (acc[c.zone] || 0) + 1;
    return acc;
  }, {});
  console.log("Zone breakdown:", zoneCounts);
};

runSeed()
  .then(() => {
    console.log("Database seed completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
