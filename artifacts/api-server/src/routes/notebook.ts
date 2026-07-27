import { Router } from "express";
import { db, studentActivityLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireStudent } from "../middlewares/studentAuth";

const router = Router();

const MILESTONE_ACTIONS = new Set(["interview_completed", "resume_generated", "all_tasks_done", "course_progress"]);

function isoWeekKey(date: Date): string {
  // Thursday-anchored ISO week, matching the ISO-8601 week-numbering standard.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// GET /students/:id/notebook — Kit's observed-moments timeline, grouped by ISO week (newest first).
router.get("/students/:id/notebook", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const rows = await db
      .select()
      .from(studentActivityLogTable)
      .where(eq(studentActivityLogTable.studentId, id))
      .orderBy(desc(studentActivityLogTable.createdAt))
      .limit(200);

    const weeks = new Map<string, { events: typeof rows; tasksDone: number; interviews: number; applications: number }>();
    for (const row of rows) {
      const key = isoWeekKey(row.createdAt);
      if (!weeks.has(key)) weeks.set(key, { events: [], tasksDone: 0, interviews: 0, applications: 0 });
      const bucket = weeks.get(key)!;
      bucket.events.push(row);
      if (row.action === "task_completed") bucket.tasksDone++;
      if (row.action === "interview_completed" || row.action === "test_completed") bucket.interviews++;
      if (row.action === "application_added") bucket.applications++;
    }

    const grouped = [...weeks.entries()].map(([weekKey, bucket]) => ({
      weekKey,
      summary: { tasksDone: bucket.tasksDone, practiceSessionsDone: bucket.interviews, applicationsAdded: bucket.applications },
      events: bucket.events.map((e) => ({
        action: e.action,
        description: e.description,
        date: e.createdAt.toISOString().slice(0, 10),
        milestone: MILESTONE_ACTIONS.has(e.action),
      })),
    }));

    return res.json({ weeks: grouped });
  } catch (err) {
    req.log.error({ err }, "Failed to load notebook");
    return res.status(500).json({ error: "Failed to load notebook" });
  }
});

export default router;
