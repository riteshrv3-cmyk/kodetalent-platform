import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  college: text("college").notNull(),
  city: text("city").notNull(),
  year: integer("year").notNull(),
  field: text("field").notNull(),
  githubUrl: text("github_url"),
  overallScore: integer("overall_score").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  skills: jsonb("skills").notNull().default({}),
  isPro: boolean("is_pro").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
