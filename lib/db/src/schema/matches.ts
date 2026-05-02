import { pgTable, serial, integer, real, text } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { jobsTable } from "./jobs";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  matchScore: real("match_score").notNull(),
  matchReason: text("match_reason").notNull(),
  isLocked: integer("is_locked").notNull().default(0),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
