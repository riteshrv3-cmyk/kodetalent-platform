import { pgTable, serial, text, jsonb, timestamp, index, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tpoDrivesTable = pgTable("tpo_drives", {
  id: serial("id").primaryKey(),
  college: text("college").notNull(),
  postedByName: text("posted_by_name").notNull(),
  company: text("company").notNull(),
  role: text("role"),
  ctc: text("ctc"),
  batch: text("batch"),
  branches: jsonb("branches").notNull().default([]),
  cgpaCutoff: text("cgpa_cutoff"),
  applyLink: text("apply_link"),
  notes: text("notes"),
  driveDate: timestamp("drive_date", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  matchedChecks: integer("matched_checks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  collegeIdx: index("tpo_drives_college_idx").on(t.college),
  companyIdx: index("tpo_drives_company_idx").on(t.company),
  createdIdx: index("tpo_drives_created_idx").on(t.createdAt),
}));

export const insertTpoDriveSchema = createInsertSchema(tpoDrivesTable).omit({
  id: true,
  createdAt: true,
  matchedChecks: true,
});
export type InsertTpoDrive = z.infer<typeof insertTpoDriveSchema>;
export type TpoDrive = typeof tpoDrivesTable.$inferSelect;
