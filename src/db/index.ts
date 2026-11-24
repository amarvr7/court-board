import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | undefined;

// Lazily create the client so importing this module (e.g. during `next build`
// page-data collection) does not require DATABASE_URL to be present.
const getDb = (): Database => {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not configured.");
    }
    instance = drizzle(neon(url), { schema });
  }
  return instance;
};

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
