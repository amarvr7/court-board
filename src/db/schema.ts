import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const courtZoneEnum = pgEnum("court_zone", [
  "Stadium",
  "Hard Courts",
  "East Clay",
  "Legacy",
  "Indoors",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "Warmup",
  "In Progress",
  "Open",
  "Maintenance",
]);

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courts = pgTable("courts", {
  id: serial("id").primaryKey(),
  sortOrder: integer("sort_order").notNull().unique(),
  name: text("name").notNull().unique(),
  zone: courtZoneEnum("zone").notNull(),
  status: matchStatusEnum("status").notNull().default("Open"),
  player1Id: integer("player1_id").references(() => players.id, {
    onDelete: "set null",
  }),
  player2Id: integer("player2_id").references(() => players.id, {
    onDelete: "set null",
  }),
  player3Id: integer("player3_id").references(() => players.id, {
    onDelete: "set null",
  }),
  player4Id: integer("player4_id").references(() => players.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;
export type CourtZone = (typeof courtZoneEnum.enumValues)[number];
export type MatchStatus = (typeof matchStatusEnum.enumValues)[number];
