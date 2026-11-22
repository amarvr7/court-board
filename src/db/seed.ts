import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { courts, players, type CourtZone, type MatchStatus } from "./schema";
import { eq } from "drizzle-orm";

export interface SeedCourtDefinition {
  sortOrder: number;
  name: string;
  zone: CourtZone;
}

/**
 * Exact 49 courts in order across the 5 facility zones:
 * 1. Stadium: Stadium Hard, Clay Hard (2)
 * 2. Hard Courts: Hard 1 through Hard 28 (28)
 * 3. East Clay: East Clay 1 through East Clay 9 (9)
 * 4. Legacy: Legacy 1 through Legacy 6 (6)
 * 5. Indoors: Indoors 1 through Indoors 4 (4)
 */
export const buildFacilityCourtsList = (): SeedCourtDefinition[] => {
  const list: SeedCourtDefinition[] = [];
  let order = 1;

  // 1. Stadium: Stadium Hard, Clay Hard
  list.push({ sortOrder: order++, name: "Stadium Hard", zone: "Stadium" });
  list.push({ sortOrder: order++, name: "Clay Hard", zone: "Stadium" });

  // 2. Hard Courts: Hard 1 through Hard 28
  for (let i = 1; i <= 28; i++) {
    list.push({
      sortOrder: order++,
      name: `Hard ${i}`,
      zone: "Hard Courts",
    });
  }

  // 3. East Clay: East Clay 1 through East Clay 9
  for (let i = 1; i <= 9; i++) {
    list.push({
      sortOrder: order++,
      name: `East Clay ${i}`,
      zone: "East Clay",
    });
  }

  // 4. Legacy: Legacy 1 through Legacy 6
  for (let i = 1; i <= 6; i++) {
    list.push({
      sortOrder: order++,
      name: `Legacy ${i}`,
      zone: "Legacy",
    });
  }

  // 5. Indoors: Indoors 1 through Indoors 4
  for (let i = 1; i <= 4; i++) {
    list.push({
      sortOrder: order++,
      name: `Indoors ${i}`,
      zone: "Indoors",
    });
  }

  return list;
};

/**
 * 60 strictly fictional tennis player names for testing.
 */
export const FICTIONAL_TENNIS_PLAYERS: Array<{
  firstName: string;
  lastName: string;
}> = [
  { firstName: "Arthur", lastName: "Pendelton" },
  { firstName: "Bianca", lastName: "Vance" },
  { firstName: "Carlos", lastName: "Mendoza" },
  { firstName: "Diana", lastName: "Kovacs" },
  { firstName: "Ethan", lastName: "Blackwood" },
  { firstName: "Fiona", lastName: "Gallagher" },
  { firstName: "Gabriel", lastName: "Sorrento" },
  { firstName: "Hannah", lastName: "Lindqvist" },
  { firstName: "Isaac", lastName: "Thornton" },
  { firstName: "Jasmine", lastName: "Al-Mansoor" },
  { firstName: "Kai", lastName: "Takahashi" },
  { firstName: "Elena", lastName: "Rostova" },
  { firstName: "Marcus", lastName: "Sterling" },
  { firstName: "Nadia", lastName: "Petrova" },
  { firstName: "Oliver", lastName: "Whitmore" },
  { firstName: "Priya", lastName: "Sundaram" },
  { firstName: "Quentin", lastName: "Beauchamp" },
  { firstName: "Rachel", lastName: "Holloway" },
  { firstName: "Sebastian", lastName: "Castellano" },
  { firstName: "Tessa", lastName: "Montgomery" },
  { firstName: "Ulrich", lastName: "Brenner" },
  { firstName: "Valeria", lastName: "Morales" },
  { firstName: "Wesley", lastName: "Kensington" },
  { firstName: "Ximena", lastName: "Delgado" },
  { firstName: "Yuki", lastName: "Nakamura" },
  { firstName: "Zane", lastName: "Callahan" },
  { firstName: "Adrian", lastName: "Mercer" },
  { firstName: "Brooke", lastName: "Ashford" },
  { firstName: "Caleb", lastName: "Sinclair" },
  { firstName: "Daphne", lastName: "Vermeer" },
  { firstName: "Dominic", lastName: "Valenti" },
  { firstName: "Evangeline", lastName: "Cross" },
  { firstName: "Felix", lastName: "Lindholm" },
  { firstName: "Gemma", lastName: "Radcliffe" },
  { firstName: "Hugo", lastName: "Fontaine" },
  { firstName: "Iris", lastName: "Papadopoulos" },
  { firstName: "Julian", lastName: "Hawthorne" },
  { firstName: "Kira", lastName: "Volkova" },
  { firstName: "Liam", lastName: "O'Sullivan" },
  { firstName: "Maya", lastName: "Chatterjee" },
  { firstName: "Nathaniel", lastName: "Brooks" },
  { firstName: "Ophelia", lastName: "Laurent" },
  { firstName: "Patrick", lastName: "McAllister" },
  { firstName: "Quinn", lastName: "Davenport" },
  { firstName: "Rafael", lastName: "Santoro" },
  { firstName: "Sienna", lastName: "kaufman" },
  { firstName: "Theo", lastName: "VanDerBerg" },
  { firstName: "Uma", lastName: "Krishnan" },
  { firstName: "Victor", lastName: "Lombardi" },
  { firstName: "Willa", lastName: "Harrington" },
  { firstName: "Xavier", lastName: "Dupont" },
  { firstName: "Yara", lastName: "Haddad" },
  { firstName: "Zachary", lastName: "Winslow" },
  { firstName: "Amara", lastName: "Okafor" },
  { firstName: "Bennett", lastName: "prescott" },
  { firstName: "Clara", lastName: "Bergstrom" },
  { firstName: "Declan", lastName: "Gallagher" },
  { firstName: "Elodie", lastName: "Marchand" },
  { firstName: "Finn", lastName: "MacLeod" },
  { firstName: "Grace", lastName: "Weatherby" },
];

