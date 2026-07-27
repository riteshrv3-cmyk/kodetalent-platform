import {
  db,
  studentsTable,
  studentActivityLogTable,
  interviewSessionsTable,
  applicationsTable,
  dailyTasksTable,
} from "@workspace/db";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { istToday, istYesterday, GENERIC_SKILLS } from "./dailyTasks";
import type { EventAction } from "./events";

export interface Noticing {
  type: string;
  text: string;
  href: string;
  weight: number;
  gapFramed: boolean;
}

type NoticingHistory = { lastGapFramedDate?: string } & Partial<Record<string, string>>;

const SUPPRESS_DAYS = 3;
const GAP_FRAME_WINDOW_DAYS = 7;
const AVOIDANCE_DAYS = 14;
const STALE_APPLICATION_DAYS = 7;
const AVOIDANCE_ACTIONS: EventAction[] = ["task_completed", "interview_completed", "test_completed"];

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000);
}

function daysSince(dateIso: string, today: string): number {
  return daysBetween(today, dateIso.slice(0, 10));
}

/** Ranked deterministic "noticing" rules, zero LLM cost. Every rule has a day-one derivation from existing tables. */
export async function getNoticings(studentId: number, limit = 3): Promise<Noticing[]> {
  const today = istToday();
  const yesterday = istYesterday();

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!student) return [];

  const history = (student.noticingHistory as NoticingHistory) ?? {};
  const candidates: Noticing[] = [];

  // comeback — highest weight
  if (student.lastActiveDate) {
    const gap = daysSince(student.lastActiveDate, today);
    if (gap >= 3) {
      candidates.push({
        type: "comeback",
        text: `Welcome back — it's been ${gap} days. Pick up right where you left off?`,
        href: "/home",
        weight: 100,
        gapFramed: false,
      });
    }
  }

  // streak_risk — streak alive, today's tasks not yet done
  if (student.streakCount >= 3 && student.lastActiveDate === yesterday) {
    const todayTasks = await db
      .select({ done: dailyTasksTable.done })
      .from(dailyTasksTable)
      .where(and(eq(dailyTasksTable.studentId, studentId), eq(dailyTasksTable.date, today)));
    const anyDone = todayTasks.some((t) => t.done);
    if (!anyDone) {
      candidates.push({
        type: "streak_risk",
        text: `Your ${student.streakCount}-day streak is waiting on today — one task keeps it alive.`,
        href: "/home",
        weight: 90,
        gapFramed: true,
      });
    }
  }

  // milestone — streak or course
  if ([7, 14, 30].includes(student.streakCount)) {
    candidates.push({
      type: "milestone",
      text: `${student.streakCount} days in a row — that's a real streak.`,
      href: "/home",
      weight: 80,
      gapFramed: false,
    });
  }
  const lastCourse = student.lastCourse as { subDomainName: string; completed: number; total: number } | null;
  if (lastCourse && lastCourse.total > 0) {
    const pct = Math.round((lastCourse.completed / lastCourse.total) * 100);
    if (pct === 100) {
      candidates.push({
        type: "milestone",
        text: `You finished ${lastCourse.subDomainName} — nice work.`,
        href: "/opportunities/course",
        weight: 78,
        gapFramed: false,
      });
    }
  }

  // score_delta
  const recentSessions = await db
    .select({ overallScore: interviewSessionsTable.overallScore, createdAt: interviewSessionsTable.createdAt })
    .from(interviewSessionsTable)
    .where(and(eq(interviewSessionsTable.studentId, studentId), eq(interviewSessionsTable.completed, true)))
    .orderBy(desc(interviewSessionsTable.createdAt))
    .limit(2);
  const scores = recentSessions.map((s) => s.overallScore).filter((s): s is number => typeof s === "number");
  if (scores.length >= 2) {
    const delta = scores[0] - scores[1];
    if (Math.abs(delta) >= 3) {
      candidates.push({
        type: "score_delta",
        text: delta > 0
          ? `Your last mock scored ${scores[0]} — up ${delta} from before. Keep going.`
          : `Your last mock scored ${scores[0]}, down ${Math.abs(delta)}. Want another shot today?`,
        href: "/practice",
        weight: 70,
        gapFramed: false,
      });
    }
  }

  // avoidance
  const skills = (student.skills as Record<string, number>) ?? {};
  const nonGeneric = Object.entries(skills).filter(([name]) => !GENERIC_SKILLS.has(name.toLowerCase().trim()));
  if (nonGeneric.length > 0) {
    const [weakestName] = nonGeneric.sort(([, a], [, b]) => a - b)[0];
    const sinceDate = new Date(Date.now() - AVOIDANCE_DAYS * 86_400_000).toISOString();
    const recentEvents = await db
      .select({ description: studentActivityLogTable.description })
      .from(studentActivityLogTable)
      .where(
        and(
          eq(studentActivityLogTable.studentId, studentId),
          inArray(studentActivityLogTable.action, AVOIDANCE_ACTIONS),
          gte(studentActivityLogTable.createdAt, new Date(sinceDate)),
        ),
      );
    const touched = recentEvents.some((e) => e.description.toLowerCase().includes(weakestName.toLowerCase()));
    if (!touched) {
      candidates.push({
        type: "avoidance",
        text: `You haven't practiced ${weakestName} in a while — 15 minutes today?`,
        href: "/practice",
        weight: 50,
        gapFramed: true,
      });
    }
  }

  // stale_application
  const [staleApp] = await db
    .select({ company: applicationsTable.company, statusUpdatedAt: applicationsTable.statusUpdatedAt, status: applicationsTable.status })
    .from(applicationsTable)
    .where(eq(applicationsTable.studentId, studentId))
    .orderBy(applicationsTable.statusUpdatedAt)
    .limit(1);
  if (staleApp) {
    const staleDays = Math.round((Date.now() - staleApp.statusUpdatedAt.getTime()) / 86_400_000);
    if (staleDays >= STALE_APPLICATION_DAYS) {
      candidates.push({
        type: "stale_application",
        text: `${staleApp.company ?? "Your application"} has sat at "${staleApp.status}" for ${staleDays} days — worth a follow-up?`,
        href: "/pipeline",
        weight: 40,
        gapFramed: true,
      });
    }
  }

  // fallback progress_note
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const thisWeekTasks = await db
    .select({ done: dailyTasksTable.done })
    .from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.studentId, studentId), gte(dailyTasksTable.date, sevenDaysAgo)));
  const doneCount = thisWeekTasks.filter((t) => t.done).length;
  if (doneCount > 0) {
    candidates.push({
      type: "progress_note",
      text: `You've completed ${doneCount} task${doneCount === 1 ? "" : "s"} this week — steady progress.`,
      href: "/home",
      weight: 10,
      gapFramed: false,
    });
  }

  // Suppress: same type not repeated within SUPPRESS_DAYS; gap-framed collectively capped at one per GAP_FRAME_WINDOW_DAYS.
  const filtered = candidates.filter((c) => {
    const lastShown = history[c.type];
    if (lastShown && daysSince(lastShown, today) < SUPPRESS_DAYS) return false;
    if (c.gapFramed && history.lastGapFramedDate && daysSince(history.lastGapFramedDate, today) < GAP_FRAME_WINDOW_DAYS) return false;
    return true;
  });

  return filtered.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

/** Returns today's top noticing, or a neutral goal-tied greeting (or null) when no rule fires. Persists shown-state for suppression. */
export async function getTopNoticing(studentId: number): Promise<Noticing | null> {
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!student) return null;

  const noticings = await getNoticings(studentId, 1);
  const top = noticings[0] ?? null;

  const today = istToday();
  const history = ((student.noticingHistory as NoticingHistory) ?? {}) as NoticingHistory;

  if (top) {
    const nextHistory: NoticingHistory = { ...history, [top.type]: today };
    if (top.gapFramed) nextHistory.lastGapFramedDate = today;
    await db.update(studentsTable).set({ noticingHistory: nextHistory }).where(eq(studentsTable.id, studentId));
    return top;
  }

  if (student.targetRole) {
    return {
      type: "progress_note",
      text: `Working toward ${student.targetRole} — start with today's checklist.`,
      href: "/home",
      weight: 0,
      gapFramed: false,
    };
  }

  return null;
}
