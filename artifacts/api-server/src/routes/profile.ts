import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { rlAiHeavy, rlAiMedium } from "../middlewares/rateLimit";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeProfileStrength(s: typeof studentsTable.$inferSelect): number {
  let score = 0;
  if (s.githubUrl) score += 10;
  if (s.linkedinUrl) score += 15;
  if (s.portfolioUrl) score += 5;
  if (s.phone) score += 5;
  if (s.bio && s.bio.length > 20) score += 10;
  const projects = Array.isArray(s.projects) ? s.projects : [];
  if (projects.length >= 1) score += 20;
  if (projects.length >= 3) score += 5;
  const certs = Array.isArray(s.certifications) ? s.certifications : [];
  if (certs.length >= 1) score += 10;
  const locs = Array.isArray(s.preferredLocations) ? s.preferredLocations : [];
  if (locs.length > 0) score += 5;
  if (s.expectedSalary) score += 5;
  if (s.githubStats) score += 5;
  if (s.linkedinData) score += 5;
  return Math.min(score, 100);
}

function computeCommitmentScore(s: typeof studentsTable.$inferSelect): number {
  const xpScore = Math.min((s.xp / 25), 40);
  const streakScore = Math.min(s.streakCount * 3, 30);
  const overallScore = Math.round((s.overallScore || 0) * 0.3);
  return Math.min(Math.round(xpScore + streakScore + overallScore), 100);
}

// ─── GET /students/:id/full-profile ──────────────────────────────────────────

router.get("/students/:id/full-profile", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Not found" });
    const profileStrength = computeProfileStrength(student);
    const commitmentScore = computeCommitmentScore(student);
    await db.update(studentsTable)
      .set({ profileStrength, commitmentScore })
      .where(eq(studentsTable.id, id));
    return res.json({ ...student, profileStrength, commitmentScore });
  } catch (err) {
    req.log.error({ err }, "Failed to get full profile");
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /students/:id/profile ─────────────────────────────────────────────

const ALLOWED_FIELDS = [
  "githubUrl", "linkedinUrl", "portfolioUrl", "phone", "bio",
  "cgpa", "targetPackage", "dreamCompany",
  "projects", "certifications",
  "openToWork", "workMode", "preferredLocations", "expectedSalary",
] as const;

router.patch("/students/:id/profile", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    await db.update(studentsTable).set(updates).where(eq(studentsTable.id, id));
    const [updated] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    const profileStrength = computeProfileStrength(updated);
    const commitmentScore = computeCommitmentScore(updated);
    await db.update(studentsTable).set({ profileStrength, commitmentScore }).where(eq(studentsTable.id, id));
    return res.json({ ok: true, profileStrength, commitmentScore });
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /students/:id/analyze-github ───────────────────────────────────────

router.post("/students/:id/analyze-github", rlAiHeavy, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { githubUrl } = req.body as { githubUrl: string };
  if (!githubUrl) return res.status(400).json({ error: "githubUrl required" });

  const match = githubUrl.match(/github\.com\/([^\/\?\s]+)/);
  if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });
  const username = match[1];

  try {
    const [userResp, reposResp] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, {
        headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "KodeTalent-App" },
      }),
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`, {
        headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "KodeTalent-App" },
      }),
    ]);

    if (!userResp.ok) return res.status(404).json({ error: "GitHub user not found" });

    const userData = await userResp.json() as Record<string, unknown>;
    const reposData = (await reposResp.json()) as Array<Record<string, unknown>>;

    const languageCount: Record<string, number> = {};
    if (Array.isArray(reposData)) {
      for (const repo of reposData) {
        if (repo.language && typeof repo.language === "string") {
          languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
        }
      }
    }
    const topLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    const topRepos = Array.isArray(reposData)
      ? reposData.slice(0, 4).map((r) => ({
          name: r.name as string,
          stars: r.stargazers_count as number,
          language: r.language as string,
          description: r.description as string,
        }))
      : [];

    const stats = {
      username,
      publicRepos: userData.public_repos as number || 0,
      followers: userData.followers as number || 0,
      bio: userData.bio as string || "",
      topLanguages,
      topRepos,
      analyzedAt: new Date().toISOString(),
    };

    await db.update(studentsTable)
      .set({ githubUrl, githubStats: stats })
      .where(eq(studentsTable.id, id));

    const [updated] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    const profileStrength = computeProfileStrength(updated);
    await db.update(studentsTable).set({ profileStrength }).where(eq(studentsTable.id, id));

    return res.json({ ...stats, profileStrength });
  } catch (err) {
    req.log.error({ err }, "GitHub analysis failed");
    return res.status(500).json({ error: "Failed to analyze GitHub profile" });
  }
});

// ─── POST /students/:id/analyze-linkedin ─────────────────────────────────────

router.post("/students/:id/analyze-linkedin", rlAiHeavy, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { linkedinUrl, headline, summary, skills: linkedinSkills, experience } = req.body as {
    linkedinUrl: string;
    headline?: string;
    summary?: string;
    skills?: string[];
    experience?: string;
  };
  if (!linkedinUrl) return res.status(400).json({ error: "linkedinUrl required" });

  try {
    const prompt = `You are a career advisor analyzing a student's LinkedIn profile for Indian tech recruiters.

