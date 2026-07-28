import { Router } from "express";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStudent } from "../middlewares/studentAuth";
import { getOpportunities, isEntryFriendly, type Kind, type Opportunity } from "./opportunities";

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

/**
 * Degree -> starter job title.
 *
 * A student's `field` is what they study, not a job anyone hires for. Feeding
 * it to the boards verbatim searched for "CSE", which matches nothing on any
 * job site, so every student who skipped the goal question or answered "Not
 * sure" got an empty feed. Branches map to the role their graduates actually
 * get hired into first.
 */
const FIELD_TO_ROLE: Record<string, string> = {
  cse: "Full Stack Developer",
  cs: "Full Stack Developer",
  "computer science": "Full Stack Developer",
  "computer engineering": "Full Stack Developer",
  it: "Full Stack Developer",
  "information technology": "Full Stack Developer",
  ai: "Data Science",
  "ai/ml": "Data Science",
  "data science": "Data Science",
  ece: "Embedded Engineer",
  electronics: "Embedded Engineer",
  // Non-software branches (mechanical, civil, chemical...) are deliberately
  // absent. The listing sources are tech boards, so mapping those fields to
  // their real titles produced a correct-sounding label attached to Rails and
  // service-desk jobs — a worse lie than showing nothing. They fall through
  // to the default, which the client labels as a guess rather than a match.
};

/**
 * Where an unknown student starts. Chosen by measuring what the live sources
 * actually return, not by which label sounds most neutral: "Software
 * Developer" came back almost entirely Staff/Principal remote roles, while
 * this query surfaces campus-hire and intern listings.
 */
const DEFAULT_ROLE = "Full Stack Developer";

/**
 * Starter skills for the guessed path. A student who has not picked a goal
 * also has no skills recorded, and passing none through narrows the source
 * queries badly — the same role returned 3 listings with no skills against 12
 * with them. These mirror ROLE_MATCH["SDE"], since that is the same role.
 */
const DEFAULT_SKILLS = ["React", "Node.js", "MongoDB", "AWS"];

function normalizeField(field: string | null): string | null {
  if (!field) return null;
  const f = field.toLowerCase().trim();
  // "Not set" is the placeholder guest onboarding writes — never a search term.
  if (!f || f === "not set") return null;
  return f;
}

function resolveRoleAndSkills(student: {
  targetRole: string | null;
  skills: unknown;
  field: string | null;
}): { roleLabel: string; skills: string[]; isGuess: boolean } {
  const known = student.targetRole ? ROLE_MATCH[student.targetRole] : undefined;
  if (known) return { ...known, isGuess: false };

  const skillMap = (student.skills as Record<string, number>) || {};
  const topSkills = Object.entries(skillMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  // "Not sure" or unset. Every branch below must produce a real job title —
  // an honest guess that returns actual work beats an accurate label that
  // returns nothing.
  const field = normalizeField(student.field);
  const mapped = field ? FIELD_TO_ROLE[field] : undefined;
  return {
    roleLabel: mapped ?? DEFAULT_ROLE,
    skills: topSkills.length > 0 ? topSkills : DEFAULT_SKILLS,
    isGuess: true,
  };
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

    const { roleLabel, skills, isGuess } = resolveRoleAndSkills(student);
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
      const all: Opportunity[] = result.status === "fulfilled" ? result.value.items : [];

      // Search links are split out rather than listed. Rendered as a card they
      // carry an Apply button and sit at the same weight as a real posting,
      // so a student taps through expecting a job and lands on a board's
      // search page. That is the product having nothing while looking like it
      // has something. The client shows these only as plain links, and only
      // when there is genuinely no real work to show.
      const real = all.filter(o => !o.isSearchLink);
      const searchLinks = all
        .filter(o => o.isSearchLink)
        .map(o => ({ id: o.id, source: o.source, url: o.url }));

      // This is the fresher's payoff screen, so Staff/Principal/Director
      // listings are dropped rather than sorted down — with only a handful of
      // results they otherwise still land on screen, which is the "nothing
      // here for me" signal the whole year-ordering exists to avoid.
      //
      // Deliberately no fall back to senior roles when nothing survives: an
      // empty group renders an honest "nothing today" state, and that beats
      // filling the screen with jobs this student cannot get.
      const entry = real.filter(isEntryFriendly);

      const sliced = entry.slice(0, PREVIEW_SIZE).map(o => {
        const isNew = !firstEverLoad && !seen.has(o.id);
        if (isNew) newCount++;
        return { ...o, isNew };
      });
      return { kind, label: GROUP_LABEL[kind], items: sliced, searchLinks };
    });

    return res.json({
      role: roleLabel,
      targetRole: student.targetRole,
      // True when the role was inferred rather than chosen, so the client can
      // say so instead of presenting a guess as a match.
      isGuess,
      matchedFrom: student.targetRole && !isGuess ? "targetRole" : skills.length > 0 ? "skills" : "field",
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
