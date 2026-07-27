import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, driveChecksTable, tpoDrivesTable } from "@workspace/db";
import { eq, desc, and, sql, lte, isNotNull } from "drizzle-orm";
import { anthropic, AI_MODEL } from "@workspace/integrations-anthropic-ai";
import { rlDriveCheck } from "../middlewares/rateLimit";
import { requireStudent } from "../middlewares/studentAuth";
import { contextPack } from "../lib/contextPack";
import { extractJson } from "../lib/extractJson";
import { clamp, normalizeBranch, computeEligibilityGates, computeTpoMatch, getCompanyStats } from "../lib/driveAnalysis";

const router = Router();

interface ParsedDrive {
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
  confidence: number;
}

router.post("/students/:id/drive-check", requireStudent({ allowGuest: true }), rlDriveCheck, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { rawText } = req.body as { rawText: string };
  if (!rawText?.trim() || rawText.trim().length < 5) {
    return res.status(400).json({ error: "Paste a real drive message" });
  }

  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const pack = await contextPack(id);

    const prompt = `You analyze placement drive messages forwarded by Indian engineering students on Telegram/WhatsApp. Many are scams. Return ONLY valid JSON, nothing else.

${pack?.text ?? ""}

PASTED MESSAGE:
"""
${rawText.slice(0, 4000)}
"""

Extract the following fields. If a field is not mentioned, use null (not empty string).

SCAM SIGNALS to weigh into scamScore (0-100, higher = more scammy):
- Asks for any "registration fee", "course fee", "training fee", "deposit", "₹399", "₹500" etc → +40
- Apply via free Gmail/Yahoo form, not company domain → +20
- Unrealistic CTC for fresher role (e.g. "30 LPA for any graduate, no test") → +25
- Vague company name or no apply link or shortened/suspicious URL → +15
- Urgency language ("apply in 2 hours", "limited slots") with no official source → +10
- Asks for personal docs/Aadhaar upfront before any process → +30
- WhatsApp number to message instead of formal application → +15
- Mentions "guaranteed job" / "100% placement" → +15

LEGIT SIGNALS (subtract from scamScore):
- Recognized company name (TCS, Infosys, Wipro, Accenture, Cognizant, Amazon, Microsoft, Google, Sprinklr, Zoho, Freshworks, etc.) → -20
- Apply link on company's official career domain → -15
- Realistic CTC band for the role and company → -10
- Specific batch year and branch eligibility listed → -5

scamVerdict mapping: 0-30 = "safe", 31-65 = "risky", 66-100 = "scam"

scamReasons: 2-3 SHORT Hinglish bullets (max 10 words each) explaining the verdict in casual student language. Examples: "Registration fee maanga - red flag", "Gmail form, company domain nahi hai", "Sprinklr official domain, batch listed - looks legit", "30 LPA for any graduate - bahut suspicious", "Apply link company website pe hai - safe".

branches: Array of branch codes like ["cse","ece"] or ["all"] if all branches allowed. Use lowercase short forms: cse, ece, eee, mech, civil, chem, all.

cgpaCutoff: Number only (e.g. 7.0, 8.0). Null if not mentioned.

batch: String like "2026" or "2025,2026" or "2025-2027".

ctc: String like "12 LPA" or "8-10 LPA". Null if not mentioned.

Return EXACTLY this JSON shape:
{
  "company": string|null,
  "role": string|null,
  "ctc": string|null,
  "batch": string|null,
  "branches": string[],
  "cgpaCutoff": number|null,
  "applyLink": string|null,
  "scamScore": number,
  "scamVerdict": "safe"|"risky"|"scam",
  "scamReasons": string[],
  "confidence": number
}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0];
    if (raw.type !== "text") throw new Error("AI returned no text");

    const parsed = extractJson<ParsedDrive>(raw.text);

    // Sanity guards
    parsed.scamScore = clamp(Math.round(parsed.scamScore ?? 50), 0, 100);
    parsed.scamVerdict =
      parsed.scamScore >= 66 ? "scam" : parsed.scamScore >= 31 ? "risky" : "safe";
    parsed.scamReasons = (parsed.scamReasons ?? []).slice(0, 3);
    parsed.branches = Array.isArray(parsed.branches)
      ? parsed.branches.map(normalizeBranch).filter(Boolean)
      : [];

    // ─── Eligibility computation (deterministic, never trust the LLM) ─────
    const { gates, gatesOpen, gatesTotal } = computeEligibilityGates(student, parsed);

    // KodeScore fit (heuristic — % of users below this student's overall score)
    const kodeScoreFit = clamp(Math.round(student.overallScore || 0), 0, 100);

    // TPO match — cross-reference TPO-posted drives for this student's college
    const tpoMatchResult = await computeTpoMatch(student.college, parsed.company, parsed.role);
    const tpoMatch = tpoMatchResult.status;
    const tpoMatchedDriveId = tpoMatchResult.driveId;

    // ─── Persist ───────────────────────────────────────────────────────────
    const [saved] = await db.insert(driveChecksTable).values({
      studentId: id,
      rawText: rawText.slice(0, 4000),
      company: parsed.company,
      role: parsed.role,
      ctc: parsed.ctc,
      batch: parsed.batch,
      branches: parsed.branches,
      cgpaCutoff: parsed.cgpaCutoff != null ? String(parsed.cgpaCutoff) : null,
      applyLink: parsed.applyLink,
      scamScore: parsed.scamScore,
      scamVerdict: parsed.scamVerdict,
      scamReasons: parsed.scamReasons,
      eligibility: gates,
      gatesOpen,
      gatesTotal,
      kodeScoreFit,
      tpoMatch,
    }).returning();

    if (tpoMatchedDriveId) {
      await db
        .update(tpoDrivesTable)
        .set({ matchedChecks: sql`${tpoDrivesTable.matchedChecks} + 1` })
        .where(eq(tpoDrivesTable.id, tpoMatchedDriveId));
    }

    const companyStats = parsed.company ? await getCompanyStats(parsed.company) : null;
    const tpoMatchedDrive = tpoMatchedDriveId
      ? (await db.select().from(tpoDrivesTable).where(eq(tpoDrivesTable.id, tpoMatchedDriveId)).limit(1))[0] ?? null
      : null;
    return res.json({ ...saved, companyStats, tpoMatchedDrive });
  } catch (err) {
    req.log.error({ err }, "Drive check failed");
    return res.status(500).json({ error: "Couldn't check this drive. Try again." });
  }
});

router.get("/drive-checks/company-stats", async (req, res) => {
  const company = (req.query.company as string | undefined)?.trim();
  if (!company) return res.status(400).json({ error: "company required" });
  try {
    const stats = await getCompanyStats(company);
    return res.json(stats ?? { total: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to compute company stats");
    return res.status(500).json({ error: "Server error" });
  }
});

// Mark a drive check as "applied" — schedules a 7-day status ping
router.post("/students/:sid/drive-checks/:id/applied", requireStudent({ allowGuest: true, param: "sid" }), async (req, res) => {
  const sid = Number(req.params.sid);
  const id = Number(req.params.id);
  if (isNaN(sid) || isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const now = new Date();
    const ping = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [updated] = await db
      .update(driveChecksTable)
      .set({ outcome: "applied", appliedAt: now, nextPingAt: ping })
      .where(and(eq(driveChecksTable.id, id), eq(driveChecksTable.studentId, sid)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to mark applied");
    return res.status(500).json({ error: "Server error" });
  }
});

// Set the outcome (called / ghosted / rejected / offer / skipped)
const VALID_OUTCOMES = new Set(["called", "ghosted", "rejected", "offer", "skipped"]);

router.post("/students/:sid/drive-checks/:id/outcome", requireStudent({ allowGuest: true, param: "sid" }), async (req, res) => {
  const sid = Number(req.params.sid);
  const id = Number(req.params.id);
  const { outcome } = req.body as { outcome?: string };
  if (isNaN(sid) || isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  if (!outcome || !VALID_OUTCOMES.has(outcome)) {
    return res.status(400).json({ error: "Invalid outcome" });
  }
  try {
    const [updated] = await db
      .update(driveChecksTable)
      .set({ outcome, outcomeAt: new Date(), nextPingAt: null })
      .where(and(eq(driveChecksTable.id, id), eq(driveChecksTable.studentId, sid)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to set outcome");
    return res.status(500).json({ error: "Server error" });
  }
});

// Drives where the student said "applied" and 7 days have passed — ping them
router.get("/students/:id/pending-pings", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(driveChecksTable)
      .where(
        and(
          eq(driveChecksTable.studentId, id),
          eq(driveChecksTable.outcome, "applied"),
          isNotNull(driveChecksTable.nextPingAt),
          lte(driveChecksTable.nextPingAt, now),
        ),
      )
      .orderBy(desc(driveChecksTable.appliedAt))
      .limit(5);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list pending pings");
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/students/:id/drive-checks", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const rows = await db
      .select()
      .from(driveChecksTable)
      .where(eq(driveChecksTable.studentId, id))
      .orderBy(desc(driveChecksTable.createdAt))
      .limit(10);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list drive checks");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/drive-checks/:id/shared", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [updated] = await db
      .update(driveChecksTable)
      .set({ sharedCount: sql`${driveChecksTable.sharedCount} + 1` })
      .where(eq(driveChecksTable.id, id))
      .returning({ id: driveChecksTable.id, sharedCount: driveChecksTable.sharedCount });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to increment sharedCount");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