LinkedIn URL: ${linkedinUrl}
${headline ? `Headline: ${headline}` : ""}
${summary ? `Summary: ${summary}` : ""}
${linkedinSkills?.length ? `Skills listed: ${linkedinSkills.join(", ")}` : ""}
${experience ? `Experience: ${experience}` : ""}

Return ONLY valid JSON with this structure:
{
  "strengthScore": <0-100 integer>,
  "profileTier": "strong|average|needs-work",
  "highlights": ["string", ...],
  "improvements": ["string", ...],
  "recruitersWillNotice": "one sentence about their strongest point",
  "analyzedAt": "${new Date().toISOString()}"
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0];
    if (raw.type !== "text") return res.status(500).json({ error: "AI error" });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw.text);
    } catch {
      const m = raw.text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { strengthScore: 50, profileTier: "average", highlights: [], improvements: [], recruitersWillNotice: "" };
    }

    const linkedinData = { ...parsed, linkedinUrl };
    await db.update(studentsTable)
      .set({ linkedinUrl, linkedinData })
      .where(eq(studentsTable.id, id));

    const [updated] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    const profileStrength = computeProfileStrength(updated);
    await db.update(studentsTable).set({ profileStrength }).where(eq(studentsTable.id, id));

    return res.json({ ...linkedinData, profileStrength });
  } catch (err) {
    req.log.error({ err }, "LinkedIn analysis failed");
    return res.status(500).json({ error: "Failed to analyze LinkedIn profile" });
  }
});

// ─── POST /students/:id/chat ─────────────────────────────────────────────────

