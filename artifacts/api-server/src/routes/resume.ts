import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, studentResumesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { anthropic, AI_MODEL } from "@workspace/integrations-anthropic-ai";
import { rlAiHeavy } from "../middlewares/rateLimit";
import { contextPack } from "../lib/contextPack";
import { extractJson } from "../lib/extractJson";
import { requireStudent } from "../middlewares/studentAuth";

const router = Router();

const FIELD_DEGREES: Record<string, string> = {
  "Computer Science": "B.Tech Computer Science & Engineering",
  "Electronics": "B.Tech Electronics & Communication Engineering",
  "Mechanical": "B.Tech Mechanical Engineering",
  "Civil": "B.Tech Civil Engineering",
  "Electrical": "B.Tech Electrical Engineering",
  "Information Technology": "B.Tech Information Technology",
  "Data Science": "B.Tech Data Science & AI",
};

function getDegree(field: string) {
  return FIELD_DEGREES[field] ?? `B.Tech ${field} Engineering`;
}

function getGradYear(year: number) {
  const current = new Date().getFullYear();
  return current + (4 - year);
}

// ─── GET /students/:id/resumes ────────────────────────────────────────────────

router.get("/students/:id/resumes", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const resumes = await db
      .select()
      .from(studentResumesTable)
      .where(eq(studentResumesTable.studentId, id))
      .orderBy(desc(studentResumesTable.createdAt));
    return res.json(resumes);
  } catch (err) {
    req.log.error({ err }, "Failed to list resumes");
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /students/:id/resumes ───────────────────────────────────────────────

router.post("/students/:id/resumes", requireStudent({ allowGuest: true }), rlAiHeavy, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const VALID_TEMPLATES = ["classic", "tech", "minimal"] as const;
  type TemplateId = typeof VALID_TEMPLATES[number];

  const rawBody = req.body as {
    templateId?: unknown;
    jdText?: unknown;
    companyName?: unknown;
    resumeName?: unknown;
  };

  const rawTemplate = typeof rawBody.templateId === "string" ? rawBody.templateId : "classic";
  if (!VALID_TEMPLATES.includes(rawTemplate as TemplateId)) {
    return res.status(400).json({ error: `Invalid templateId. Must be one of: ${VALID_TEMPLATES.join(", ")}` });
  }
  const templateId = rawTemplate as TemplateId;
  const jdText = typeof rawBody.jdText === "string" ? rawBody.jdText.slice(0, 5000) : "";
  const companyName = typeof rawBody.companyName === "string" ? rawBody.companyName.slice(0, 200) : "";
  const resumeName = typeof rawBody.resumeName === "string" ? rawBody.resumeName.slice(0, 200) : undefined;

  try {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .limit(1);

    if (!student) return res.status(404).json({ error: "Student not found" });

    const degree = getDegree(student.field);
    const gradYear = getGradYear(student.year);
    const startYear = gradYear - 4;

    const projects = Array.isArray(student.projects) ? student.projects : [];
    const certifications = Array.isArray(student.certifications) ? student.certifications : [];
    const skills = (student.skills as Record<string, number>) ?? {};
    const topSkillNames = Object.entries(skills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name]) => name);

    const githubStats = student.githubStats as {
      username?: string;
      topLanguages?: string[];
      topRepos?: { name: string; stars: number; language: string; description: string }[];
    } | null;

    const profileCtx = `
Student Profile:
- Name: ${student.name}
- Email: ${student.email}
- City: ${student.city}
- Phone: ${student.phone ?? "not provided"}
- GitHub: ${student.githubUrl ?? "not provided"}
- LinkedIn: ${student.linkedinUrl ?? "not provided"}
- Degree: ${degree} (${startYear}–${gradYear})
- College: ${student.college}, ${student.city}
- CGPA: ${student.cgpa ?? "not provided"}
- Field: ${student.field}
- Bio: ${student.bio ?? "none"}
- Skills (top): ${topSkillNames.length > 0 ? topSkillNames.join(", ") : "none added yet"}
- GitHub Languages: ${githubStats?.topLanguages?.join(", ") ?? "not analyzed"}
- GitHub Repos: ${githubStats?.topRepos?.map(r => `${r.name} (${r.language}, ${r.stars} stars)`).join("; ") ?? "not analyzed"}
- Projects (${projects.length}): ${projects.length > 0 ? JSON.stringify(projects) : "none added yet"}
- Certifications (${certifications.length}): ${certifications.length > 0 ? JSON.stringify(certifications) : "none added yet"}
- Dream Company: ${student.dreamCompany ?? "not set"}
- Target Package: ${student.targetPackage ?? "not set"}
`.trim();

    const jdSection = jdText
      ? `\nJob Description / Target Role:\n${jdText}\nCompany: ${companyName || "not specified"}\n`
      : "";

    const pack = await contextPack(id);

    const systemPrompt = `You are an expert ATS-optimized resume writer for Indian engineering students. 
Generate a structured resume JSON based ONLY on the student's actual profile data provided. 
DO NOT invent or fabricate any projects, skills, or experience that are not mentioned in the profile.
If the student has no projects, leave the projects array empty.
If the student has no certifications, leave the certifications array empty.
Use action verbs and quantify achievements where possible.
Tailor the content to the job description if one is provided.
Always respond with valid JSON only — no markdown, no explanation.`;

    const userPrompt = `${profileCtx}${jdSection}

${pack?.text ?? ""}

Generate a resume JSON with this exact structure:
{
  "summary": "2–3 sentence professional summary tailored to the role/field",
  "skillSections": [
    { "category": "Languages", "items": "comma-separated list" },
    { "category": "Frameworks & Tools", "items": "comma-separated list" }
  ],
  "projects": [
    {
      "title": "Project Name",
      "tech": "Tech Stack",
      "bullets": ["action verb + what + result/impact", "another bullet"]
    }
  ],
  "certifications": [
    { "name": "Cert Name", "issuer": "Issuer", "date": "Month Year" }
  ],
  "achievements": [
    "Achievement or award line item"
  ]
}

Rules:
- skillSections: derive from actual skills data and GitHub languages only
- projects: use ONLY projects from the profile. If none exist, return []
- certifications: use ONLY certifications from the profile. If none exist, return []  
- achievements: include things like college rank, certifications completed, GitHub contributions, KodeTalent activity
- summary: must mention their actual college, field, and real skills
- Tailor everything to the provided job description / company if given`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";
    let generatedContent: {
      summary: string;
      skillSections: { category: string; items: string }[];
      projects: { title: string; tech: string; bullets: string[] }[];
      certifications: { name: string; issuer: string; date?: string }[];
      achievements: string[];
    };
    try {
      generatedContent = extractJson(rawText);
    } catch {
      req.log.error({ rawText }, "AI did not return valid JSON");
      return res.status(500).json({ error: "Failed to generate resume content" });
    }

    const fullContent = {
      name: student.name,
      email: student.email,
      phone: student.phone ?? null,
      city: student.city,
      githubUrl: student.githubUrl ?? null,
      linkedinUrl: student.linkedinUrl ?? null,
      portfolioUrl: student.portfolioUrl ?? null,
      degree,
      college: student.college,
      startYear,
      gradYear,
      cgpa: student.cgpa ?? null,
      ...generatedContent,
    };

    const name =
      resumeName?.trim() ||
      (companyName ? `${companyName} Resume` : `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Resume`);

    const [saved] = await db
      .insert(studentResumesTable)
      .values({
        studentId: id,
        name,
        templateId,
        jdText: jdText || null,
        companyName: companyName || null,
        content: fullContent,
      })
      .returning();

    return res.status(201).json(saved);
  } catch (err) {
    req.log.error({ err }, "Failed to generate resume");
    return res.status(500).json({ error: "Failed to generate resume" });
  }
});

