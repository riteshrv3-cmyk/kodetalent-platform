import { Router } from "express";
import { db } from "@workspace/db";
import { studentActivityLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /students/:id/activity-log
router.get("/students/:id/activity-log", async (req, res) => {
  const studentId = Number(req.params.id);
  if (isNaN(studentId)) return res.status(400).json({ error: "Invalid id" });
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  try {
    const logs = await db
      .select()
      .from(studentActivityLogTable)
      .where(eq(studentActivityLogTable.studentId, studentId))
      .orderBy(desc(studentActivityLogTable.createdAt))
      .limit(limit);
    return res.json(
      logs.map(l => ({
        id: l.id,
        action: l.action,
        description: l.description,
        xpAmount: l.xpAmount,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get activity log");
    return res.status(500).json({ error: "Failed to get activity log" });
  }
});

export default router;
