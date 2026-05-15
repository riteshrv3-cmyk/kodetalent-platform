import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, recruiterInvites, mentors, driveChecksTable, recruiterJobsTable, tpoDrivesTable, tpoAccountsTable } from "@workspace/db";
import { eq, inArray, desc, and, gte, sql } from "drizzle-orm";
import { requireTpo, type TpoAuthedRequest } from "../middlewares/tpoAuth";

const router = Router();

router.get("/colleges/:college/stats", async (req, res) => {
  const { college } = req.params;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.college, college));
  const total = students.length;
  const ready = students.filter(s => (s.profileStrength ?? 0) >= 60).length;
  const atRisk = students.filter(s => (s.profileStrength ?? 0) < 30 && s.year >= 3).length;
  const avgScore = total > 0 ? Math.round(students.reduce((sum, s) => sum + s.overallScore, 0) / total) : 0;
  const avgStrength = total > 0 ? Math.round(students.reduce((sum, s) => sum + (s.profileStrength ?? 0), 0) / total) : 0;
  const byYear = [1, 2, 3, 4].map(year => {
    const cohort = students.filter(s => s.year === year);
    return {
      year,
      count: cohort.length,
      avgStrength: cohort.length > 0 ? Math.round(cohort.reduce((sum, s) => sum + (s.profileStrength ?? 0), 0) / cohort.length) : 0,
      readyCount: cohort.filter(s => (s.profileStrength ?? 0) >= 60).length,
    };
  }).filter(b => b.count > 0);
  res.json({ total, ready, atRisk, avgScore, avgStrength, byYear });
});

router.get("/colleges/:college/students", async (req, res) => {
  const { college } = req.params;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.college, college));
  res.json(students);
});

router.get("/colleges/:college/activity", async (req, res) => {
  const { college } = req.params;
  const collegeStudents = await db
    .select({ id: studentsTable.id, name: studentsTable.name, field: studentsTable.field, year: studentsTable.year })
    .from(studentsTable)
    .where(eq(studentsTable.college, college));
  if (collegeStudents.length === 0) return res.json([]);
  const studentIds = collegeStudents.map(s => s.id);
  const invites = await db
    .select()
    .from(recruiterInvites)
    .where(inArray(recruiterInvites.studentId, studentIds))
    .orderBy(desc(recruiterInvites.createdAt))
    .limit(50);
  const studentMap = Object.fromEntries(collegeStudents.map(s => [s.id, s]));
  const enriched = invites.map(inv => ({ ...inv, student: studentMap[inv.studentId] }));
  return res.json(enriched);
});

router.get("/colleges/:college/mentors", async (req, res) => {
  const { college } = req.params;
  const result = await db.select().from(mentors).where(eq(mentors.college, college));
  res.json(result);
});

router.post("/colleges/:college/mentors", async (req, res) => {
  const { college } = req.params;
  const { name, email, designation, batchYear, field, phone } = req.body as {
    name: string; email: string; designation?: string; batchYear?: number; field?: string; phone?: string;
  };
  const [mentor] = await db.insert(mentors).values({ name, email, college, designation, batchYear, field, phone }).returning();
  res.status(201).json(mentor);
});

router.delete("/mentors/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(mentors).where(eq(mentors.id, id));
  res.json({ ok: true });
});

router.post("/recruiter-invites", async (req, res) => {
  const { studentId, recruiterCompany, recruiterName, recruiterEmail, role, message } = req.body as {
    studentId: number; recruiterCompany: string; recruiterName: string; recruiterEmail: string; role?: string; message?: string;
  };
  const [invite] = await db.insert(recruiterInvites).values({ studentId, recruiterCompany, recruiterName, recruiterEmail, role, message }).returning();
  res.status(201).json(invite);
});

router.get("/students/:id/invites", async (req, res) => {
  const id = parseInt(req.params.id);
  const invites = await db
    .select()
    .from(recruiterInvites)
    .where(eq(recruiterInvites.studentId, id))
    .orderBy(desc(recruiterInvites.createdAt));
  res.json(invites);
});

