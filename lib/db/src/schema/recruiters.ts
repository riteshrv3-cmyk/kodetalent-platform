import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const recruitersTable = pgTable("recruiters", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  role: text("role"),
  invitesSent: integer("invites_sent").notNull().default(0),
  jobsPosted: integer("jobs_posted").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export type Recruiter = typeof recruitersTable.$inferSelect;
