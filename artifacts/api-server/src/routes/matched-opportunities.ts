import { Router } from "express";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStudent } from "../middlewares/studentAuth";
import { getOpportunities, type Kind, type Opportunity } from "./opportunities";

const router = Router();

/**
 * Minimal targetRole -> (search role label, starter skills) map, mirroring the
 * ROLE_DESTINATIONS used for onboarding's deep-link but kept server-side since
 * this is what decides the very first thing a student sees. Only the four
 * goal-picker options need an entry; "Not sure" and anything unset fall back
 * to the student's own profile below.
 */
const ROLE_MATCH: Record<string, { roleLabel: string; skills: string[] }> = {
  "SDE": { roleLabel: "Full Stack Developer", skills: ["React", "Node.js", "MongoDB", "AWS"] },
  "Data/ML": { roleLabel: "Data Science", skills: ["Python", "SQL", "Machine Learning", "Statistics"] },
  "App Dev": { roleLabel: "React Native Developer", skills: ["React Native", "TypeScript", "Redux"] },
  "Cybersecurity": { roleLabel: "Security Analyst", skills: ["SIEM", "Threat Intelligence"] },
};

function resolveRoleAndSkills(student: {
  targetRole: string | null;
  skills: unknown;
  field: string | null;
}): { roleLabel: string; skills: string[] } {
  const known = student.targetRole ? ROLE_MATCH[student.targetRole] : undefined;
  if (known) return known;

  // "Not sure" or unset — fall back to the student's own top skills, or their
  // academic field, so the feed is never a hardcoded generic query.
  const skillMap = (student.skills as Record<string, number>) || {};
  const topSkills = Object.entries(skillMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
  const field = student.field && student.field !== "Not set" ? student.field : null;
  return { roleLabel: field || "Software Engineer", skills: topSkills };
}

/**
 * Locked spec: list order follows student year, not a fit score. Students
 * further from graduation see internships and freelance work first, since a
 * fresher's first screen full of "5 years experience" jobs reads as "nothing
 * here for me." Final-year and graduated students see jobs first.
 */
function resolveKindOrder(student: { targetBatch: number | null; year: number }): Kind[] {
  const currentYear = new Date().getFullYear();
  const isEarly = student.targetBatch != null
    ? student.targetBatch - currentYear >= 2
    : student.year < 4;
  return isEarly ? ["internship", "freelancing", "jobs"] : ["jobs", "internship", "freelancing"];
}

const GROUP_LABEL: Record<Kind, string> = {
  jobs: "Jobs",
  internship: "Internships",
  freelancing: "Freelance",
};

const PREVIEW_SIZE = 6;

// GET /students/:id/opportunities/matched — the profile-matched "best
// matches" feed. Grouped only (no fit percentages, per the locked spec) and
// ordered by student year. This is the payoff screen after onboarding and
// the top of the Opportunities tab.
router.get("/students/:id/opportunities/matched", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Not found" });

    const { roleLabel, skills } = resolveRoleAndSkills(student);
    const order = resolveKindOrder(student);

    const settled = await Promise.allSettled(
      order.map(kind => getOpportunities(kind, roleLabel, skills)),
    );

    // A listing is "new" only if this student has never been shown it before.
    // First-ever load is deliberately NOT all-new: a student who has seen
    // nothing yet has nothing to catch up on, and badging 18 items on install
    // would make the signal meaningless from the first minute.
    const seen = new Set(
      (Array.isArray(student.seenOpportunityIds) ? student.seenOpportunityIds : [])
        .filter((v): v is string => typeof v === "string"),
    );
    const firstEverLoad = seen.size === 0;

    let newCount = 0;
    const groups = order.map((kind, i) => {
      const result = settled[i];
      const items: Opportunity[] = result.status === "fulfilled" ? result.value.items : [];
      // Real listings (not the "search on X" platform links) lead every
      // group, since a preview's whole point is showing real, specific work.
      const ranked = [...items].sort((a, b) => Number(!!a.isSearchLink) - Number(!!b.isSearchLink));
      const sliced = ranked.slice(0, PREVIEW_SIZE).map(o => {
        const isNew = !firstEverLoad && !o.isSearchLink && !seen.has(o.id);
        if (isNew) newCount++;
        return { ...o, isNew };
      });
      return { kind, label: GROUP_LABEL[kind], items: sliced };
    });

    return res.json({
      role: roleLabel,
      targetRole: student.targetRole,
      matchedFrom: student.targetRole ? "targetRole" : skills.length > 0 ? "skills" : "field",
      order,
      newCount,
      groups,
    });
  } catch (err) {
    req.log.error({ err }, "matched opportunities failed");
    return res.status(500).json({ error: "Server error" });
  }
});

/** How many ids to retain per student. Roughly a month of feed churn. */
const SEEN_CAP = 400;

// POST /students/:id/opportunities/mark-seen — called once the student has
// actually looked at the feed. Everything passed here stops counting as new
// on the next load. Newest ids kept, oldest dropped past the cap.
router.post("/students/:id/opportunities/mark-seen", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const raw = (req.body ?? {}).ids;
  const ids = Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, SEEN_CAP)
    : [];
  if (ids.length === 0) return res.status(400).json({ error: "ids must be a non-empty string array" });

  try {
    const [student] = await db
      .select({ seen: studentsTable.seenOpportunityIds })
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .limit(1);
    if (!student) return res.status(404).json({ error: "Not found" });

    const existing = (Array.isArray(student.seen) ? student.seen : [])
      .filter((v): v is string => typeof v === "string");
    // New ids first so the cap evicts the oldest, and dedupe preserves that order.
    const merged = [...new Set([...ids, ...existing])].slice(0, SEEN_CAP);

    await db
      .update(studentsTable)
      .set({ seenOpportunityIds: merged })
      .where(eq(studentsTable.id, id));

    return res.json({ ok: true, tracked: merged.length });
  } catch (err) {
    req.log.error({ err }, "mark-seen failed");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
