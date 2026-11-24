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
  // Our side: player1 = our player, player3 = our partner (doubles)
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
  // Opponent side is free text (not roster records)
  opponentName: text("opponent_name"),
  opponentPartnerName: text("opponent_partner_name"),
  // Clock for "In Progress · 42 min" — resets only when status changes
  statusChangedAt: timestamp("status_changed_at"),
  // Set when that player was already on a different court ("Moved · 2 min ago")
  player1MovedAt: timestamp("player1_moved_at"),
  player3MovedAt: timestamp("player3_moved_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Single-row desk settings (coach email list, etc.) */
export const deskSettings = pgTable("desk_settings", {
  id: serial("id").primaryKey(),
  coachEmails: text("coach_emails").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;
export type DeskSettings = typeof deskSettings.$inferSelect;
export type CourtZone = (typeof courtZoneEnum.enumValues)[number];
export type MatchStatus = (typeof matchStatusEnum.enumValues)[number];
