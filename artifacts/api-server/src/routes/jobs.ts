import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, matchesTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

// GET /jobs
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await db.select().from(jobsTable).orderBy(jobsTable.id);
    return res.json(jobs.map(formatJob));
  } catch (err) {
    req.log.error({ err }, "Failed to list jobs");
    return res.status(500).json({ error: "Failed to list jobs" });
  }
});

// GET /students/:id/job-matches
router.get("/students/:id/job-matches", async (req, res) => {
  const studentId = Number(req.params.id);
  if (isNaN(studentId)) return res.status(400).json({ error: "Invalid id" });
  try {
    const matchRows = await db.select().from(matchesTable)
      .where(eq(matchesTable.studentId, studentId))
      .orderBy(matchesTable.matchScore);

    if (matchRows.length === 0) {
      // Auto-generate matches
      return await generateAndReturnMatches(req, res, studentId);
    }

    const jobIds = matchRows.map(m => m.jobId);
    const jobs = await db.select().from(jobsTable);
    const jobMap = new Map(jobs.map(j => [j.id, j]));

    const matches = matchRows.map((m, idx) => ({
      job: formatJob(jobMap.get(m.jobId)!),
      matchScore: Math.round(m.matchScore),
      matchReason: m.matchReason,
      isLocked: idx >= 3,
    }));

    return res.json(matches.sort((a, b) => b.matchScore - a.matchScore));
  } catch (err) {
    req.log.error({ err }, "Failed to get job matches");
    return res.status(500).json({ error: "Failed to get job matches" });
  }
});

// POST /students/:id/job-matches
router.post("/students/:id/job-matches", async (req, res) => {
  const studentId = Number(req.params.id);
  if (isNaN(studentId)) return res.status(400).json({ error: "Invalid id" });
  return await generateAndReturnMatches(req, res, studentId);
});

async function generateAndReturnMatches(req: any, res: any, studentId: number) {
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const jobs = await db.select().from(jobsTable);
    if (jobs.length === 0) return res.json([]);

    const skills = (student.skills as Record<string, number>) || {};
    const skillsText = Object.entries(skills).map(([k, v]) => `${k}: ${v}/100`).join(", ");

    const prompt = `You are a career counselor. Match this student with jobs and rate compatibility.

Student:
- Field: ${student.field}
- Year: ${student.year}
- Skills: ${skillsText}
- Overall Score: ${student.overallScore}/100

Jobs available:
${jobs.map(j => `ID ${j.id}: ${j.companyName} - ${j.role} (requires: ${(j.requiredSkills as string[]).join(", ")})`).join("\n")}

Return a JSON array (no markdown) matching ALL jobs:
[
  {
    "jobId": <number>,
    "matchScore": <number 40-98>,
    "matchReason": "<one short sentence explaining the match>"
  }
]`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "[]";
    const matchData: Array<{ jobId: number; matchScore: number; matchReason: string }> =
      JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

    // Delete existing matches
    await db.delete(matchesTable).where(eq(matchesTable.studentId, studentId));

    // Insert new matches
    for (const [idx, m] of matchData.entries()) {
      await db.insert(matchesTable).values({
        studentId,
        jobId: m.jobId,
        matchScore: m.matchScore,
        matchReason: m.matchReason,
        isLocked: idx >= 3 ? 1 : 0,
      });
    }

    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const result = matchData
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((m, idx) => ({
        job: formatJob(jobMap.get(m.jobId)!),
        matchScore: Math.round(m.matchScore),
        matchReason: m.matchReason,
        isLocked: idx >= 3,
      }));

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to generate job matches");
    return res.status(500).json({ error: "Failed to generate job matches" });
  }
}

function formatJob(j: typeof jobsTable.$inferSelect) {
  return {
    id: j.id,
    companyName: j.companyName,
    role: j.role,
    requiredSkills: (j.requiredSkills as string[]) || [],
    ctcMin: j.ctcMin,
    ctcMax: j.ctcMax,
    location: j.location,
    remote: j.remote,
  };
}

export default router;
