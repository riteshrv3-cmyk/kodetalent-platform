import { pgTable, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";

export const aiCacheTable = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  namespace: text("namespace").notNull(),
  value: jsonb("value").notNull(),
  hits: integer("hits").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  nsIdx: index("ai_cache_ns_idx").on(t.namespace),
  expIdx: index("ai_cache_exp_idx").on(t.expiresAt),
}));

export type AiCacheRow = typeof aiCacheTable.$inferSelect;