router.patch("/recruiter-invites/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: "accepted" | "declined" };
  if (!["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const [updated] = await db
    .update(recruiterInvites)
    .set({ status, studentSeen: true })
    .where(eq(recruiterInvites.id, id))
    .returning();
  return res.json(updated);
});

router.post("/students/:id/mark-invites-seen", async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .update(recruiterInvites)
    .set({ studentSeen: true })
    .where(eq(recruiterInvites.studentId, id));
  res.json({ ok: true });
});

router.get("/colleges/:college/leaderboard", async (req, res) => {
  const { college } = req.params;
  const all = await db
    .select({
      college: studentsTable.college,
      total: sql<number>`count(*)::int`,
      avgStrength: sql<number>`coalesce(round(avg(${studentsTable.profileStrength}))::int, 0)`,
      avgScore: sql<number>`coalesce(round(avg(${studentsTable.overallScore}))::int, 0)`,
      readyCount: sql<number>`coalesce(sum(case when ${studentsTable.profileStrength} >= 60 then 1 else 0 end)::int, 0)`,
      openToWork: sql<number>`coalesce(sum(case when ${studentsTable.openToWork} = true then 1 else 0 end)::int, 0)`,
    })
    .from(studentsTable)
    .groupBy(studentsTable.college);

  const inviteCounts = await db
    .select({
      college: studentsTable.college,
      invites: sql<number>`count(${recruiterInvites.id})::int`,
    })
    .from(studentsTable)
    .leftJoin(recruiterInvites, eq(recruiterInvites.studentId, studentsTable.id))
    .groupBy(studentsTable.college);
  const inviteMap = Object.fromEntries(inviteCounts.map(r => [r.college, r.invites]));

  const ranked = all
    .filter(r => r.total >= 1)
    .map(r => {
      const readyPct = r.total > 0 ? Math.round((r.readyCount / r.total) * 100) : 0;
      const compositeScore = r.avgStrength * 0.4 + readyPct * 0.4 + Math.min((inviteMap[r.college] ?? 0), 100) * 0.2;
      return {
        college: r.college,
        total: r.total,
        avgStrength: r.avgStrength,
        avgScore: r.avgScore,
        readyCount: r.readyCount,
        readyPct,
        openToWork: r.openToWork,
        recruiterInterest: inviteMap[r.college] ?? 0,
        compositeScore: Math.round(compositeScore),
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);

  const withRank = ranked.map((r, i) => ({ ...r, rank: i + 1 }));
  const myRank = withRank.find(r => r.college === college);
  const top10 = withRank.slice(0, 10);

  res.json({
    totalColleges: withRank.length,
    myRank: myRank ?? null,
    top10,
    nationalAvgStrength: withRank.length > 0
      ? Math.round(withRank.reduce((s, r) => s + r.avgStrength, 0) / withRank.length)
      : 0,
  });
});

router.get("/colleges/:college/digest", async (req, res) => {
  const { college } = req.params;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const collegeStudents = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      year: studentsTable.year,
      field: studentsTable.field,
      profileStrength: studentsTable.profileStrength,
      overallScore: studentsTable.overallScore,
      createdAt: studentsTable.createdAt,
      openToWork: studentsTable.openToWork,
    })
    .from(studentsTable)
    .where(eq(studentsTable.college, college));

  if (collegeStudents.length === 0) {
    return res.json({
      topReady: [], openToWorkList: [], newInvites: [],
      invitesTotal7d: 0, driveChecks7d: 0, scamsBlocked: 0, ghostedDrives: 0,
    });
  }

  const studentIds = collegeStudents.map(s => s.id);

  const topReady = [...collegeStudents]
    .filter(s => (s.profileStrength ?? 0) >= 60)
    .sort((a, b) => (b.profileStrength ?? 0) - (a.profileStrength ?? 0))
    .slice(0, 8);

  const openToWorkList = collegeStudents
    .filter(s => s.openToWork)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, 8);

  const recentInvites = await db
    .select()
    .from(recruiterInvites)
    .where(
      and(
        inArray(recruiterInvites.studentId, studentIds),
        gte(recruiterInvites.createdAt, sevenDaysAgo),
      ),
    )
    .orderBy(desc(recruiterInvites.createdAt));

  const studentMap = Object.fromEntries(collegeStudents.map(s => [s.id, s]));
  const newInvites = recentInvites.slice(0, 8).map(inv => ({
    ...inv,
    student: studentMap[inv.studentId],
  }));

  const recentDrives = await db
    .select()
    .from(driveChecksTable)
    .where(
      and(
        inArray(driveChecksTable.studentId, studentIds),
        gte(driveChecksTable.createdAt, sevenDaysAgo),
      ),
    );

  const scamsBlocked = recentDrives.filter(d => d.scamVerdict === "scam").length;
  const ghostedDrives = recentDrives.filter(d => d.outcome === "ghosted").length;

  return res.json({
    topReady,
    openToWorkList,
    newInvites,
    invitesTotal7d: recentInvites.length,
    driveChecks7d: recentDrives.length,
    scamsBlocked,
    ghostedDrives,
  });
});

