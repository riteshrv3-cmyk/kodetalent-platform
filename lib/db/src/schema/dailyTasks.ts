import { pgTable, serial, integer, text, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyTasksTable = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  date: text("date").notNull(), // IST YYYY-MM-DD the task belongs to
  kind: text("kind").notNull(), // 'first_mock' | 'practice' | 'course' | 'jobs' | 'invite' | 'followup' | 'drive_check'
  label: text("label").notNull(),
  sublabel: text("sublabel"),
  href: text("href").notNull(),
  hot: boolean("hot").notNull().default(false),
  manual: boolean("manual").notNull().default(false),
  done: boolean("done").notNull().default(false),
  completedAt: timestamp("completed_at"),
  source: text("source").notNull(), // 'rule' | 'report'
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  studentDateIdx: index("dt_student_date_idx").on(t.studentId, t.date),
  studentDateKindUq: uniqueIndex("dt_student_date_kind_uq").on(t.studentId, t.date, t.kind),
}));

export const insertDailyTaskSchema = createInsertSchema(dailyTasksTable).omit({ id: true, createdAt: true });
export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;
export type DailyTask = typeof dailyTasksTable.$inferSelect;
