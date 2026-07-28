import { index, pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Hand-picked opportunities that get pinned above the aggregated feed.
 * The locked phase-1 sourcing model is "aggregated + curated": scrapers give
 * breadth, these give the quality floor — especially fresher-friendly Indian
 * roles the generic boards under-serve.
 *
 * Shape mirrors the `Opportunity` interface the feed already returns, so a
 * curated row drops into the same card with no special-casing client-side.
 * `role` and `kind` are the targeting keys: a row surfaces when a student's
 * resolved role matches (case-insensitive substring) and the tab kind lines up.
 */
export const curatedOpportunitiesTable = pgTable("curated_opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  logo: text("logo"),
  location: text("location").notNull(),
  pay: text("pay"),
  tags: jsonb("tags").notNull().default([]),
  url: text("url").notNull(),
  source: text("source").notNull(),
  /** "jobs" | "internship" | "freelancing" — which tab this belongs in. */
  kind: text("kind").notNull(),
  /** Free-text role this targets, e.g. "Full Stack Developer". Empty = all roles. */
  role: text("role").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  kindActiveIdx: index("curated_kind_active_idx").on(t.kind, t.active),
  roleIdx: index("curated_role_idx").on(t.role),
}));

export const insertCuratedOpportunitySchema = createInsertSchema(curatedOpportunitiesTable).omit({ id: true, createdAt: true });
export type InsertCuratedOpportunity = z.infer<typeof insertCuratedOpportunitySchema>;
export type CuratedOpportunity = typeof curatedOpportunitiesTable.$inferSelect;
