import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
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
});

export const insertStudentQuestSchema = createInsertSchema(studentQuestsTable).omit({ id: true });
export type InsertStudentQuest = z.infer<typeof insertStudentQuestSchema>;
export type StudentQuest = typeof studentQuestsTable.$inferSelect;
