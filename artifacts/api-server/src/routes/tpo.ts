import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, recruiterInvites, mentors } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";

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
  res.json(enriched);
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

export default router;
