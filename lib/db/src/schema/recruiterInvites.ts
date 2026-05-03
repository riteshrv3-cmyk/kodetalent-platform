import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
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
  recruiterId: integer("recruiter_id"),
  jobId: integer("job_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  studentIdx: index("ri_student_idx").on(t.studentId),
  recruiterIdx: index("ri_recruiter_idx").on(t.recruiterId),
  jobIdx: index("ri_job_idx").on(t.jobId),
  statusIdx: index("ri_status_idx").on(t.status),
  createdIdx: index("ri_created_idx").on(t.createdAt),
}));

export type RecruiterInvite = typeof recruiterInvites.$inferSelect;