// ─── PATCH /students/:id/resumes/:resumeId ────────────────────────────────────

router.patch("/students/:id/resumes/:resumeId", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const resumeId = Number(req.params.resumeId);
  if (isNaN(id) || isNaN(resumeId)) return res.status(400).json({ error: "Invalid id" });

  const rawBody = req.body as { content?: unknown };

  if (!rawBody.content || typeof rawBody.content !== "object" || Array.isArray(rawBody.content)) {
    return res.status(400).json({ error: "content must be an object" });
  }

  const incoming = rawBody.content as Record<string, unknown>;

  if ("summary" in incoming && typeof incoming.summary !== "string") {
    return res.status(400).json({ error: "content.summary must be a string" });
  }

  if ("skillSections" in incoming) {
    if (!Array.isArray(incoming.skillSections)) {
      return res.status(400).json({ error: "content.skillSections must be an array" });
    }
    for (const s of incoming.skillSections as unknown[]) {
      if (typeof s !== "object" || s === null || Array.isArray(s)) {
        return res.status(400).json({ error: "Each skillSection must be an object" });
      }
      const section = s as Record<string, unknown>;
      if (typeof section.category !== "string" || typeof section.items !== "string") {
        return res.status(400).json({ error: "Each skillSection must have string category and items" });
      }
    }
  }

  if ("projects" in incoming) {
    if (!Array.isArray(incoming.projects)) {
      return res.status(400).json({ error: "content.projects must be an array" });
    }
    for (const p of incoming.projects as unknown[]) {
      if (typeof p !== "object" || p === null || Array.isArray(p)) {
        return res.status(400).json({ error: "Each project must be an object" });
      }
      const proj = p as Record<string, unknown>;
      if (typeof proj.title !== "string" || typeof proj.tech !== "string") {
        return res.status(400).json({ error: "Each project must have string title and tech" });
      }
      if (!Array.isArray(proj.bullets) || (proj.bullets as unknown[]).some(b => typeof b !== "string")) {
        return res.status(400).json({ error: "Each project.bullets must be an array of strings" });
      }
    }
  }

  if ("certifications" in incoming) {
    if (!Array.isArray(incoming.certifications)) {
      return res.status(400).json({ error: "content.certifications must be an array" });
    }
    for (const c of incoming.certifications as unknown[]) {
      if (typeof c !== "object" || c === null || Array.isArray(c)) {
        return res.status(400).json({ error: "Each certification must be an object" });
      }
      const cert = c as Record<string, unknown>;
      if (typeof cert.name !== "string" || typeof cert.issuer !== "string") {
        return res.status(400).json({ error: "Each certification must have string name and issuer" });
      }
      if ("date" in cert && cert.date !== undefined && typeof cert.date !== "string") {
        return res.status(400).json({ error: "certification.date must be a string if provided" });
      }
    }
  }

  if ("achievements" in incoming) {
    if (!Array.isArray(incoming.achievements) || (incoming.achievements as unknown[]).some(a => typeof a !== "string")) {
      return res.status(400).json({ error: "content.achievements must be an array of strings" });
    }
  }

  try {
    const [resume] = await db
      .select()
      .from(studentResumesTable)
      .where(eq(studentResumesTable.id, resumeId))
      .limit(1);

    if (!resume || resume.studentId !== id) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const existingContent = (resume.content ?? {}) as Record<string, unknown>;

    const allowedKeys = ["summary", "skillSections", "projects", "certifications", "achievements"] as const;
    const patchedFields: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in incoming) {
        patchedFields[key] = incoming[key];
      }
    }

    const updatedContent = { ...existingContent, ...patchedFields };

    const [updated] = await db
      .update(studentResumesTable)
      .set({ content: updatedContent })
      .where(eq(studentResumesTable.id, resumeId))
      .returning();

    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update resume");
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /students/:id/resumes/:resumeId ───────────────────────────────────

router.delete("/students/:id/resumes/:resumeId", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const resumeId = Number(req.params.resumeId);
  if (isNaN(id) || isNaN(resumeId)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [resume] = await db
      .select()
      .from(studentResumesTable)
      .where(eq(studentResumesTable.id, resumeId))
      .limit(1);

    if (!resume || resume.studentId !== id) {
      return res.status(404).json({ error: "Resume not found" });
    }

    await db.delete(studentResumesTable).where(eq(studentResumesTable.id, resumeId));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete resume");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