const runSeed = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in environment");
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("🎾 Clearing existing court assignments and players...");
  await db.delete(courts);
  await db.delete(players);

  console.log("👟 Inserting 60 fictional tennis players...");
  const insertedPlayers = await db
    .insert(players)
    .values(
      FICTIONAL_TENNIS_PLAYERS.map((p) => {
        const cleanLast =
          p.lastName.charAt(0).toUpperCase() + p.lastName.slice(1);
        return {
          firstName: p.firstName,
          lastName: cleanLast,
          fullName: `${p.firstName} ${cleanLast}`,
        };
      })
    )
    .returning();

  console.log(`✅ Inserted ${insertedPlayers.length} fictional players.`);

  const courtDefinitions = buildFacilityCourtsList();
  console.log(`🏟️ Inserting ${courtDefinitions.length} facility courts in exact order...`);

  // Assign active matches across the first 26 courts (52 players) and leave others Open/Maintenance
  let playerCursor = 0;

  const courtRows = courtDefinitions.map((courtDef, idx) => {
    let status: MatchStatus = "Open";
    let player1Id: number | null = null;
    let player2Id: number | null = null;

    if (idx === 0 || idx === 1) {
      // Stadium feature matches
      status = "In Progress";
      player1Id = insertedPlayers[playerCursor++]?.id ?? null;
      player2Id = insertedPlayers[playerCursor++]?.id ?? null;
    } else if (idx >= 2 && idx <= 15) {
      // Hard courts active & warmup matches
      status = idx % 4 === 0 ? "Warmup" : "In Progress";
      player1Id = insertedPlayers[playerCursor++]?.id ?? null;
      player2Id = insertedPlayers[playerCursor++]?.id ?? null;
    } else if (idx === 29) {
      // Hard 28 in maintenance
      status = "Maintenance";
    } else if (idx >= 30 && idx <= 35) {
      // East Clay 1-6 active matches
      status = idx % 3 === 0 ? "Warmup" : "In Progress";
      player1Id = insertedPlayers[playerCursor++]?.id ?? null;
      player2Id = insertedPlayers[playerCursor++]?.id ?? null;
    } else if (idx === 38) {
      // East Clay 9 in maintenance
      status = "Maintenance";
    } else if (idx >= 39 && idx <= 42) {
      // Legacy 1-4 active matches
      status = idx === 39 ? "Warmup" : "In Progress";
      player1Id = insertedPlayers[playerCursor++]?.id ?? null;
      player2Id = insertedPlayers[playerCursor++]?.id ?? null;
    } else if (idx >= 45 && idx <= 46) {
      // Indoors 1-2 active matches
      status = "In Progress";
      player1Id = insertedPlayers[playerCursor++]?.id ?? null;
      player2Id = insertedPlayers[playerCursor++]?.id ?? null;
    }

    return {
      sortOrder: courtDef.sortOrder,
      name: courtDef.name,
      zone: courtDef.zone,
      status,
      player1Id,
      player2Id,
      player3Id: null,
      player4Id: null,
    };
  });

  const insertedCourts = await db.insert(courts).values(courtRows).returning();
  console.log(`✅ Inserted ${insertedCourts.length} courts across 5 zones.`);
  console.log(
    `📊 Assigned ${playerCursor} of ${insertedPlayers.length} fictional players to live/warmup courts.`
  );

  // Verify zone counts
  const zoneCounts = insertedCourts.reduce<Record<string, number>>((acc, c) => {
    acc[c.zone] = (acc[c.zone] || 0) + 1;
    return acc;
  }, {});
  console.log("🏟️ Zone Breakdown:", zoneCounts);
};

runSeed()
  .then(() => {
    console.log("🎉 Database seed completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
