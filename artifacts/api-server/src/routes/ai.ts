import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, questsTable, studentQuestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AnalyzeGithubBody, GenerateRoadmapBody } from "@workspace/api-zod";
import { rlAiHeavy, rlAiMedium } from "../middlewares/rateLimit";

const router = Router();

// POST /ai/analyze-github
router.post("/ai/analyze-github", rlAiMedium, async (req, res) => {
  const parsed = AnalyzeGithubBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { githubUrl, studentId } = parsed.data;

  try {
    const username = githubUrl.replace(/\/$/, "").split("/").pop() || "";
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=10&sort=updated`);
    let reposText = "No repos found";
    if (reposRes.ok) {
      const repos = await reposRes.json() as Array<{ name: string; language: string; description: string }>;
      reposText = repos.map(r => `${r.name} (${r.language || "unknown"}): ${r.description || "no description"}`).join("\n");
    }

    const prompt = `Analyze this GitHub profile and extract skill scores for a student:
GitHub username: ${username}
Repositories:
${reposText}

Return a JSON object (no markdown) with skill names as keys and scores (0-100) as values:
{
  "Python": 65,
  "JavaScript": 45,
  "React": 30,
  "DSA": 20,
  "Git": 70
}
Include only skills you can actually infer from the repos. Include Git as a base skill.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "{}";
    const skills = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

    // Update student skills
    await db.update(studentsTable).set({ skills }).where(eq(studentsTable.id, studentId));

    return res.json({ skills });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze github");
    return res.status(500).json({ error: "Failed to analyze GitHub" });
  }
});

// POST /ai/generate-roadmap
router.post("/ai/generate-roadmap", rlAiHeavy, async (req, res) => {
  const parsed = GenerateRoadmapBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { year, field } = parsed.data;

  try {
    // Check if quests already exist for this field
    const existingQuests = await db.select().from(questsTable)
      .where(eq(questsTable.field, field));

    if (existingQuests.length > 0) {
      return res.json({
        milestones: existingQuests.map(q => ({
          title: q.title,
          description: q.description,
          year: q.year,
          order: q.id,
          whyItMatters: q.whyItMatters,
          howToDoIt: q.howToDoIt,
          estimatedMinutes: q.minutes,
        })),
      });
    }

    const prompt = `Generate a complete 4-year career roadmap for an Indian engineering student in ${field}.
Create milestones for years 1-4. Focus on practical skills for Indian campus placements.

Return ONLY a JSON array (no markdown):
[
  {
    "title": "Learn Python Basics",
    "description": "Master Python fundamentals: syntax, data types, functions, OOP",
    "year": 1,
    "order": 1,
    "whyItMatters": "Python is the most-asked language in campus placements and internships",
    "howToDoIt": "Follow Python.org tutorial, practice 30 problems on LeetCode",
    "estimatedMinutes": 180
  }
]
Generate 5-7 milestones per year (years 1-4), 20-28 total. Make them specific to ${field}.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "[]";
    const milestones: Array<{
      title: string;
      description: string;
      year: number;
      order: number;
      whyItMatters: string;
      howToDoIt: string;
      estimatedMinutes: number;
    }> = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

    // Insert quests into DB
    for (const m of milestones) {
      await db.insert(questsTable).values({
        title: m.title,
        description: m.description,
        field,
        year: m.year,
        xpReward: 50 + (m.year - 1) * 10,
        minutes: m.estimatedMinutes || 60,
        whyItMatters: m.whyItMatters || "",
        howToDoIt: m.howToDoIt || "",
      });
    }

    return res.json({ milestones });
  } catch (err) {
    req.log.error({ err }, "Failed to generate roadmap");
    return res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

export default router;
