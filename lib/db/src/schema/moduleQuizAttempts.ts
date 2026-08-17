import { pgTable, serial, integer, text, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { courseEnrollmentsTable } from "./courseEnrollments";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Append-only, like interviewSessionsTable — every attempt is kept, and the
 * best score per module is derived via a query rather than a mutated "best"
 * column. studentId is denormalized off enrollmentId purely so an ownership
 * check never needs a join.
 */
export const moduleQuizAttemptsTable = pgTable("module_quiz_attempts", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => courseEnrollmentsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull(), // matches CourseModule.id, e.g. "m1"
  answers: jsonb("answers").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull().default(1),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  enrollmentModuleIdx: index("module_quiz_attempts_enrollment_module_idx").on(t.enrollmentId, t.moduleId),
  studentIdx: index("module_quiz_attempts_student_idx").on(t.studentId),
}));

export const insertModuleQuizAttemptSchema = createInsertSchema(moduleQuizAttemptsTable).omit({ id: true, createdAt: true });
export type InsertModuleQuizAttempt = z.infer<typeof insertModuleQuizAttemptSchema>;
export type ModuleQuizAttempt = typeof moduleQuizAttemptsTable.$inferSelect;
