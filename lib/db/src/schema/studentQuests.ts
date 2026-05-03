import { index, pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { questsTable } from "./quests";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentQuestsTable = pgTable("student_quests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  questId: integer("quest_id").notNull().references(() => questsTable.id),
  status: text("status").notNull().default("not_started"),
  completedAt: timestamp("completed_at"),
}, t => ({
  studentIdx: index("sq_student_idx").on(t.studentId),
  questIdx: index("sq_quest_idx").on(t.questId),
  studentStatusIdx: index("sq_student_status_idx").on(t.studentId, t.status),
}));

export const insertStudentQuestSchema = createInsertSchema(studentQuestsTable).omit({ id: true });
export type InsertStudentQuest = z.infer<typeof insertStudentQuestSchema>;
export type StudentQuest = typeof studentQuestsTable.$inferSelect;
