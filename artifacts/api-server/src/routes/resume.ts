import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, studentResumesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { buildAtsReport, upgradeContent, type TemplateDensity } from "@workspace/resume-core";
import { GenerateResumeBody, UpdateResumeBody } from "@workspace/api-zod";
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

  const parsedBody = GenerateResumeBody.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: parsedBody.error.message });
  const body = parsedBody.data;

  const templateId = (body.templateId ?? "classic") as TemplateId;
  const jdText = (body.jdText ?? "").slice(0, 5000);
  const companyName = (body.companyName ?? "").slice(0, 200);
  const resumeName = body.resumeName?.slice(0, 200);
  const roleTitle = (body.roleTitle ?? "").slice(0, 200);
  const jobTags = (body.jobTags ?? []).slice(0, 8).map(t => t.slice(0, 40));
  const parentResumeId = body.parentResumeId ?? null;

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) return res.status(404).json({ error: "Student not found" });

  // Validate parentResumeId belongs to this student (if provided).
  if (parentResumeId) {
    const [parent] = await db.select({ id: studentResumesTable.id, studentId: studentResumesTable.studentId })
      .from(studentResumesTable).where(eq(studentResumesTable.id, parentResumeId)).limit(1);
    if (!parent || parent.studentId !== id) {
      return res.status(400).json({ error: "Invalid parentResumeId" });
    }
  }

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
        ? (stage, status, payload) => {
            res.write(`data: ${JSON.stringify({ stage, status, message: STAGE_COPY[stage] ?? stage, ...payload })}\n\n`);
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
        parentResumeId: parentResumeId ?? null,
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

  const parsedBody = UpdateResumeBody.safeParse(req.body);
  if (!parsedBody.success) return res.status(400).json({ error: parsedBody.error.message });
  const body = parsedBody.data;

  if (body.content === undefined && body.templateId === undefined) {
    return res.status(400).json({ error: "Provide content and/or templateId to update" });
  }
  const templateId = body.templateId as TemplateId | undefined;
  const incoming = (body.content ?? {}) as Record<string, unknown>;

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

// ─── POST /students/:id/resumes/:resumeId/share ───────────────────────────────
// Generates a public share slug for a resume (idempotent — re-calling returns
// the same slug). The slug is 8 random alphanumeric chars, unique index ensures
// no collision reaches the DB.

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

router.post("/students/:id/resumes/:resumeId/share", requireStudent({ allowGuest: false }), async (req, res) => {
  const id = Number(req.params.id);
  const resumeId = Number(req.params.resumeId);
  if (isNaN(id) || isNaN(resumeId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [resume] = await db.select().from(studentResumesTable).where(eq(studentResumesTable.id, resumeId)).limit(1);
    if (!resume || resume.studentId !== id) return res.status(404).json({ error: "Resume not found" });

    if (resume.shareSlug) return res.json({ slug: resume.shareSlug, views: resume.shareViews });

    // Retry once on the (very unlikely) slug collision.
    let slug = generateSlug();
    try {
      const [updated] = await db.update(studentResumesTable).set({ shareSlug: slug }).where(eq(studentResumesTable.id, resumeId)).returning({ shareSlug: studentResumesTable.shareSlug });
      slug = updated.shareSlug!;
    } catch {
      slug = generateSlug();
      const [updated] = await db.update(studentResumesTable).set({ shareSlug: slug }).where(eq(studentResumesTable.id, resumeId)).returning({ shareSlug: studentResumesTable.shareSlug });
      slug = updated.shareSlug!;
    }

    logEvent(id, "resume_shared", resume.name, {});
    return res.json({ slug, views: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create share link");
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /r/:slug ─────────────────────────────────────────────────────────────
// Public resume view — no auth required. Returns only the fields safe to expose.

router.get("/r/:slug", async (req, res) => {
  const { slug } = req.params;
  if (!slug || slug.length > 32) return res.status(404).json({ error: "Not found" });

  try {
    const [resume] = await db.select().from(studentResumesTable).where(eq(studentResumesTable.shareSlug, slug)).limit(1);
    if (!resume) return res.status(404).json({ error: "Not found" });

    // Only expose the fields the public page needs.
    return res.json({
      id: resume.id,
      name: resume.name,
      templateId: resume.templateId,
      content: resume.content,
      shareViews: resume.shareViews,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch public resume");
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /r/:slug/view ────────────────────────────────────────────────────────
// Increments the view counter. Fire-and-forget from the client.

router.post("/r/:slug/view", async (req, res) => {
  const { slug } = req.params;
  if (!slug || slug.length > 32) return res.status(404).json({ error: "Not found" });
  try {
    await db.update(studentResumesTable)
      .set({ shareViews: sql`${studentResumesTable.shareViews} + 1` })
      .where(eq(studentResumesTable.shareSlug, slug));
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: false });
  }
});

export default router;
