import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// GET /leaderboard/college?college=...
router.get("/leaderboard/college", async (req, res) => {
  const { college } = req.query;
  if (!college) return res.status(400).json({ error: "college query param required" });
  try {
    const students = await db.select().from(studentsTable)
      .where(eq(studentsTable.college, college as string))
      .orderBy(desc(studentsTable.overallScore));

    return res.json(students.map((s, idx) => ({
      rank: idx + 1,
      studentId: s.id,
      name: s.name,
      college: s.college,
      overallScore: s.overallScore,
      xp: s.xp,
      level: Math.max(1, Math.floor(s.xp / 500) + 1),
      streakCount: s.streakCount,
      isCurrentUser: false,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get college leaderboard");
    return res.status(500).json({ error: "Failed to get college leaderboard" });
  }
});

// GET /leaderboard/india
router.get("/leaderboard/india", async (req, res) => {
  try {
    const rows = await db
      .select({
        college: studentsTable.college,
        city: studentsTable.city,
        avgScore: sql<number>`AVG(${studentsTable.overallScore})`,
        studentCount: sql<number>`COUNT(*)`,
      })
      .from(studentsTable)
      .groupBy(studentsTable.college, studentsTable.city)
      .orderBy(desc(sql`AVG(${studentsTable.overallScore})`));

    return res.json(rows.map((r, idx) => ({
      rank: idx + 1,
      college: r.college,
      city: r.city,
      avgScore: Math.round(Number(r.avgScore)),
      studentCount: Number(r.studentCount),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get India leaderboard");
    return res.status(500).json({ error: "Failed to get India leaderboard" });
  }
});

export default router;
