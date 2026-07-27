import { Router } from "express";
import { db, studentsTable, applicationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { anthropic, AI_MODEL } from "@workspace/integrations-anthropic-ai";
import { rlAiHeavy } from "../middlewares/rateLimit";
import { requireStudent } from "../middlewares/studentAuth";
import { contextPack } from "../lib/contextPack";
import { extractJson } from "../lib/extractJson";
import { cacheGetOrSet } from "../lib/aiCache";
import { clamp, normalizeBranch, computeEligibilityGates } from "../lib/driveAnalysis";
import { logEvent } from "../lib/events";

const router = Router();

interface PipelineAnalysis {
  company: string | null;
  role: string | null;
  ctc: string | null;
  batch: string | null;
  branches: string[];
  cgpaCutoff: number | null;
  applyLink: string | null;
  scamScore: number;
  scamVerdict: "safe" | "risky" | "scam";
  scamReasons: string[];
  fitScore: number;
  fitSummary: string;
  have: string[];
  missing: string[];
  suggestedPrep: Array<{ title: string; hours: number; action: string }>;
}

const VALID_STATUSES = new Set(["viewed", "clicked_apply", "heard_back", "interview", "offer", "rejected"]);

// POST /students/:id/pipeline/analyze — paste any job/drive text, get scam check + eligibility + fit + prep in one call.
router.post("/students/:id/pipeline/analyze", requireStudent({ allowGuest: true }), rlAiHeavy, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { rawText } = req.body as { rawText?: string };
  if (!rawText?.trim() || rawText.trim().length < 5 || rawText.trim().length > 8000) {
    return res.status(400).json({ error: "Paste the job or drive text (5-8000 characters)" });
  }
  const text = rawText.trim();

  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const skills = (student.skills as Record<string, number>) || {};
    const skillEntries = Object.entries(skills).map(([k, v]) => `${k}:${Math.round(v)}`).sort();
    const pack = await contextPack(id);

    const { value: parsed } = await cacheGetOrSet<PipelineAnalysis>(
      {
        namespace: "pipeline-analyze",
        keyParts: [text, skillEntries, student.targetRole ?? "", student.field, student.year],
        ttlSeconds: 60 * 60 * 24 * 7,
      },
      async () => {
        const prompt = `You analyze a pasted job posting or placement drive message for an Indian engineering student. Return ONLY valid JSON, nothing else.

${pack?.text ?? ""}

STUDENT SKILLS (out of 100): ${skillEntries.join(", ") || "(no scored skills yet)"}

PASTED TEXT:
"""
${text}
"""

Extract fields. Use null when not mentioned.

SCAM SIGNALS (weigh into scamScore 0-100, higher = more scammy): registration/training/deposit fee requested (+40), free-email application form not on company domain (+20), unrealistic CTC for a fresher role (+25), vague company or suspicious link (+15), urgency language with no official source (+10), personal docs/Aadhaar requested upfront (+30), WhatsApp-only contact (+15), "guaranteed job"/"100% placement" (+15).
LEGIT SIGNALS (subtract): recognized company (-20), official company-domain apply link (-15), realistic CTC (-10), specific batch/branch eligibility listed (-5).
scamVerdict: 0-30 "safe", 31-65 "risky", 66-100 "scam".
scamReasons: 2-3 short Hinglish bullets, max 10 words each.

branches: array like ["cse","ece"] or ["all"]. cgpaCutoff: number or null. batch: string like "2026" or null.

fitScore: 0-100 honest readiness for this role today, based on the student's actual skills above — do not inflate.
fitSummary: one sentence, max 120 chars.
have: up to 5 skills the student already has that match this role.
missing: up to 5 skills they'd need to add.
suggestedPrep: 2-3 items, each {"title","hours" (int 4-40),"action"}, focused on the highest-leverage gaps for THIS role.

Return EXACTLY this JSON shape:
{
  "company": string|null, "role": string|null, "ctc": string|null, "applyLink": string|null,
  "batch": string|null, "branches": string[], "cgpaCutoff": number|null,
  "scamScore": number, "scamVerdict": "safe"|"risky"|"scam", "scamReasons": string[],
  "fitScore": number, "fitSummary": string, "have": string[], "missing": string[],
  "suggestedPrep": [{"title": string, "hours": number, "action": string}]
}`;

        const message = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        });
        const content = message.content[0];
        const raw = content.type === "text" ? content.text : "{}";
        return extractJson<PipelineAnalysis>(raw);
      },
    );

    // Deterministic re-derivation — never trust the LLM's own verdict/gates.
    parsed.scamScore = clamp(Math.round(parsed.scamScore ?? 50), 0, 100);
    parsed.scamVerdict = parsed.scamScore >= 66 ? "scam" : parsed.scamScore >= 31 ? "risky" : "safe";
    parsed.scamReasons = (parsed.scamReasons ?? []).slice(0, 3);
    parsed.branches = Array.isArray(parsed.branches) ? parsed.branches.map(normalizeBranch).filter(Boolean) : [];
    parsed.fitScore = clamp(Math.round(parsed.fitScore ?? 0), 0, 100);
    parsed.have = Array.isArray(parsed.have) ? parsed.have.slice(0, 5).map(String) : [];
    parsed.missing = Array.isArray(parsed.missing) ? parsed.missing.slice(0, 5).map(String) : [];
    parsed.suggestedPrep = Array.isArray(parsed.suggestedPrep)
      ? parsed.suggestedPrep.slice(0, 3).map((p) => ({
          title: String(p.title ?? "").slice(0, 80),
          hours: clamp(Math.round(Number(p.hours) || 8), 1, 40),
          action: String(p.action ?? "").slice(0, 160),
        }))
      : [];

    const { gates, gatesOpen, gatesTotal } = computeEligibilityGates(student, parsed);

    const [saved] = await db
      .insert(applicationsTable)
      .values({
        studentId: id,
        source: "pasted",
        rawText: text.slice(0, 4000),
        company: parsed.company,
        role: parsed.role,
        ctc: parsed.ctc,
        applyLink: parsed.applyLink,
        scamScore: parsed.scamScore,
        scamVerdict: parsed.scamVerdict,
        scamReasons: parsed.scamReasons,
        gates,
        gatesOpen,
        gatesTotal,
        fitScore: parsed.fitScore,
        fitSummary: parsed.fitSummary,
        have: parsed.have,
        missing: parsed.missing,
        suggestedPrep: parsed.suggestedPrep,
        status: "viewed",
      })
      .returning();

    logEvent(id, "application_added", `${parsed.company ?? "Unknown company"}${parsed.role ? ` · ${parsed.role}` : ""}`, {
      company: parsed.company,
      role: parsed.role,
      fitScore: parsed.fitScore,
    });

    return res.status(201).json(saved);
  } catch (err) {
    req.log.error({ err }, "Pipeline analysis failed");
    return res.status(500).json({ error: "Couldn't analyze this. Try again." });
  }
});

// GET /students/:id/applications
router.get("/students/:id/applications", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const rows = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.studentId, id))
      .orderBy(desc(applicationsTable.createdAt))
      .limit(50);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list applications");
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /students/:id/applications/:appId
router.patch("/students/:id/applications/:appId", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  const appId = Number(req.params.appId);
  const { status } = req.body as { status?: string };
  if (isNaN(id) || isNaN(appId)) return res.status(400).json({ error: "Invalid id" });
  if (!status || !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` });
  }
  try {
    const [existing] = await db
      .select({ status: applicationsTable.status, company: applicationsTable.company })
      .from(applicationsTable)
      .where(and(eq(applicationsTable.id, appId), eq(applicationsTable.studentId, id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [updated] = await db
      .update(applicationsTable)
      .set({ status, statusUpdatedAt: new Date() })
      .where(and(eq(applicationsTable.id, appId), eq(applicationsTable.studentId, id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    if (existing.status !== status) {
      logEvent(id, "application_status_changed", `${existing.company ?? "Application"}: ${existing.status} → ${status}`, {
        from: existing.status,
        to: status,
      });
    }
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update application status");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
