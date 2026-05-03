import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, driveChecksTable, tpoDrivesTable } from "@workspace/db";
import { eq, desc, and, sql, ilike, lte, isNotNull, gte } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseFirstNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.toString().match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function normalizeBranch(b: string): string {
  const x = b.toLowerCase().trim();
  if (x.includes("comp") || x === "cse" || x === "cs" || x === "it" || x.includes("software")) return "cse";
  if (x.includes("electronic") || x === "ece" || x === "etc" || x === "ete") return "ece";
  if (x.includes("electric") || x === "eee" || x === "ee") return "eee";
  if (x.includes("mech")) return "mech";
  if (x.includes("civil")) return "civil";
  if (x.includes("chem")) return "chem";
  if (x === "all" || x.includes("any") || x.includes("circuit")) return "all";
  return x;
}

router.post("/students/:id/drive-check", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { rawText } = req.body as { rawText: string };
  if (!rawText?.trim() || rawText.trim().length < 5) {
    return res.status(400).json({ error: "Paste a real drive message" });
  }

  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const prompt = `You analyze placement drive messages forwarded by Indian engineering students on Telegram/WhatsApp. Many are scams. Return ONLY valid JSON, nothing else.

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
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0];
    if (raw.type !== "text") throw new Error("AI returned no text");

    let parsed: ParsedDrive;
    try {
      parsed = JSON.parse(raw.text);
    } catch {
      const m = raw.text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned no JSON");
      parsed = JSON.parse(m[0]);
    }

    // Sanity guards
    parsed.scamScore = clamp(Math.round(parsed.scamScore ?? 50), 0, 100);
    parsed.scamVerdict =
      parsed.scamScore >= 66 ? "scam" : parsed.scamScore >= 31 ? "risky" : "safe";
    parsed.scamReasons = (parsed.scamReasons ?? []).slice(0, 3);
    parsed.branches = Array.isArray(parsed.branches)
      ? parsed.branches.map(normalizeBranch).filter(Boolean)
      : [];

    // ─── Eligibility computation ───────────────────────────────────────────
    const studentCgpa = parseFirstNumber(student.cgpa);
    const studentBranch = normalizeBranch(student.field);
    const studentBatch = (student.year ? 2026 + (4 - student.year) : null);

    const gates: Record<string, { open: boolean; label: string }> = {};

    // CGPA gate
    if (parsed.cgpaCutoff != null && studentCgpa != null) {
      gates.cgpa = {
        open: studentCgpa >= parsed.cgpaCutoff,
        label: `CGPA ${studentCgpa} / Cutoff ${parsed.cgpaCutoff}`,
      };
    } else if (parsed.cgpaCutoff != null && studentCgpa == null) {
      gates.cgpa = { open: false, label: `CGPA cutoff ${parsed.cgpaCutoff} (yours not set)` };
    }

    // Branch gate
    if (parsed.branches.length > 0) {
      const allowAll = parsed.branches.includes("all");
      const open = allowAll || parsed.branches.includes(studentBranch);
      gates.branch = {
        open,
        label: allowAll
          ? `All branches allowed`
          : `Allowed: ${parsed.branches.join(", ").toUpperCase()} / Yours: ${studentBranch.toUpperCase()}`,
      };
    }

    // Batch gate
    if (parsed.batch && studentBatch) {
      const yearMatch = parsed.batch.match(/\d{4}/g) ?? [];
      const allowed = yearMatch.map((y) => parseInt(y));
      const open = allowed.length === 0 || allowed.includes(studentBatch);
      gates.batch = {
        open,
        label: `Batch ${parsed.batch} / Yours: ${studentBatch}`,
      };
    }

    const gateValues = Object.values(gates);
    const gatesOpen = gateValues.filter((g) => g.open).length;
    const gatesTotal = gateValues.length;

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

// ─── TPO drive matcher ──────────────────────────────────────────────────────
// Looks up TPO-posted drives for the student's college and fuzzy-matches by
// company name + (optional) role. Returns "matched" / "not_matched" / "unknown".
function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|inc|llc|llp|technologies|technology|tech|solutions|systems|services|india|global|corp|corporation|co)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSetSimilarity(a: string, b: string): number {
  const at = new Set(a.split(/\s+/).filter(t => t.length >= 2));
  const bt = new Set(b.split(/\s+/).filter(t => t.length >= 2));
  if (at.size === 0 || bt.size === 0) return 0;
  let inter = 0;
  for (const t of at) if (bt.has(t)) inter++;
  const union = new Set([...at, ...bt]).size;
  return inter / union;
}

// Common Indian-recruiting company aliases. Maps every form to a canonical
// key so "TCS", "Tata Consultancy Services" and "Tata Consultancy" all match.
const COMPANY_ALIASES: Record<string, string> = {
  "tcs": "tata consultancy",
  "tata consultancy": "tata consultancy",
  "tata consultancy services": "tata consultancy",
  "infy": "infosys",
  "infosys": "infosys",
  "wipro": "wipro",
  "hcl": "hcl",
  "hcltech": "hcl",
  "ibm": "ibm",
  "google": "google",
  "alphabet": "google",
  "meta": "meta",
  "facebook": "meta",
  "amazon": "amazon",
  "aws": "amazon",
  "microsoft": "microsoft",
  "msft": "microsoft",
  "ms": "microsoft",
  "accenture": "accenture",
  "cognizant": "cognizant",
  "ctsh": "cognizant",
  "cts": "cognizant",
  "capgemini": "capgemini",
  "deloitte": "deloitte",
  "jpmc": "jpmorgan chase",
  "jp morgan": "jpmorgan chase",
  "jpmorgan": "jpmorgan chase",
  "jpmorgan chase": "jpmorgan chase",
};

function canonicalCompany(s: string): string {
  return COMPANY_ALIASES[s] ?? s;
}

function companyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ca = canonicalCompany(a);
  const cb = canonicalCompany(b);
  if (ca === cb) return true;
  // Substring containment after normalization handles "google" vs "google india".
  if (ca.length >= 3 && cb.includes(ca)) return true;
  if (cb.length >= 3 && ca.includes(cb)) return true;
  return tokenSetSimilarity(a, b) >= 0.7;
}

async function computeTpoMatch(
  college: string | null | undefined,
  company: string | null | undefined,
  role: string | null | undefined,
): Promise<{ status: "matched" | "not_matched" | "unknown"; driveId: number | null }> {
  if (!college || !company) return { status: "unknown", driveId: null };

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const tpoPosts = await db
    .select()
    .from(tpoDrivesTable)
    .where(
      and(
        eq(tpoDrivesTable.college, college),
        eq(tpoDrivesTable.status, "active"),
        gte(tpoDrivesTable.createdAt, sixtyDaysAgo),
      ),
    )
    .orderBy(desc(tpoDrivesTable.createdAt))
    .limit(200);

  // If the TPO has posted nothing recently, we genuinely don't know.
  if (tpoPosts.length === 0) return { status: "unknown", driveId: null };

  const targetCompany = normalizeText(company);
  const targetRole = normalizeText(role);

  // Strong company match required: token-set similarity >= 0.7.
  // When BOTH the pasted message and the TPO post specify a role, role
  // similarity must also be >= 0.4 — otherwise we'd over-verify a different
  // role at the same company. If either side has no role, company-only is OK.
  let best: { id: number; score: number } | null = null;
  for (const post of tpoPosts) {
    const postCompany = normalizeText(post.company);
    if (!companyMatch(targetCompany, postCompany)) continue;

    if (targetRole && post.role) {
      const roleScore = tokenSetSimilarity(targetRole, normalizeText(post.role));
      if (roleScore < 0.4) continue;
    }

    // Score for picking the "best" candidate when multiple match — exact
    // canonical hits win; otherwise fall back to token-set similarity.
    const score =
      canonicalCompany(targetCompany) === canonicalCompany(postCompany)
        ? 1
        : Math.max(tokenSetSimilarity(targetCompany, postCompany), 0.7);
    if (!best || score > best.score) best = { id: post.id, score };
  }

  if (best) return { status: "matched", driveId: best.id };
  return { status: "not_matched", driveId: null };
}

// ─── Ghost-rate aggregator ──────────────────────────────────────────────────
// Returns: { total, applied, called, ghosted, rejected, offer, ghostRate, callRate, offerRate }
// Only considers rows where outcome is set (i.e. student actually applied + reported back)
async function getCompanyStats(company: string) {
  const c = company.trim();
  if (!c) return null;

  const rows = await db
    .select({ outcome: driveChecksTable.outcome })
    .from(driveChecksTable)
    .where(
      and(
        ilike(driveChecksTable.company, c),
        sql`${driveChecksTable.outcome} <> 'pending'`,
      ),
    );

  const total = rows.length;
  const applied = rows.filter((r) => r.outcome === "applied").length;
  const called = rows.filter((r) => r.outcome === "called").length;
  const ghosted = rows.filter((r) => r.outcome === "ghosted").length;
  const rejected = rows.filter((r) => r.outcome === "rejected").length;
  const offer = rows.filter((r) => r.outcome === "offer").length;

  // Decided = anyone who got a definitive outcome (not "applied" pending state)
  const decided = called + ghosted + rejected + offer;

  return {
    total,
    applied,
    called,
    ghosted,
    rejected,
    offer,
    ghostRate: decided > 0 ? Math.round((ghosted / decided) * 100) : null,
    callRate: decided > 0 ? Math.round(((called + offer) / decided) * 100) : null,
    offerRate: decided > 0 ? Math.round((offer / decided) * 100) : null,
  };
}

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
router.post("/students/:sid/drive-checks/:id/applied", async (req, res) => {
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

router.post("/students/:sid/drive-checks/:id/outcome", async (req, res) => {
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
router.get("/students/:id/pending-pings", async (req, res) => {
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

router.get("/students/:id/drive-checks", async (req, res) => {
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
