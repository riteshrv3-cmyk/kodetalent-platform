import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, questsTable, studentQuestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AnalyzeGithubBody, GenerateRoadmapBody } from "@workspace/api-zod";
import { rlAiHeavy, rlAiMedium } from "../middlewares/rateLimit";
import { cacheGetOrSet } from "../lib/aiCache";

const router = Router();

// POST /ai/jd-gap — given a job's title/company/tags, computes fit vs the student
router.post("/ai/jd-gap", rlAiMedium, async (req, res) => {
  const { studentId, jobTitle, company, tags, source } = req.body || {};
  if (!studentId || !jobTitle) {
    return res.status(400).json({ error: "studentId and jobTitle are required" });
  }
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, Number(studentId))).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const skills = (student.skills as Record<string, number>) || {};
    const skillEntries = Object.entries(skills).map(([k, v]) => `${k}:${Math.round(v)}`).sort();
    const tagList: string[] = Array.isArray(tags) ? tags.slice(0, 12) : [];

    const { value, cached } = await cacheGetOrSet<{
      fitScore: number;
      summary: string;
      have: string[];
      missing: string[];
      plan: Array<{ title: string; hours: number; action: string }>;
    }>(
      {
        namespace: "jd-gap",
        keyParts: [skillEntries, jobTitle, company || "", tagList, student.field, student.year],
        ttlSeconds: 60 * 60 * 24 * 7, // 7 days
      },
      async () => {
        const prompt = `You are a career coach for an Indian engineering student. Analyse fit for this opening.

STUDENT
- Name: ${student.name}
- Field: ${student.field} · Year ${student.year}
- Skills (out of 100): ${skillEntries.join(", ") || "(no scored skills yet)"}

JOB
- Role: ${jobTitle}
- Company: ${company || "Unknown"}
- Skill tags from listing: ${tagList.join(", ") || "(none)"}
- Source: ${source || "n/a"}

Return STRICT JSON (no markdown) with this exact shape:
{
  "fitScore": <0-100 honest readiness for this role today>,
  "summary": "<one punchy sentence, max 120 chars>",
  "have": ["<skill student already has, max 5>"],
  "missing": ["<skill the student must add to land this role, max 5>"],
  "plan": [
    { "title": "<concrete topic to learn>", "hours": <int 4-40>, "action": "<one-line concrete next step>" }
  ]
}
Plan should have 2-3 items, totalling under 60 hours, focused on the highest-leverage gaps. Be specific and Indian-context aware. Be brutally honest with fitScore — do not inflate.`;

        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        });
        const content = message.content[0];
        const text = content.type === "text" ? content.text : "{}";
        const stripped = text.replace(/```json\n?|\n?```/g, "").trim();
        // Extract first balanced JSON object — Claude sometimes adds prose after
        const start = stripped.indexOf("{");
        let depth = 0, end = -1, inStr = false, esc = false;
        for (let i = start; i < stripped.length; i++) {
          const ch = stripped[i];
          if (esc) { esc = false; continue; }
          if (ch === "\\") { esc = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (ch === "{") depth++;
          else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        const jsonStr = end > 0 ? stripped.slice(start, end) : stripped;
        const parsed = JSON.parse(jsonStr);
        return {
          fitScore: Math.max(0, Math.min(100, Number(parsed.fitScore) || 0)),
          summary: String(parsed.summary || "").slice(0, 200),
          have: Array.isArray(parsed.have) ? parsed.have.slice(0, 5).map(String) : [],
          missing: Array.isArray(parsed.missing) ? parsed.missing.slice(0, 5).map(String) : [],
          plan: Array.isArray(parsed.plan) ? parsed.plan.slice(0, 4).map((p: any) => ({
            title: String(p.title || "").slice(0, 80),
            hours: Math.max(1, Math.min(60, Number(p.hours) || 8)),
            action: String(p.action || "").slice(0, 160),
          })) : [],
        };
      }
    );

    res.setHeader("X-Cache", cached ? "HIT" : "MISS");
    return res.json(value);
  } catch (err) {
    req.log.error({ err }, "Failed JD gap analysis");
    return res.status(500).json({ error: "Failed to analyse fit" });
  }
});

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
