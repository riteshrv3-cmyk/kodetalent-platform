import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentActivityLogTable = pgTable("student_activity_log", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  action: text("action").notNull(),
  description: text("description").notNull(),
  xpAmount: integer("xp_amount").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  studentIdx: index("sal_student_idx").on(t.studentId),
  studentCreatedIdx: index("sal_student_created_idx").on(t.studentId, t.createdAt),
}));

export const insertStudentActivityLogSchema = createInsertSchema(studentActivityLogTable).omit({ id: true, createdAt: true });
export type InsertStudentActivityLog = z.infer<typeof insertStudentActivityLogSchema>;
export type StudentActivityLog = typeof studentActivityLogTable.$inferSelect;
