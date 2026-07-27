import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studentsTable, questsTable, studentQuestsTable, studentActivityLogTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateStudentBody,
  UpdateStudentBody,
} from "@workspace/api-zod";
import { requireStudent } from "../middlewares/studentAuth";

const router = Router();

// POST /students — create a guest student row (or, if signed in, a claimed one directly).
// Client-supplied email is ignored: anonymous rows get a server-generated placeholder so
// a guessed/known email can never collide with (and take over) an existing account.
router.post("/students", async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { name, college, city, year, field, githubUrl, cgpa, targetPackage, dreamCompany } = parsed.data;
  try {
    const { userId } = getAuth(req);
    const defaultSkills = getDefaultSkills(field as string);
    const guestToken = userId ? null : randomUUID();
    const email = userId
      ? null // filled in by /auth/claim from the Clerk profile; placeholder here would never be read
      : `guest_${randomUUID()}@guest.kodetalent.internal`;

    const [student] = await db.insert(studentsTable).values({
      name,
      email: email ?? `guest_${randomUUID()}@guest.kodetalent.internal`,
      college,
      city,
      year,
      field: field as string,
      githubUrl: githubUrl ?? null,
      cgpa: cgpa ?? null,
      targetPackage: targetPackage ?? null,
      dreamCompany: dreamCompany ?? null,
      clerkUserId: userId ?? null,
      guestToken,
      overallScore: 0,
      xp: 0,
      level: 1,
      streakCount: 0,
      lastActiveDate: new Date().toISOString().split("T")[0],
      skills: defaultSkills,
      isPro: false,
    }).returning();
    return res.status(201).json({ ...formatStudent(student), guestToken: guestToken ?? undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to create student");
    return res.status(500).json({ error: "Failed to create student" });
  }
});

// GET /students/:id
router.get("/students/:id", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });
    return res.json(formatStudent(student));
  } catch (err) {
    req.log.error({ err }, "Failed to get student");
    return res.status(500).json({ error: "Failed to get student" });
  }
});

// PATCH /students/:id
router.patch("/students/:id", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const updateData: Record<string, unknown> = {};
    const { name, college, city, year, field, githubUrl, cgpa, targetPackage, dreamCompany, isPro } = parsed.data;
    if (name !== undefined) updateData.name = name;
    if (college !== undefined) updateData.college = college;
    if (city !== undefined) updateData.city = city;
    if (year !== undefined) updateData.year = year;
    if (field !== undefined) updateData.field = field;
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl;
    if (cgpa !== undefined) updateData.cgpa = cgpa;
    if (targetPackage !== undefined) updateData.targetPackage = targetPackage;
    if (dreamCompany !== undefined) updateData.dreamCompany = dreamCompany;
    if (isPro !== undefined) updateData.isPro = isPro;
    const [student] = await db.update(studentsTable).set(updateData).where(eq(studentsTable.id, id)).returning();
    if (!student) return res.status(404).json({ error: "Student not found" });
    return res.json(formatStudent(student));
  } catch (err) {
    req.log.error({ err }, "Failed to update student");
    return res.status(500).json({ error: "Failed to update student" });
  }
});

// POST /students/:id/checkin — daily check-in (+50 XP, +1 streak)
router.post("/students/:id/checkin", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const today = new Date().toISOString().split("T")[0];
    if (student.lastActiveDate === today) {
      return res.json({ alreadyCheckedIn: true, student: formatStudent(student) });
    }

    const [updated] = await db.update(studentsTable)
      .set({
        xp: sql`${studentsTable.xp} + 50`,
        streakCount: sql`${studentsTable.streakCount} + 1`,
        lastActiveDate: today,
      })
      .where(eq(studentsTable.id, id))
      .returning();

    await db.insert(studentActivityLogTable).values({
      studentId: id,
      action: "daily_checkin",
      description: "Daily check-in",
      xpAmount: 50,
    });

    return res.json({ alreadyCheckedIn: false, student: formatStudent(updated) });
  } catch (err) {
    req.log.error({ err }, "Failed to check in");
    return res.status(500).json({ error: "Failed to check in" });
  }
});

