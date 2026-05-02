import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, questsTable, studentQuestsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateStudentBody,
  UpdateStudentBody,
} from "@workspace/api-zod";

const router = Router();

// POST /students — create student
router.post("/students", async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { name, email, college, city, year, field, githubUrl, cgpa, targetPackage, dreamCompany } = parsed.data;
  try {
    const existing = await db.select().from(studentsTable).where(eq(studentsTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(201).json(formatStudent(existing[0]));
    }
    const defaultSkills = getDefaultSkills(field as string);
    const [student] = await db.insert(studentsTable).values({
      name,
      email,
      college,
      city,
      year,
      field: field as string,
      githubUrl: githubUrl ?? null,
      cgpa: cgpa ?? null,
      targetPackage: targetPackage ?? null,
      dreamCompany: dreamCompany ?? null,
      overallScore: 42 + Math.floor(Math.random() * 20),
      xp: Math.floor(Math.random() * 300) + 100,
      level: 1,
      streakCount: Math.floor(Math.random() * 5),
      lastActiveDate: new Date().toISOString().split("T")[0],
      skills: defaultSkills,
      isPro: false,
    }).returning();
    return res.status(201).json(formatStudent(student));
  } catch (err) {
    req.log.error({ err }, "Failed to create student");
    return res.status(500).json({ error: "Failed to create student" });
  }
});

// GET /students/:id
router.get("/students/:id", async (req, res) => {
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
router.patch("/students/:id", async (req, res) => {
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

// GET /students/by-email/:email
router.get("/students/by-email/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.email, email)).limit(1);
    if (!student) return res.status(404).json({ error: "Student not found" });
    return res.json(formatStudent(student));
  } catch (err) {
    req.log.error({ err }, "Failed to get student by email");
    return res.status(500).json({ error: "Failed to get student by email" });
  }
});

// GET /students/:id/dashboard
router.get("/students/:id/dashboard", async (req, res) => {
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
router.get("/students/:id/wrapped", async (req, res) => {
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
      scoreStart: Math.max(0, student.overallScore - Math.floor(Math.random() * 15)),
      scoreEnd: student.overallScore,
      indiaPercentile,
      month,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get wrapped");
    return res.status(500).json({ error: "Failed to get wrapped" });
  }
});

function formatStudent(s: typeof studentsTable.$inferSelect) {
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

function getDefaultSkills(field: string): Record<string, number> {
  const base: Record<string, number> = {
    "Python": 30 + Math.floor(Math.random() * 40),
    "DSA": 20 + Math.floor(Math.random() * 30),
    "Git": 40 + Math.floor(Math.random() * 30),
  };
  if (field === "Web Dev" || field === "App Dev") {
    base["React"] = 20 + Math.floor(Math.random() * 40);
    base["JavaScript"] = 30 + Math.floor(Math.random() * 40);
  } else if (field === "AI/ML" || field === "Data") {
    base["NumPy"] = 20 + Math.floor(Math.random() * 40);
    base["Pandas"] = 20 + Math.floor(Math.random() * 30);
    base["ML"] = 10 + Math.floor(Math.random() * 30);
  } else if (field === "Cybersecurity") {
    base["Networking"] = 20 + Math.floor(Math.random() * 30);
    base["Linux"] = 30 + Math.floor(Math.random() * 30);
  }
  return base;
}

export default router;
