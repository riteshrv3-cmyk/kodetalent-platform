import { pgTable, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { courseEnrollmentsTable } from "./courseEnrollments";
import { interviewSessionsTable } from "./interviewSessions";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Thin link table, deliberately not a change to interviewSessionsTable
 * itself: a real mock interview is created via the existing
 * POST /interview/sessions flow (round: "Certificate|Standard"), and this
 * row just tags "this session was the certificate gate for this
 * enrollment" once evaluation completes. Keeps ordinary (non-certificate)
 * interviews completely unaffected — no new branching in interview.ts.
 */
export const courseCertificateInterviewsTable = pgTable("course_certificate_interviews", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => courseEnrollmentsTable.id, { onDelete: "cascade" }),
  interviewSessionId: integer("interview_session_id").notNull().references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
  // Pass bar: interview overallScore >= 60 (checked in route logic when the
  // linked session's evaluation completes).
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  enrollmentIdx: uniqueIndex("course_certificate_interviews_enrollment_idx").on(t.enrollmentId),
}));

export const insertCourseCertificateInterviewSchema = createInsertSchema(courseCertificateInterviewsTable).omit({ id: true, createdAt: true });
export type InsertCourseCertificateInterview = z.infer<typeof insertCourseCertificateInterviewSchema>;
export type CourseCertificateInterview = typeof courseCertificateInterviewsTable.$inferSelect;
