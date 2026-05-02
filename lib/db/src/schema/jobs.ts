import { pgTable, serial, text, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  role: text("role").notNull(),
  requiredSkills: jsonb("required_skills").notNull().default([]),
  ctcMin: real("ctc_min").notNull(),
  ctcMax: real("ctc_max").notNull(),
  location: text("location").notNull(),
  remote: boolean("remote").notNull().default(false),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
