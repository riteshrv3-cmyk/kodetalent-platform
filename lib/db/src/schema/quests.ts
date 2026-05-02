import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questsTable = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  field: text("field").notNull(),
  year: integer("year").notNull(),
  xpReward: integer("xp_reward").notNull().default(50),
  minutes: integer("minutes").notNull().default(10),
  whyItMatters: text("why_it_matters").notNull().default(""),
  howToDoIt: text("how_to_do_it").notNull().default(""),
});

export const insertQuestSchema = createInsertSchema(questsTable).omit({ id: true });
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof questsTable.$inferSelect;