router.get("/colleges/:college/skill-gap", async (req, res) => {
  const { college } = req.params;
  const collegeStudents = await db
    .select({ skills: studentsTable.skills })
    .from(studentsTable)
    .where(eq(studentsTable.college, college));

  const skillCounts: Record<string, number> = {};
  for (const s of collegeStudents) {
    const sk = (s.skills ?? {}) as Record<string, number>;
    for (const k of Object.keys(sk)) {
      const key = k.toLowerCase();
      skillCounts[key] = (skillCounts[key] ?? 0) + 1;
    }
  }

  const allJobs = await db.select({ parsed: recruiterJobsTable.parsedRequirements }).from(recruiterJobsTable);
  const demandCounts: Record<string, number> = {};
  for (const j of allJobs) {
    if (!j.parsed) continue;
    for (const k of [...(j.parsed.mustHaveSkills ?? []), ...(j.parsed.niceToHaveSkills ?? [])]) {
      const key = String(k).toLowerCase();
      demandCounts[key] = (demandCounts[key] ?? 0) + 1;
    }
  }

  const totalStudents = collegeStudents.length;
  const demanded = Object.entries(demandCounts)
    .map(([skill, demand]) => {
      const supply = skillCounts[skill] ?? 0;
      const supplyPct = totalStudents > 0 ? Math.round((supply / totalStudents) * 100) : 0;
      const gap = Math.max(0, demand - supply);
      return { skill, demand, supply, supplyPct, gap };
    })
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 12);

  const topBatchSkills = Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, count, pct: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json({
    totalStudents,
    totalJobsAnalyzed: allJobs.length,
    inDemand: demanded,
    topBatchSkills,
  });
});

router.get("/colleges/:college/drive-feed", async (req, res) => {
  const { college } = req.params;
  const collegeStudents = await db
    .select({ id: studentsTable.id, name: studentsTable.name, field: studentsTable.field, year: studentsTable.year })
    .from(studentsTable)
    .where(eq(studentsTable.college, college));

  if (collegeStudents.length === 0) {
    return res.json({ recentChecks: [], topGhostingCompanies: [], scamCount: 0, totalChecks: 0 });
  }

  const studentIds = collegeStudents.map(s => s.id);
  const studentMap = Object.fromEntries(collegeStudents.map(s => [s.id, s]));

  const checks = await db
    .select()
    .from(driveChecksTable)
    .where(inArray(driveChecksTable.studentId, studentIds))
    .orderBy(desc(driveChecksTable.createdAt))
    .limit(40);

  const recentChecks = checks.map(c => ({ ...c, student: studentMap[c.studentId] }));

  const byCompany: Record<string, { total: number; ghosted: number; called: number; offer: number; rejected: number }> = {};
  for (const c of checks) {
    if (!c.company) continue;
    const key = c.company;
    if (!byCompany[key]) byCompany[key] = { total: 0, ghosted: 0, called: 0, offer: 0, rejected: 0 };
    byCompany[key].total++;
    if (c.outcome === "ghosted") byCompany[key].ghosted++;
    else if (c.outcome === "called") byCompany[key].called++;
    else if (c.outcome === "offer") byCompany[key].offer++;
    else if (c.outcome === "rejected") byCompany[key].rejected++;
  }

  const topGhostingCompanies = Object.entries(byCompany)
    .map(([company, v]) => {
      const decided = v.ghosted + v.called + v.offer + v.rejected;
      const ghostRate = decided > 0 ? Math.round((v.ghosted / decided) * 100) : 0;
      return { company, ...v, decided, ghostRate };
    })
    .filter(c => c.decided >= 1)
    .sort((a, b) => b.ghostRate - a.ghostRate || b.total - a.total)
    .slice(0, 8);

  const scamCount = checks.filter(c => c.scamVerdict === "scam").length;

  return res.json({
    recentChecks,
    topGhostingCompanies,
    scamCount,
    totalChecks: checks.length,
  });
});

