/**
 * reset-fake-student-data.ts
 *
 * One-time cleanup for students who were registered before the fix that
 * seeded random XP (100–399) and random streakCount (0–4) on sign-up.
 *
 * Targeting criteria (must ALL match):
 *   1. createdAt < CUTOFF_DATE  — registered before the bug was fixed
 *   2. xp BETWEEN 100 AND 399  — exact range the bug produced
 *   3. streakCount BETWEEN 1 AND 4  — exact non-zero range the bug produced
 *   4. No projects, no certifications, no profile links, no bio
 *      (confirms the XP/streak were never legitimately earned)
 *
 * Environment variables:
 *   CUTOFF_DATE  — ISO date string; students created before this date are
 *                  considered "pre-fix". Defaults to 2026-04-28T00:00:00Z
 *                  (day after the earliest recorded git commit, which already
 *                  had the zeroed registration values).
 *   EXECUTE      — Set to "true" to write changes. Defaults to dry-run.
 *
 * Usage:
 *   Dry-run (default, safe):
 *     pnpm --filter @workspace/scripts run reset:fake-data
 *
 *   Dry-run with custom cutoff:
 *     CUTOFF_DATE=2026-05-03T00:00:00Z pnpm --filter @workspace/scripts run reset:fake-data
 *
 *   Execute for real:
 *     EXECUTE=true pnpm --filter @workspace/scripts run reset:fake-data
 */

import { db, studentsTable } from "@workspace/db";
import { and, between, lt, sql } from "drizzle-orm";

const DRY_RUN = process.env.EXECUTE !== "true";

// Default: day after the earliest git commit that already had zeroed registration values.
const DEFAULT_CUTOFF = "2026-04-28T00:00:00Z";
const CUTOFF_DATE = new Date(process.env.CUTOFF_DATE ?? DEFAULT_CUTOFF);

if (isNaN(CUTOFF_DATE.getTime())) {
  console.error(`Invalid CUTOFF_DATE: "${process.env.CUTOFF_DATE}". Use ISO format, e.g. 2026-04-28T00:00:00Z`);
  process.exit(1);
}

async function resetFakeStudentData() {
  console.log("=".repeat(60));
  console.log("reset-fake-student-data");
  console.log(`CUTOFF_DATE : ${CUTOFF_DATE.toISOString()}`);
  console.log(`MODE        : ${DRY_RUN ? "DRY-RUN (pass EXECUTE=true to apply)" : "EXECUTE — changes WILL be written"}`);
  console.log("=".repeat(60));

  // Step 1: fetch candidates matching all criteria
  const candidates = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      email: studentsTable.email,
      xp: studentsTable.xp,
      streakCount: studentsTable.streakCount,
      overallScore: studentsTable.overallScore,
      createdAt: studentsTable.createdAt,
      githubUrl: studentsTable.githubUrl,
      linkedinUrl: studentsTable.linkedinUrl,
      portfolioUrl: studentsTable.portfolioUrl,
      bio: studentsTable.bio,
      projects: studentsTable.projects,
      certifications: studentsTable.certifications,
    })
    .from(studentsTable)
    .where(
      and(
        lt(studentsTable.createdAt, CUTOFF_DATE),
        between(studentsTable.xp, 100, 399),
        between(studentsTable.streakCount, 1, 4)
      )
    );

  // Step 2: secondary filter — profile must be completely empty
  const toReset: number[] = [];
  const excluded: number[] = [];

  for (const s of candidates) {
    const projects = s.projects as unknown[];
    const certs = s.certifications as unknown[];

    const noProjects = !projects || projects.length === 0;
    const noCerts = !certs || certs.length === 0;
    const noLinks = !s.githubUrl && !s.linkedinUrl && !s.portfolioUrl;
    const noBio = !s.bio;

    if (noProjects && noCerts && noLinks && noBio) {
      toReset.push(s.id);
      console.log(
        `  RESET  [${s.id}] ${s.name} (${s.email})` +
        ` — xp=${s.xp} streak=${s.streakCount} score=${s.overallScore}` +
        ` created=${s.createdAt.toISOString()}`
      );
    } else {
      excluded.push(s.id);
      console.log(
        `  SKIP   [${s.id}] ${s.name} (${s.email})` +
        ` — has profile data, skipping`
      );
    }
  }

  console.log("-".repeat(60));
  console.log(`Candidates in date/xp/streak range : ${candidates.length}`);
  console.log(`Will reset (empty profile)          : ${toReset.length}`);
  console.log(`Excluded (has profile data)         : ${excluded.length}`);

  if (toReset.length === 0) {
    console.log("\nNothing to do.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log("\nDRY-RUN complete — no changes written.");
    console.log("Re-run with EXECUTE=true to apply changes.");
    process.exit(0);
  }

  // Step 3: single transactional batch update
  await db.transaction(async (tx) => {
    const result = await tx
      .update(studentsTable)
      .set({ xp: 0, streakCount: 0, overallScore: 0 })
      .where(
        sql`${studentsTable.id} = ANY(ARRAY[${sql.join(toReset.map(id => sql`${id}`), sql`, `)}]::int[])`
      );
    console.log(`\nTransaction committed. Rows updated: ${result.rowCount ?? toReset.length}`);
  });

  console.log("Done. Fake streak/XP data has been reset to 0.");
  process.exit(0);
}

resetFakeStudentData().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
