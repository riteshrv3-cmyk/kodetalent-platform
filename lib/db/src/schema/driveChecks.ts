import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

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
  // Application outcome tracking (ghost-rate intelligence)
  // outcome: "pending" | "applied" | "called" | "ghosted" | "rejected" | "offer" | "skipped"
  outcome: text("outcome").notNull().default("pending"),
  appliedAt: timestamp("applied_at"),
  outcomeAt: timestamp("outcome_at"),
  nextPingAt: timestamp("next_ping_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  studentIdx: index("dc_student_idx").on(t.studentId),
  outcomeIdx: index("dc_outcome_idx").on(t.outcome),
  companyIdx: index("dc_company_idx").on(t.company),
  createdIdx: index("dc_created_idx").on(t.createdAt),
}));

export type DriveCheck = typeof driveChecksTable.$inferSelect;
