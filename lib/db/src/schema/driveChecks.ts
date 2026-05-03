import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const driveChecksTable = pgTable("drive_checks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  rawText: text("raw_text").notNull(),
  company: text("company"),
  role: text("role"),
  ctc: text("ctc"),
  batch: text("batch"),
  branches: jsonb("branches").notNull().default([]),
  cgpaCutoff: text("cgpa_cutoff"),
  applyLink: text("apply_link"),
  scamScore: integer("scam_score").notNull().default(0),
  scamVerdict: text("scam_verdict").notNull().default("risky"),
  scamReasons: jsonb("scam_reasons").notNull().default([]),
  eligibility: jsonb("eligibility").notNull().default({}),
  gatesOpen: integer("gates_open").notNull().default(0),
  gatesTotal: integer("gates_total").notNull().default(0),
  kodeScoreFit: integer("kode_score_fit").notNull().default(0),
  tpoMatch: text("tpo_match").notNull().default("unknown"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DriveCheck = typeof driveChecksTable.$inferSelect;
