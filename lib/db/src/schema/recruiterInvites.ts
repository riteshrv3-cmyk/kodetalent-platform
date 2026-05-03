import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const recruiterInvites = pgTable("recruiter_invites", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  recruiterCompany: text("recruiter_company").notNull(),
  recruiterName: text("recruiter_name").notNull(),
  recruiterEmail: text("recruiter_email").notNull(),
  role: text("role"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  studentSeen: boolean("student_seen").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RecruiterInvite = typeof recruiterInvites.$inferSelect;