router.post("/students/:id/chat", rlAiMedium, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { message } = req.body as { message: string };
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const profileCtx = `
Name: ${student.name}
College: ${student.college} (${student.city})
Field: ${student.field} | Year: ${student.year}
CGPA: ${student.cgpa || "not set"}
Bio: ${student.bio || "not set"}
GitHub: ${student.githubUrl || "not set"}
LinkedIn: ${student.linkedinUrl || "not set"}
Portfolio: ${student.portfolioUrl || "not set"}
Phone: ${student.phone || "not set"}
Projects (${(student.projects as unknown[])?.length ?? 0}): ${JSON.stringify(student.projects ?? [])}
Certifications (${(student.certifications as unknown[])?.length ?? 0}): ${JSON.stringify(student.certifications ?? [])}
Skills: ${JSON.stringify(student.skills ?? {})}
Work Mode: ${student.workMode || "not set"}
Preferred Locations: ${JSON.stringify(student.preferredLocations ?? [])}
Expected Salary: ${student.expectedSalary ? student.expectedSalary + " LPA" : "not set"}
Dream Company: ${student.dreamCompany || "not set"}
Profile Strength: ${student.profileStrength}/100
Overall Score: ${Math.round(student.overallScore)}/100
XP: ${student.xp} | Streak: ${student.streakCount} days
Open to Work: ${student.openToWork ? "Yes" : "No"}`.trim();

    const systemPrompt = `You are KodeTalent AI — a career companion for Indian engineering students navigating placement season.

CURRENT STUDENT PROFILE:
${profileCtx}

YOU CAN UPDATE THEIR PROFILE: When the student asks you to add/change profile info, include this block EXACTLY at the very end of your response (after your conversational reply):
___PROFILE_UPDATE___
{"bio":"...","workMode":"remote","preferredLocations":["Bangalore","Mumbai"],"expectedSalary":12}

VALID UPDATE FIELDS: bio, githubUrl, linkedinUrl, portfolioUrl, phone, cgpa, dreamCompany, workMode (remote/hybrid/in-office), preferredLocations (string array), expectedSalary (number in LPA), projects (array of {title,description,techStack:[],url}), certifications (array of {name,issuer,date,url})

RULES:
- Only include ___PROFILE_UPDATE___ when actually making a profile change — never for informational replies
- For projects/certs, include the COMPLETE new array (existing + new entries)
- Keep replies conversational and concise (2–4 sentences)
- Use Indian placement context: LPA not USD, mention FAANG/unicorns, campus/off-campus placements
- Be encouraging and specific to their background`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    // Parse and apply profile update if present
    let profileUpdated = false;
    const marker = "___PROFILE_UPDATE___";
    const markerIdx = fullResponse.indexOf(marker);
    if (markerIdx !== -1) {
      const jsonStr = fullResponse.slice(markerIdx + marker.length).trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const updates = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          const filtered: Record<string, unknown> = {};
          for (const key of ALLOWED_FIELDS) {
            if (updates[key] !== undefined) filtered[key] = updates[key];
          }
          if (Object.keys(filtered).length > 0) {
            await db.update(studentsTable).set(filtered).where(eq(studentsTable.id, id));
            const [updated] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
            const profileStrength = computeProfileStrength(updated);
            const commitmentScore = computeCommitmentScore(updated);
            await db.update(studentsTable).set({ profileStrength, commitmentScore }).where(eq(studentsTable.id, id));
            profileUpdated = true;
          }
        } catch { /* invalid JSON, skip */ }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, profileUpdated })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI chat failed");
    if (!res.headersSent) {
      return res.status(500).json({ error: "Server error" });
    }
    res.write(`data: ${JSON.stringify({ done: true, error: true })}\n\n`);
    res.end();
  }
});

// ─── GET /students (recruiter talent pool) ───────────────────────────────────

router.get("/talent-pool", async (req, res) => {
  try {
    const students = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        college: studentsTable.college,
        city: studentsTable.city,
        year: studentsTable.year,
        field: studentsTable.field,
        cgpa: studentsTable.cgpa,
        githubUrl: studentsTable.githubUrl,
        linkedinUrl: studentsTable.linkedinUrl,
        portfolioUrl: studentsTable.portfolioUrl,
        bio: studentsTable.bio,
        projects: studentsTable.projects,
        certifications: studentsTable.certifications,
        openToWork: studentsTable.openToWork,
        workMode: studentsTable.workMode,
        preferredLocations: studentsTable.preferredLocations,
        expectedSalary: studentsTable.expectedSalary,
        githubStats: studentsTable.githubStats,
        profileStrength: studentsTable.profileStrength,
        commitmentScore: studentsTable.commitmentScore,
        overallScore: studentsTable.overallScore,
        xp: studentsTable.xp,
        level: studentsTable.level,
        skills: studentsTable.skills,
        isPro: studentsTable.isPro,
      })
      .from(studentsTable)
      .where(eq(studentsTable.openToWork, true))
      .orderBy(studentsTable.profileStrength);
    return res.json(students);
  } catch (err) {
    req.log.error({ err }, "Failed to get talent pool");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
