import { db, courseEnrollmentsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";

export interface ActiveCourse {
  subDomainId: string;
  subDomainName: string;
  completed: number;
  total: number;
  updatedAt: string;
}

/**
 * The student's most recently touched in-progress course, derived from
 * courseEnrollments. Replaces the old students.lastCourse jsonb column —
 * completed = number of completed lessons, total = lessons across all modules.
 * Returns null when there is no active enrollment.
 */
export async function getActiveCourseProgress(studentId: number): Promise<ActiveCourse | null> {
  const [row] = await db
    .select()
    .from(courseEnrollmentsTable)
    .where(and(eq(courseEnrollmentsTable.studentId, studentId), eq(courseEnrollmentsTable.status, "in_progress")))
    .orderBy(desc(courseEnrollmentsTable.updatedAt))
    .limit(1);
  if (!row) return null;

  const modules = ((row.courseData as { modules?: { lessons?: unknown[] }[] } | null)?.modules ?? []) as { lessons?: unknown[] }[];
  const total = modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
  const completed = Array.isArray(row.completedLessonIds) ? row.completedLessonIds.length : 0;

  return {
    subDomainId: row.subDomainId,
    subDomainName: row.subDomainName,
    completed,
    total,
    updatedAt: (row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)).toISOString(),
  };
}
