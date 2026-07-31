import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, studentResumesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { buildAtsReport, upgradeContent, type TemplateDensity } from "@workspace/resume-core";
import { rlResumeGen } from "../middlewares/rateLimit";
import { requireStudent } from "../middlewares/studentAuth";
import { logEvent } from "../lib/events";
import { runResumePipeline } from "../lib/resume/pipeline";

const router = Router();

const VALID_TEMPLATES = ["ats", "classic", "tech", "minimal"] as const;
type TemplateId = typeof VALID_TEMPLATES[number];

// Mirrors artifacts/kodetalent/src/lib/resume-pdf/templates/*.ts — the server
// has no access to those client-only template configs (fonts/colors), but
// needs the density value for estimateLayout()'s densityFit critic axis.
// Keep this in sync if a template's density ever changes.
const TEMPLATE_DENSITY: Record<TemplateId, TemplateDensity> = {
  ats: "normal",
  classic: "airy",
  tech: "compact",
  minimal: "airy",
};

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

// Stage copy is how the student "feels" the reasoning happening — shown only over SSE.
const STAGE_COPY: Record<string, string> = {
  jd: "Reading the job description…",
  map: "Matching it against your real work…",
  draft: "Writing your bullets…",
  critic: "Running it through an ATS screen…",
};

router.post("/students/:id/resumes", requireStudent({ allowGuest: true }), rlResumeGen, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const rawBody = req.body as {
    templateId?: unknown;
    jdText?: unknown;
    companyName?: unknown;
    resumeName?: unknown;
    roleTitle?: unknown;
    jobTags?: unknown;
  };

  const rawTemplate = typeof rawBody.templateId === "string" ? rawBody.templateId : "classic";
  if (!VALID_TEMPLATES.includes(rawTemplate as TemplateId)) {
    return res.status(400).json({ error: `Invalid templateId. Must be one of: ${VALID_TEMPLATES.join(", ")}` });
  }
  const templateId = rawTemplate as TemplateId;
  const jdText = typeof rawBody.jdText === "string" ? rawBody.jdText.slice(0, 5000) : "";
  const companyName = typeof rawBody.companyName === "string" ? rawBody.companyName.slice(0, 200) : "";
  const resumeName = typeof rawBody.resumeName === "string" ? rawBody.resumeName.slice(0, 200) : undefined;
  const roleTitle = typeof rawBody.roleTitle === "string" ? rawBody.roleTitle.slice(0, 200) : "";
  const jobTags = Array.isArray(rawBody.jobTags)
    ? rawBody.jobTags.filter((t): t is string => typeof t === "string").slice(0, 8).map(t => t.slice(0, 40))
    : [];

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const isSSE = req.headers.accept === "text/event-stream";
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  if (isSSE) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
  }

  try {
    const { doc, generation, evidenceMap } = await runResumePipeline({
      student,
      jdText,
      roleTitle,
      jobTags,
      templateDensity: TEMPLATE_DENSITY[templateId],
      signal: controller.signal,
      onProgress: isSSE
        ? (stage, status) => {
            if (status === "start") res.write(`data: ${JSON.stringify({ stage, message: STAGE_COPY[stage] ?? stage })}\n\n`);
          }
        : undefined,
    });

    const name =
      resumeName?.trim() ||
      (companyName && roleTitle
        ? `${companyName} — ${roleTitle}`
        : companyName
          ? `${companyName} Resume`
          : `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Resume`);

    const [saved] = await db
      .insert(studentResumesTable)
      .values({
        studentId: id,
        name,
        templateId,
        jdText: jdText || null,
        companyName: companyName || null,
        roleTitle: roleTitle || null,
        jobTags,
        content: doc,
        atsScore: doc.atsMeta?.scorePct ?? null,
        atsReport: doc.atsMeta ?? null,
        evidenceMap,
        generation,
        schemaVersion: 2,
      })
      .returning();

    logEvent(id, "resume_generated", name, { templateId, degraded: generation.degraded });

    if (isSSE) {
      res.write(`data: ${JSON.stringify({ done: true, resume: saved })}\n\n`);
      res.end();
    } else {
      res.status(201).json(saved);
    }
  } catch (err) {
    if (controller.signal.aborted) {
      // Client disconnected mid-generation — nothing to send back, and the
      // aborted OpenAI call means we didn't pay for a response nobody reads.
      if (!res.writableEnded) res.end();
      return;
    }
    req.log.error({ err }, "Failed to generate resume");
    if (isSSE) {
      res.write(`data: ${JSON.stringify({ done: true, error: true })}\n\n`);
      res.end();
    } else if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate resume" });
    }
  }
  return;
});

