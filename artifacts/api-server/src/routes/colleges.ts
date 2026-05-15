import { Router } from "express";
import { db } from "@workspace/db";
import { collegesTable, studentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const c = genCode();
    const [hit] = await db.select({ id: collegesTable.id }).from(collegesTable).where(eq(collegesTable.inviteCode, c));
    if (!hit) return c;
  }
  return genCode() + Date.now().toString(36).slice(-3).toUpperCase();
}

// GET or auto-create the TPO's college
router.get("/tpo/my-college", async (req, res) => {
  try {
    const email = String(req.query.email || "").toLowerCase().trim();
    const name = String(req.query.name || "").trim();
    const collegeName = String(req.query.college || "").trim();
    if (!email) return res.status(400).json({ error: "email required" });

    const [existing] = await db.select().from(collegesTable).where(eq(collegesTable.tpoEmail, email)).limit(1);
    if (existing) return res.json(existing);

    if (!collegeName) return res.status(404).json({ error: "no college, provide college to create" });
    const code = await uniqueCode();
    const [created] = await db.insert(collegesTable).values({
      name: collegeName, tpoEmail: email, tpoName: name || null, inviteCode: code,
    }).returning();
    return res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed my-college");
    return res.status(500).json({ error: "Failed to load college" });
  }
});

// Regenerate invite code
router.post("/tpo/colleges/:id/regenerate", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const code = await uniqueCode();
    const [updated] = await db.update(collegesTable).set({ inviteCode: code }).where(eq(collegesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed regenerate");
    return res.status(500).json({ error: "Failed to regenerate" });
  }
});

// PUBLIC: resolve invite code
router.get("/invite/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase().trim();
    if (!code) return res.status(400).json({ error: "code required" });
    const [college] = await db.select({
      id: collegesTable.id,
      name: collegesTable.name,
      city: collegesTable.city,
      logoUrl: collegesTable.logoUrl,
      signupCount: collegesTable.signupCount,
      inviteCode: collegesTable.inviteCode,
    }).from(collegesTable).where(eq(collegesTable.inviteCode, code)).limit(1);
    if (!college) return res.status(404).json({ error: "Invalid invite link" });
    return res.json(college);
  } catch (err) {
    req.log.error({ err }, "Failed resolve invite");
    return res.status(500).json({ error: "Failed to resolve invite" });
  }
});

// Bind a freshly-created student to a college via invite code (called right after signup)
router.post("/invite/:code/claim", async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase().trim();
    const studentId = Number(req.body?.studentId);
    if (!code || !Number.isFinite(studentId)) return res.status(400).json({ error: "code and studentId required" });
    const [college] = await db.select().from(collegesTable).where(eq(collegesTable.inviteCode, code)).limit(1);
    if (!college) return res.status(404).json({ error: "Invalid invite" });
    await db.update(studentsTable)
      .set({ collegeId: college.id, college: college.name })
      .where(eq(studentsTable.id, studentId));
    await db.update(collegesTable)
      .set({ signupCount: sql`${collegesTable.signupCount} + 1` })
      .where(eq(collegesTable.id, college.id));
    return res.json({ ok: true, collegeId: college.id, collegeName: college.name });
  } catch (err) {
    req.log.error({ err }, "Failed claim invite");
    return res.status(500).json({ error: "Failed to claim invite" });
  }
});

export default router;
