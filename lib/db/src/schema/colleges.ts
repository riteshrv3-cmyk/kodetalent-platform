import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const collegesTable = pgTable("colleges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  inviteCode: text("invite_code").notNull().unique(),
  tpoEmail: text("tpo_email").notNull(),
  tpoName: text("tpo_name"),
  logoUrl: text("logo_url"),
  signupCount: integer("signup_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  inviteCodeIdx: index("colleges_invite_code_idx").on(t.inviteCode),
  tpoEmailIdx: index("colleges_tpo_email_idx").on(t.tpoEmail),
}));

export type College = typeof collegesTable.$inferSelect;