// ─── PATCH /students/:id/resumes/:resumeId ────────────────────────────────────

router.patch("/students/:id/resumes/:resumeId", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const resumeId = Number(req.params.resumeId);
  if (isNaN(id) || isNaN(resumeId)) return res.status(400).json({ error: "Invalid id" });

  const rawBody = req.body as { content?: unknown; templateId?: unknown };

  const hasContent = rawBody.content !== undefined;
  if (hasContent && (typeof rawBody.content !== "object" || rawBody.content === null || Array.isArray(rawBody.content))) {
    return res.status(400).json({ error: "content must be an object" });
  }

  let templateId: TemplateId | undefined;
  if (rawBody.templateId !== undefined) {
    if (typeof rawBody.templateId !== "string" || !VALID_TEMPLATES.includes(rawBody.templateId as TemplateId)) {
      return res.status(400).json({ error: `templateId must be one of: ${VALID_TEMPLATES.join(", ")}` });
    }
    templateId = rawBody.templateId as TemplateId;
  }

  if (!hasContent && !templateId) {
    return res.status(400).json({ error: "Provide content and/or templateId to update" });
  }

  const incoming = (rawBody.content ?? {}) as Record<string, unknown>;

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

  if ("experience" in incoming) {
    if (!Array.isArray(incoming.experience)) {
      return res.status(400).json({ error: "content.experience must be an array" });
    }
    for (const e of incoming.experience as unknown[]) {
      if (typeof e !== "object" || e === null || Array.isArray(e)) {
        return res.status(400).json({ error: "Each experience entry must be an object" });
      }
      const exp = e as Record<string, unknown>;
      if (typeof exp.company !== "string" || typeof exp.role !== "string") {
        return res.status(400).json({ error: "Each experience entry must have string company and role" });
      }
      if ("period" in exp && exp.period !== undefined && typeof exp.period !== "string") {
        return res.status(400).json({ error: "experience.period must be a string if provided" });
      }
      if (!Array.isArray(exp.bullets) || (exp.bullets as unknown[]).some(b => typeof b !== "string")) {
        return res.status(400).json({ error: "Each experience.bullets must be an array of strings" });
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

    const allowedKeys = ["summary", "skillSections", "experience", "projects", "certifications", "achievements"] as const;
    const patchedFields: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in incoming) {
        patchedFields[key] = incoming[key];
      }
    }

    const updatedContent = { ...existingContent, ...patchedFields };

    // Recompute the deterministic ATS score against the edited content —
    // otherwise the score shown to the student goes stale the moment they
    // change a bullet or add a skill.
    const upgradedDoc = upgradeContent(updatedContent);
    const jobTags = Array.isArray(resume.jobTags) ? (resume.jobTags as unknown[]).filter((t): t is string => typeof t === "string") : [];
    const atsReport = buildAtsReport({ doc: upgradedDoc, jdText: resume.jdText ?? undefined, jobTags });

    const setFields: { content: Record<string, unknown>; templateId?: TemplateId; atsScore?: number | null; atsReport?: unknown } = {
      content: updatedContent,
      atsScore: atsReport?.scorePct ?? null,
      atsReport: atsReport ?? null,
    };
    if (templateId) setFields.templateId = templateId;

    const [updated] = await db
      .update(studentResumesTable)
      .set(setFields)
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
