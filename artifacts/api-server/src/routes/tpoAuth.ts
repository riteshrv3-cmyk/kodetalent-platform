import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db, tpoAccountsTable, tpoSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireTpo, type TpoAuthedRequest } from "../middlewares/tpoAuth";
import { emailDomainMatchesCollege } from "../lib/tpoVerifiedDomains";

const router = Router();

const SCRYPT_N = 16384;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const N = parseInt(parts[1]!, 10);
  const salt = Buffer.from(parts[2]!, "hex");
  const expected = Buffer.from(parts[3]!, "hex");
  const actual = scryptSync(password, salt, expected.length, { N });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function issueSession(accountId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(tpoSessionsTable).values({ token, accountId, expiresAt });
  return { token, expiresAt };
}

router.post("/tpo/signup", async (req, res): Promise<void> => {
  const { email, password, name, college, dept } = req.body as {
    email?: string; password?: string; name?: string; college?: string; dept?: string;
  };
  if (!email?.trim() || !password || password.length < 6 || !name?.trim() || !college?.trim()) {
    res.status(400).json({ error: "email, password (>=6 chars), name and college are required" });
    return;
  }
  try {
    const normEmail = email.trim().toLowerCase();
    const [existing] = await db.select().from(tpoAccountsTable).where(eq(tpoAccountsTable.email, normEmail)).limit(1);
    if (existing) { res.status(409).json({ error: "Email already registered" }); return; }
    const trimmedCollege = college.trim();
    // Early-traction mode: auto-verify all signups so TPOs can immediately
    // post drives. Re-enable strict verification later once we have scale.
    const [acct] = await db
      .insert(tpoAccountsTable)
      .values({
        email: normEmail,
        passwordHash: hashPassword(password),
        name: name.trim(),
        college: trimmedCollege,
        dept: dept?.trim() || null,
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: "auto:open-signup",
      })
      .returning();
    const session = await issueSession(acct.id);
    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      tpo: {
        id: acct.id, email: acct.email, name: acct.name,
        college: acct.college, dept: acct.dept, verified: acct.verified,
      },
    });
  } catch (err) {
    req.log.error({ err }, "TPO signup failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/tpo/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  try {
    const normEmail = email.trim().toLowerCase();
    const [acct] = await db.select().from(tpoAccountsTable).where(eq(tpoAccountsTable.email, normEmail)).limit(1);
    if (!acct || !verifyPassword(password, acct.passwordHash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const session = await issueSession(acct.id);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      tpo: {
        id: acct.id, email: acct.email, name: acct.name,
        college: acct.college, dept: acct.dept, verified: acct.verified,
      },
    });
  } catch (err) {
    req.log.error({ err }, "TPO login failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/tpo/logout", requireTpo, async (req: TpoAuthedRequest, res): Promise<void> => {
  const auth = req.header("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(auth.trim())?.[1]?.trim();
  if (token) await db.delete(tpoSessionsTable).where(eq(tpoSessionsTable.token, token));
  res.json({ ok: true });
});

router.get("/tpo/me", requireTpo, async (req: TpoAuthedRequest, res): Promise<void> => {
  res.json(req.tpo);
});

export default router;
