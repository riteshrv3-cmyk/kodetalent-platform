import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, driveChecksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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

    // TPO match (honest heuristic — we don't crawl, so we say unknown)
    const tpoMatch = "unknown";

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

    return res.json(saved);
  } catch (err) {
    req.log.error({ err }, "Drive check failed");
    return res.status(500).json({ error: "Couldn't check this drive. Try again." });
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

export default router;
