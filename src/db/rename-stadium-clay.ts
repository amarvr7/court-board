/**
 * One-time fix: renames the court "Clay Hard" to "Stadium Clay" in an
 * existing database, without touching any players or assignments.
 * Safe to run more than once.
 *
 *   npm run db:rename-stadium
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { courts } from "./schema";

const run = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing in environment");

  const db = drizzle(neon(databaseUrl));

  const renamed = await db
    .update(courts)
    .set({ name: "Stadium Clay", updatedAt: new Date() })
    .where(eq(courts.name, "Clay Hard"))
    .returning();

  if (renamed.length > 0) {
    console.log('✅ Renamed "Clay Hard" to "Stadium Clay".');
  } else {
    console.log('Nothing to rename — no court called "Clay Hard" was found.');
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Rename failed:", err);
    process.exit(1);
  });
