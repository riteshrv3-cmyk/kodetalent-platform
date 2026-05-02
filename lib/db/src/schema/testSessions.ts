import { pgTable, serial, integer, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testSessionsTable = pgTable("test_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  testType: text("test_type").notNull(),
  difficulty: text("difficulty").notNull(),
  questions: jsonb("questions").notNull().default([]),
  answers: jsonb("answers"),
  score: integer("score"),
  total: integer("total").notNull().default(20),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTestSessionSchema = createInsertSchema(testSessionsTable).omit({ id: true, createdAt: true });
export type InsertTestSession = z.infer<typeof insertTestSessionSchema>;
export type TestSession = typeof testSessionsTable.$inferSelect;
