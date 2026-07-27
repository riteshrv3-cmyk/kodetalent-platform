import { db } from "@workspace/db";
import {
  studentsTable,
  dailyTasksTable,
  interviewSessionsTable,
  recruiterInvites,
  applicationsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

export const GENERIC_SKILLS = new Set([
  "dsa", "data structures", "algorithms", "problem solving", "communication",
  "teamwork", "leadership", "time management", "critical thinking", "git",
  "linux", "python", "networking",
]);

const CAP = 5;
const COURSE_FRESH_MS = 14 * 24 * 60 * 60 * 1000;

export function istToday(): string {
  return istDateString(new Date());
}

export function istYesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return istDateString(d);
}

function istDateString(d: Date): string {
  // IST = UTC+5:30, no DST.
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

interface Candidate {
  kind: string;
  label: string;
  sublabel?: string;
  href: string;
  hot: boolean;
  manual: boolean;
  source: "rule" | "report";
}

async function weakestSkill(studentId: number): Promise<string | null> {
  const recent = await db
    .select({ evaluation: interviewSessionsTable.evaluation })
    .from(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.studentId, studentId), eq(interviewSessionsTable.completed, true)))
    .orderBy(desc(interviewSessionsTable.createdAt))
    .limit(3);

  const [student] = await db.select({ skills: studentsTable.skills }).from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  const skills = (student?.skills as Record<string, number>) ?? {};

  const nonGeneric = Object.entries(skills).filter(([name]) => !GENERIC_SKILLS.has(name.toLowerCase().trim()));
  if (nonGeneric.length > 0) {
    return nonGeneric.sort(([, a], [, b]) => a - b)[0][0];
  }

  // Fall back to the weakest sub-score across recent evaluations, if any.
  for (const row of recent) {
    const ev = row.evaluation as { communicationScore?: number; technicalScore?: number; confidenceScore?: number } | null;
    if (!ev) continue;
    const entries = Object.entries({
      Communication: ev.communicationScore,
      Technical: ev.technicalScore,
      Confidence: ev.confidenceScore,
    }).filter((e): e is [string, number] => typeof e[1] === "number");
    if (entries.length > 0) return entries.sort(([, a], [, b]) => a - b)[0][0];
  }

  return null;
}

async function buildCandidates(studentId: number): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!student) return candidates;

  // R1 / R2 — exactly one hot task.
  const [completedInterview] = await db
    .select({ id: interviewSessionsTable.id })
    .from(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.studentId, studentId), eq(interviewSessionsTable.completed, true)))
    .limit(1);

  if (!completedInterview) {
    candidates.push({
      kind: "first_mock",
      label: "Take your first mock interview",
      sublabel: "AI interviewer · 15 minutes",
      href: "/practice",
      hot: true,
      manual: false,
      source: "rule",
    });
  } else {
    const skill = await weakestSkill(studentId);
    if (skill) {
      candidates.push({
        kind: "practice",
        label: `Your ${skill} score is your weakest area`,
        sublabel: "AI interviewer · 15 minutes",
        href: "/practice",
        hot: true,
        manual: false,
        source: "rule",
      });
    }
  }

  // R3 — resume the last-opened course, if progress is fresh and incomplete.
  const lastCourse = student.lastCourse as
    | { subDomainId: string; subDomainName: string; completed: number; total: number; updatedAt: string }
    | null;
  if (lastCourse && lastCourse.total > 0 && lastCourse.completed < lastCourse.total) {
    const fresh = Date.now() - new Date(lastCourse.updatedAt).getTime() < COURSE_FRESH_MS;
    if (fresh) {
      const pct = Math.round((lastCourse.completed / lastCourse.total) * 100);
      candidates.push({
        kind: "course",
        label: `Continue ${lastCourse.subDomainName}`,
        sublabel: `${pct}% complete`,
        href: "/opportunities/course",
        hot: false,
        manual: false,
        source: "rule",
      });
    }
  }

  // R4 — pipeline nudge.
  const [recentApplication] = await db
    .select({ id: applicationsTable.id })
    .from(applicationsTable)
    .where(eq(applicationsTable.studentId, studentId))
    .limit(1);
  candidates.push({
    kind: "jobs",
    label: recentApplication ? "Update your pipeline" : "Add a job to your pipeline",
    href: "/pipeline",
    hot: false,
    manual: true,
    source: "rule",
  });

  // R5 — a recruiter is waiting on a response.
  const [pendingInvite] = await db
    .select({ id: recruiterInvites.id })
    .from(recruiterInvites)
    .where(and(eq(recruiterInvites.studentId, studentId), eq(recruiterInvites.status, "pending"), eq(recruiterInvites.studentSeen, false)))
    .limit(1);
  if (pendingInvite) {
    candidates.push({
      kind: "invite",
      label: "A recruiter is interested — respond",
      href: "/inbox",
      hot: false,
      manual: true,
      source: "rule",
    });
  }

  // R7 — always offered, manual.
  candidates.push({
    kind: "drive_check",
    label: "Scam-check a placement message",
    sublabel: "Only if you got one today",
    href: "/drive-check",
    hot: false,
    manual: true,
    source: "rule",
  });

  return candidates;
}

