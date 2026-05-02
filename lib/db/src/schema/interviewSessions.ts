import { pgTable, serial, integer, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  company: text("company").notNull(),
  round: text("round").notNull(),
  questions: jsonb("questions").notNull().default([]),
  answers: jsonb("answers").notNull().default([]),
  overallScore: integer("overall_score"),
  evaluation: jsonb("evaluation"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessionsTable).omit({ id: true, createdAt: true });
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessionsTable.$inferSelect;
