import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const studentResumesTable = pgTable("student_resumes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  templateId: text("template_id").notNull().default("classic"),
  jdText: text("jd_text"),
  companyName: text("company_name"),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => ({
  studentIdx: index("student_resumes_student_id_idx").on(t.studentId),
}));

export type StudentResume = typeof studentResumesTable.$inferSelect;
