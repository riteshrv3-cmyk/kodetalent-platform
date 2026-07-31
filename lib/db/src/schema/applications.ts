import { pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { studentResumesTable } from "./studentResumes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  // Which tailored resume (if any) was used for this application — the "proof
  // loop" that closes the gap between generating a resume and actually using
  // it. Set automatically when a downloaded resume's company matches this
  // application, or by an explicit link action. Null means not yet linked.
  resumeId: integer("resume_id").references(() => studentResumesTable.id, { onDelete: "set null" }),
  source: text("source").notNull(), // 'pasted' | 'drive_check'
  rawText: text("raw_text").notNull(),
  company: text("company"),
  role: text("role"),
  ctc: text("ctc"),
  applyLink: text("apply_link"),
  scamScore: integer("scam_score"),
  scamVerdict: text("scam_verdict"), // 'safe' | 'risky' | 'scam'
  scamReasons: jsonb("scam_reasons"),
  gates: jsonb("gates"),
  gatesOpen: integer("gates_open"),
  gatesTotal: integer("gates_total"),
  fitScore: integer("fit_score"),
  fitSummary: text("fit_summary"),
  have: jsonb("have"),
  missing: jsonb("missing"),
  suggestedPrep: jsonb("suggested_prep"),
  status: text("status").notNull().default("viewed"), // viewed|clicked_apply|heard_back|interview|offer|rejected
  statusUpdatedAt: timestamp("status_updated_at").notNull().defaultNow(),
  driveCheckId: integer("drive_check_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  studentIdx: index("app_student_idx").on(t.studentId),
  studentStatusIdx: index("app_student_status_idx").on(t.studentId, t.status),
  createdIdx: index("app_created_idx").on(t.createdAt),
}));

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, createdAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
