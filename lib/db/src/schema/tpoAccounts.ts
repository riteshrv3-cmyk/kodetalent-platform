import { pgTable, serial, text, timestamp, index, integer, boolean } from "drizzle-orm/pg-core";

export const tpoAccountsTable = pgTable("tpo_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  college: text("college").notNull(),
  dept: text("dept"),
  // verified=true means this TPO is allowed to post drives that count as
  // "official" for matching. ALWAYS starts false at signup; only an admin
  // calling POST /api/admin/tpo-accounts/:id/verify can flip it to true.
  // Email-domain auto-grant is intentionally NOT used because at most
  // colleges students share the same domain as faculty/TPOs.
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  collegeIdx: index("tpo_accounts_college_idx").on(t.college),
  verifiedIdx: index("tpo_accounts_verified_idx").on(t.verified),
}));

export type TpoAccount = typeof tpoAccountsTable.$inferSelect;

export const tpoSessionsTable = pgTable("tpo_sessions", {
  token: text("token").primaryKey(),
  accountId: integer("account_id").notNull().references(() => tpoAccountsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  accountIdx: index("tpo_sessions_account_idx").on(t.accountId),
  expiresIdx: index("tpo_sessions_expires_idx").on(t.expiresAt),
}));

export type TpoSession = typeof tpoSessionsTable.$inferSelect;
