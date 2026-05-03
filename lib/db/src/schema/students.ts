import { pgTable, serial, text, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
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

  // ─── Career links ─────────────────────────────────────────────────────────
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  phone: text("phone"),
  bio: text("bio"),

  // ─── Academic / goals ─────────────────────────────────────────────────────
  cgpa: text("cgpa"),
  targetPackage: text("target_package"),
  dreamCompany: text("dream_company"),

  // ─── Rich profile data ────────────────────────────────────────────────────
  projects: jsonb("projects").notNull().default([]),
  certifications: jsonb("certifications").notNull().default([]),

  // ─── Job preferences ──────────────────────────────────────────────────────
  openToWork: boolean("open_to_work").notNull().default(true),
  workMode: text("work_mode").default("hybrid"),
  preferredLocations: jsonb("preferred_locations").notNull().default([]),
  expectedSalary: text("expected_salary"),

  // ─── AI-analyzed data ────────────────────────────────────────────────────
  githubStats: jsonb("github_stats"),
  linkedinData: jsonb("linkedin_data"),

  // ─── Scores ───────────────────────────────────────────────────────────────
  profileStrength: integer("profile_strength").notNull().default(0),
  commitmentScore: integer("commitment_score").notNull().default(0),
  overallScore: integer("overall_score").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  skills: jsonb("skills").notNull().default({}),
  isPro: boolean("is_pro").notNull().default(false),
  collegeId: integer("college_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  collegeIdIdx: index("students_college_id_idx").on(t.collegeId),
  collegeIdx: index("students_college_idx").on(t.college),
  openToWorkIdx: index("students_open_to_work_idx").on(t.openToWork),
  yearIdx: index("students_year_idx").on(t.year),
  fieldIdx: index("students_field_idx").on(t.field),
  overallScoreIdx: index("students_overall_score_idx").on(t.overallScore),
  collegeScoreIdx: index("students_college_score_idx").on(t.college, t.overallScore),
  recruiterSearchIdx: index("students_recruiter_search_idx").on(t.openToWork, t.year, t.college),
}));

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
