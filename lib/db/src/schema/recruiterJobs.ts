import { pgTable, serial, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { recruitersTable } from "./recruiters";

export const recruiterJobsTable = pgTable("recruiter_jobs", {
  id: serial("id").primaryKey(),
  recruiterId: integer("recruiter_id").notNull().references(() => recruitersTable.id),
  title: text("title").notNull(),
  rawDescription: text("raw_description").notNull(),
  parsedRequirements: jsonb("parsed_requirements").$type<{
    role: string;
    seniority: string;
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    minCgpa: number | null;
    workMode: string | null;
    minExperience: string | null;
    location: string | null;
    summary: string;
  } | null>(),
  status: text("status").notNull().default("active"),
  invitesSent: integer("invites_sent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  recruiterIdx: index("rj_recruiter_idx").on(t.recruiterId),
  statusIdx: index("rj_status_idx").on(t.status),
  createdIdx: index("rj_created_idx").on(t.createdAt),
}));

export type RecruiterJob = typeof recruiterJobsTable.$inferSelect;
