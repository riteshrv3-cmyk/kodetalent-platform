import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  college: text("college").notNull(),
  batchYear: integer("batch_year"),
  field: text("field"),
  designation: text("designation"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Mentor = typeof mentors.$inferSelect;
