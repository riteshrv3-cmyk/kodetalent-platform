import type { Request, Response, NextFunction } from "express";
import { db, tpoAccountsTable, tpoSessionsTable } from "@workspace/db";
import { eq, gt, and } from "drizzle-orm";

export interface TpoAuthedRequest extends Request {
  tpo?: { accountId: number; college: string; name: string };
}

export async function requireTpo(req: TpoAuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.header("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  const token = m?.[1]?.trim();
  if (!token) {
    res.status(401).json({ error: "Missing TPO session token" });
    return;
  }
  try {
    const now = new Date();
    const [row] = await db
      .select({
        accountId: tpoAccountsTable.id,
        college: tpoAccountsTable.college,
        name: tpoAccountsTable.name,
        verified: tpoAccountsTable.verified,
      })
      .from(tpoSessionsTable)
      .innerJoin(tpoAccountsTable, eq(tpoAccountsTable.id, tpoSessionsTable.accountId))
      .where(and(eq(tpoSessionsTable.token, token), gt(tpoSessionsTable.expiresAt, now)))
      .limit(1);
    if (!row) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    if (!row.verified) {
      res.status(403).json({ error: "Your TPO account is pending verification. Drives posted from unverified accounts will NOT show as official to students." });
      return;
    }
    req.tpo = { accountId: row.accountId, college: row.college, name: row.name };
    next();
  } catch (err) {
    req.log.error({ err }, "TPO auth lookup failed");
    res.status(500).json({ error: "Auth error" });
  }
}
