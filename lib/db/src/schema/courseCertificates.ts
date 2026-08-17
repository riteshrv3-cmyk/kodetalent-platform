import { pgTable, serial, integer, text, jsonb, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { courseEnrollmentsTable } from "./courseEnrollments";
import { interviewSessionsTable } from "./interviewSessions";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * The deliverable. Copies studentResumesTable's share-slug pattern for the
 * public verify page (GET /certs/:slug, unauthenticated, outside AppLayout —
 * same shape as GET /r/:slug). includeOnResume defaults false: whether the
 * certificate reaches the resume is the student's choice, never automatic.
 */
export const courseCertificatesTable = pgTable("course_certificates", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  enrollmentId: integer("enrollment_id").notNull().references(() => courseEnrollmentsTable.id, { onDelete: "cascade" }),
  // Public-facing certificate ID, distinct from the internal serial id.
  certificateCode: text("certificate_code").notNull(),
  subDomainName: text("sub_domain_name").notNull(),
  domainName: text("domain_name").notNull(),
  skillsCovered: jsonb("skills_covered").notNull().default([]),
  finalExamScore: integer("final_exam_score").notNull(),
  interviewSessionId: integer("interview_session_id").references(() => interviewSessionsTable.id),
  // 8-char slug, same generator as resume share (resume.ts generateSlug()).
  verifySlug: text("verify_slug").notNull(),
  includeOnResume: boolean("include_on_resume").notNull().default(false),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
}, t => ({
  studentIdx: index("course_certificates_student_idx").on(t.studentId),
  verifySlugIdx: uniqueIndex("course_certificates_verify_slug_idx").on(t.verifySlug),
  enrollmentIdx: uniqueIndex("course_certificates_enrollment_idx").on(t.enrollmentId),
}));

export const insertCourseCertificateSchema = createInsertSchema(courseCertificatesTable).omit({ id: true, issuedAt: true });
export type InsertCourseCertificate = z.infer<typeof insertCourseCertificateSchema>;
export type CourseCertificate = typeof courseCertificatesTable.$inferSelect;
