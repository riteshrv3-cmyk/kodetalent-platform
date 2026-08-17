import { pgTable, serial, integer, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { courseFinalExamsTable } from "./courseFinalExams";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Unlimited retakes, 70% pass bar (enforced in route logic, not here). Pure
 * grading against the already-generated courseFinalExamsTable.questions — no
 * AI call on submit, so retakes cost nothing.
 */
export const courseFinalExamAttemptsTable = pgTable("course_final_exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => courseFinalExamsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  examStudentIdx: index("course_final_exam_attempts_exam_student_idx").on(t.examId, t.studentId),
}));

export const insertCourseFinalExamAttemptSchema = createInsertSchema(courseFinalExamAttemptsTable).omit({ id: true, createdAt: true });
export type InsertCourseFinalExamAttempt = z.infer<typeof insertCourseFinalExamAttemptSchema>;
export type CourseFinalExamAttempt = typeof courseFinalExamAttemptsTable.$inferSelect;
