import { pgTable, serial, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { courseEnrollmentsTable } from "./courseEnrollments";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Generated ONCE per enrollment and reused across every retake — this is the
 * cost lock. Unique on enrollmentId so the generate endpoint can check for an
 * existing row before making an AI call, mirroring ai_cache's "don't
 * regenerate what you already have" principle but scoped per-student since
 * an exam is tied to one student's specific course content.
 */
export const courseFinalExamsTable = pgTable("course_final_exams", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => courseEnrollmentsTable.id, { onDelete: "cascade" }),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  enrollmentIdx: uniqueIndex("course_final_exams_enrollment_idx").on(t.enrollmentId),
}));

export const insertCourseFinalExamSchema = createInsertSchema(courseFinalExamsTable).omit({ id: true, createdAt: true });
export type InsertCourseFinalExam = z.infer<typeof insertCourseFinalExamSchema>;
export type CourseFinalExam = typeof courseFinalExamsTable.$inferSelect;
