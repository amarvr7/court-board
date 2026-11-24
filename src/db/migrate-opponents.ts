import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { courts, players } from "./schema";

/**
 * One-time migration for databases that still store opponents as player2/player4.
 * Copies their full names into opponent_name / opponent_partner_name, then nulls
 * those foreign keys. Does not delete any player rows.
 *
 * Skip this on a fresh database that never used player2/player4 for opponents.
 */
const run = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in environment");
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const [allCourts, allPlayers] = await Promise.all([
    db.select().from(courts),
    db.select().from(players),
  ]);

  const nameById = new Map(allPlayers.map((p) => [p.id, p.fullName]));
  let updated = 0;

  for (const court of allCourts) {
    const opponentName =
      court.opponentName?.trim() ||
      (court.player2Id ? nameById.get(court.player2Id) ?? null : null);
    const opponentPartnerName =
      court.opponentPartnerName?.trim() ||
      (court.player4Id ? nameById.get(court.player4Id) ?? null : null);

    const needsUpdate =
      (court.player2Id != null || court.player4Id != null) &&
      (opponentName || opponentPartnerName);

    if (!needsUpdate) continue;

    await db
      .update(courts)
      .set({
        opponentName: opponentName || null,
        opponentPartnerName: opponentPartnerName || null,
        player2Id: null,
        player4Id: null,
        updatedAt: new Date(),
      })
      .where(eq(courts.id, court.id));
    updated++;
  }

  console.log(`Migrated ${updated} courts to opponent text fields.`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Opponent migration failed:", err);
    process.exit(1);
  });