/** Idempotent: safe to call on every "today" load. R6 (report follow-ups) is written separately by the report's "Add" action, so it's read here as pre-existing rows, never generated. */
export async function generateTodayTasks(studentId: number): Promise<void> {
  const date = istToday();
  const existing = await db
    .select({ kind: dailyTasksTable.kind })
    .from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.studentId, studentId), eq(dailyTasksTable.date, date)));
  const existingKinds = new Set(existing.map((r) => r.kind));

  const candidates = (await buildCandidates(studentId)).filter((c) => !existingKinds.has(c.kind));
  const remainingSlots = Math.max(0, CAP - existing.length);
  const toInsert = candidates.slice(0, remainingSlots);
  if (toInsert.length === 0) return;

  await db
    .insert(dailyTasksTable)
    .values(
      toInsert.map((c) => ({
        studentId,
        date,
        kind: c.kind,
        label: c.label,
        sublabel: c.sublabel ?? null,
        href: c.href,
        hot: c.hot,
        manual: c.manual,
        done: false,
        source: c.source,
      })),
    )
    .onConflictDoNothing();
}

export async function getTodayTasks(studentId: number) {
  await generateTodayTasks(studentId);
  const date = istToday();
  const rows = await db
    .select()
    .from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.studentId, studentId), eq(dailyTasksTable.date, date)))
    .orderBy(desc(dailyTasksTable.hot), dailyTasksTable.id);
  return { date, tasks: rows };
}

export async function completeTask(studentId: number, taskId: number, done: boolean) {
  const [task] = await db
    .update(dailyTasksTable)
    .set({ done, completedAt: done ? new Date() : null })
    .where(and(eq(dailyTasksTable.id, taskId), eq(dailyTasksTable.studentId, studentId)))
    .returning();
  if (!task) return null;
  const streakCount = await recomputeStreak(studentId);
  return { task, streakCount };
}

/** Consecutive IST days ending today or yesterday with >=1 completed task. Writes the students.streakCount cache and returns it. */
export async function recomputeStreak(studentId: number): Promise<number> {
  const doneDates = await db
    .selectDistinct({ date: dailyTasksTable.date })
    .from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.studentId, studentId), eq(dailyTasksTable.done, true)));
  const dateSet = new Set(doneDates.map((r) => r.date));

  let count = 0;
  const today = istToday();
  const yesterday = istYesterday();
  let cursor: Date;
  if (dateSet.has(today)) {
    cursor = new Date(`${today}T00:00:00Z`);
  } else if (dateSet.has(yesterday)) {
    cursor = new Date(`${yesterday}T00:00:00Z`);
  } else {
    await db.update(studentsTable).set({ streakCount: 0 }).where(eq(studentsTable.id, studentId));
    return 0;
  }

  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  await db.update(studentsTable).set({ streakCount: count }).where(eq(studentsTable.id, studentId));
  return count;
}

/** Writer for R6 — an interview report's "Add" button inserts a followup task for tomorrow. */
export async function addFollowupTask(studentId: number, label: string, sublabel: string | undefined, href: string) {
  const tomorrow = istDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [row] = await db
    .insert(dailyTasksTable)
    .values({
      studentId,
      date: tomorrow,
      kind: "followup",
      label,
      sublabel: sublabel ?? null,
      href,
      hot: false,
      manual: true,
      done: false,
      source: "report",
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

/** Called after a course-progress update; auto-completes today's course task if one exists. */
export async function autoCompleteTaskKind(studentId: number, kind: string): Promise<void> {
  const date = istToday();
  const [row] = await db
    .select({ id: dailyTasksTable.id, done: dailyTasksTable.done })
    .from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.studentId, studentId), eq(dailyTasksTable.date, date), eq(dailyTasksTable.kind, kind)))
    .limit(1);
  if (row && !row.done) {
    await completeTask(studentId, row.id, true);
  }
}

export function formatDailyTask(t: typeof dailyTasksTable.$inferSelect) {
  return {
    id: String(t.id),
    label: t.label,
    sublabel: t.sublabel ?? undefined,
    done: t.done,
    hot: t.hot,
    href: t.href,
    manual: t.manual,
  };
}