// ─── TPO-announced drives ──────────────────────────────────────────────────
router.get("/colleges/:college/tpo-drives", async (req, res) => {
  const { college } = req.params;
  try {
    // All TPO accounts are auto-verified at signup (open-signup model),
    // so the historical innerJoin filter on tpo_accounts.verified is no
    // longer needed. Return all drives for the college.
    const rows = await db
      .select()
      .from(tpoDrivesTable)
      .where(eq(tpoDrivesTable.college, college))
      .orderBy(desc(tpoDrivesTable.createdAt))
      .limit(200);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list TPO drives");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/colleges/:college/tpo-drives", requireTpo, async (req: TpoAuthedRequest, res): Promise<void> => {
  const { college } = req.params;
  // Authoritative identity comes from the auth middleware, NOT from the body.
  const tpo = req.tpo!;
  if (tpo.college !== college) {
    res.status(403).json({ error: "Cannot post drives for another college" });
    return;
  }
  const body = req.body as {
    company?: string;
    role?: string | null;
    ctc?: string | null;
    batch?: string | null;
    branches?: string[];
    cgpaCutoff?: string | null;
    applyLink?: string | null;
    notes?: string | null;
    driveDate?: string | null;
    expiresAt?: string | null;
  };
  if (!body.company?.trim()) {
    res.status(400).json({ error: "company is required" });
    return;
  }
  try {
    const [row] = await db
      .insert(tpoDrivesTable)
      .values({
        college: tpo.college,
        postedByName: tpo.name,
        company: body.company.trim(),
        role: body.role?.trim() || null,
        ctc: body.ctc?.trim() || null,
        batch: body.batch?.trim() || null,
        branches: Array.isArray(body.branches) ? body.branches : [],
        cgpaCutoff: body.cgpaCutoff?.trim() || null,
        applyLink: body.applyLink?.trim() || null,
        notes: body.notes?.trim() || null,
        driveDate: body.driveDate ? new Date(body.driveDate) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create TPO drive");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/tpo-drives/:id", requireTpo, async (req: TpoAuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tpo = req.tpo!;
  try {
    const [existing] = await db.select().from(tpoDrivesTable).where(eq(tpoDrivesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.college !== tpo.college) {
      res.status(403).json({ error: "Cannot modify another college's drive" });
      return;
    }
    await db.delete(tpoDrivesTable).where(eq(tpoDrivesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete TPO drive");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/tpo-drives/:id", requireTpo, async (req: TpoAuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body as { status?: string };
  if (status !== "active" && status !== "closed") {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const tpo = req.tpo!;
  try {
    const [existing] = await db.select().from(tpoDrivesTable).where(eq(tpoDrivesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.college !== tpo.college) {
      res.status(403).json({ error: "Cannot modify another college's drive" });
      return;
    }
    const [row] = await db
      .update(tpoDrivesTable)
      .set({ status })
      .where(eq(tpoDrivesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update TPO drive");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