// GET /students/:id/dashboard
router.get("/students/:id/dashboard", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Get quest progress
    const allQuests = await db.select().from(questsTable)
      .where(eq(questsTable.field, student.field))
      .orderBy(questsTable.year, questsTable.id);
    
    const studentQuests = await db.select().from(studentQuestsTable)
      .where(eq(studentQuestsTable.studentId, id));

    const completedCount = studentQuests.filter(sq => sq.status === "completed").length;
    const totalCount = allQuests.length;

    // Find today's quest
    const inProgressQuest = studentQuests.find(sq => sq.status === "in_progress");
    let todayQuest = null;
    if (inProgressQuest) {
      const quest = allQuests.find(q => q.id === inProgressQuest.questId);
      if (quest) todayQuest = formatQuest(quest);
    } else {
      // Find first not started quest for this student's year
      const yearQuests = allQuests.filter(q => q.year === student.year);
      for (const q of yearQuests) {
        const sq = studentQuests.find(sq => sq.questId === q.id);
        if (!sq || sq.status === "not_started") {
          todayQuest = formatQuest(q);
          break;
        }
      }
    }

    // College rank
    const allStudents = await db.select({
      id: studentsTable.id,
      overallScore: studentsTable.overallScore,
    }).from(studentsTable)
      .where(eq(studentsTable.college, student.college))
      .orderBy(desc(studentsTable.overallScore));

    const rank = allStudents.findIndex(s => s.id === id) + 1;
    const total = allStudents.length;
    const percentile = total > 1 ? Math.round((1 - (rank - 1) / total) * 100) : 100;

    // XP to next level
    const xpPerLevel = 500;
    const xpToNextLevel = xpPerLevel - (student.xp % xpPerLevel);

    // Top skills
    const skills = (student.skills as Record<string, number>) || {};
    const topSkills = Object.entries(skills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, score]) => ({ name, score }));

    return res.json({
      student: formatStudent(student),
      todayQuest,
      questProgress: { completed: completedCount, total: totalCount },
      topSkills,
      collegeRank: { rank, total, percentile },
      xpToNextLevel,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard");
    return res.status(500).json({ error: "Failed to get dashboard" });
  }
});

// GET /students/:id/wrapped
router.get("/students/:id/wrapped", requireStudent({ allowGuest: true }), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // India percentile
    const allStudentsIndia = await db.select({ overallScore: studentsTable.overallScore })
      .from(studentsTable).orderBy(desc(studentsTable.overallScore));
    const myRank = allStudentsIndia.findIndex(s => s.overallScore <= student.overallScore) + 1;
    const indiaPercentile = allStudentsIndia.length > 0 
      ? Math.round((1 - myRank / allStudentsIndia.length) * 100)
      : 82;

    const now = new Date();
    const month = now.toLocaleString("default", { month: "long", year: "numeric" });

    return res.json({
      studentId: student.id,
      name: student.name,
      college: student.college,
      streakDays: student.streakCount,
      xpGained: student.xp,
      scoreStart: Math.max(0, student.overallScore - Math.min(student.overallScore, 8)),
      scoreEnd: student.overallScore,
      indiaPercentile,
      month,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get wrapped");
    return res.status(500).json({ error: "Failed to get wrapped" });
  }
});

export function formatStudent(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    college: s.college,
    city: s.city,
    year: s.year,
    field: s.field,
    githubUrl: s.githubUrl ?? null,
    cgpa: s.cgpa ?? null,
    targetPackage: s.targetPackage ?? null,
    dreamCompany: s.dreamCompany ?? null,
    overallScore: s.overallScore,
    xp: s.xp,
    level: Math.max(1, Math.floor(s.xp / 500) + 1),
    streakCount: s.streakCount,
    lastActiveDate: s.lastActiveDate ?? null,
    skills: (s.skills as Record<string, number>) || {},
    isPro: s.isPro,
    targetRole: s.targetRole ?? null,
    targetBatch: s.targetBatch ?? null,
    baselineScore: s.baselineScore ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

function formatQuest(q: typeof questsTable.$inferSelect) {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    field: q.field,
    year: q.year,
    xpReward: q.xpReward,
    minutes: q.minutes,
    whyItMatters: q.whyItMatters,
    howToDoIt: q.howToDoIt,
  };
}

function getDefaultSkills(_field: string): Record<string, number> {
  return {};
}

export default router;
