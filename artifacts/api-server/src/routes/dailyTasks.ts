import { Router } from "express";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStudent } from "../middlewares/studentAuth";
import { getTodayTasks, completeTask, addFollowupTask, autoCompleteTaskKind, formatDailyTask } from "../lib/dailyTasks";

const router = Router();

// GET /students/:id/today-tasks
router.get("/students/:id/today-tasks", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { date, tasks } = await getTodayTasks(id);
    const [student] = await db.select({ streakCount: studentsTable.streakCount }).from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    return res.json({ date, tasks: tasks.map(formatDailyTask), streakCount: student?.streakCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to load today's tasks");
    return res.status(500).json({ error: "Failed to load today's tasks" });
  }
});

// POST /students/:id/tasks/:taskId/complete
router.post("/students/:id/tasks/:taskId/complete", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid taskId" });
  try {
    const result = await completeTask(id, taskId, true);
    if (!result) return res.status(404).json({ error: "Task not found" });
    return res.json({ task: formatDailyTask(result.task), streakCount: result.streakCount });
  } catch (err) {
    req.log.error({ err }, "Failed to complete task");
    return res.status(500).json({ error: "Failed to complete task" });
  }
});

// POST /students/:id/tasks/:taskId/uncomplete
router.post("/students/:id/tasks/:taskId/uncomplete", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid taskId" });
  try {
    const result = await completeTask(id, taskId, false);
    if (!result) return res.status(404).json({ error: "Task not found" });
    return res.json({ task: formatDailyTask(result.task), streakCount: result.streakCount });
  } catch (err) {
    req.log.error({ err }, "Failed to uncomplete task");
    return res.status(500).json({ error: "Failed to uncomplete task" });
  }
});

// POST /students/:id/tasks — R6 writer, called by an interview report's "Add" button.
router.post("/students/:id/tasks", requireStudent(), async (req, res) => {
  const id = Number(req.params.id);
  const { label, sublabel, href } = req.body as { label?: string; sublabel?: string; href?: string };
  if (!label?.trim() || !href?.trim()) return res.status(400).json({ error: "label and href are required" });
  try {
    const row = await addFollowupTask(id, label.trim(), sublabel?.trim(), href.trim());
    if (!row) return res.status(200).json({ ok: true, alreadyExists: true });
    return res.status(201).json(formatDailyTask(row));
  } catch (err) {
    req.log.error({ err }, "Failed to add followup task");
    return res.status(500).json({ error: "Failed to add followup task" });
  }
});

// POST /students/:id/course-progress
router.post("/students/:id/course-progress", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const { subDomainId, subDomainName, completed, total } = req.body as {
    subDomainId?: string;
    subDomainName?: string;
    completed?: number;
    total?: number;
  };
  if (!subDomainId || !subDomainName || typeof completed !== "number" || typeof total !== "number") {
    return res.status(400).json({ error: "subDomainId, subDomainName, completed, total are required" });
  }
  try {
    await db
      .update(studentsTable)
      .set({ lastCourse: { subDomainId, subDomainName, completed, total, updatedAt: new Date().toISOString() } })
      .where(eq(studentsTable.id, id));
    if (completed >= total && total > 0) {
      await autoCompleteTaskKind(id, "course");
    }
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save course progress");
    return res.status(500).json({ error: "Failed to save course progress" });
  }
});

export default router;
