import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface StudentAuthedRequest extends Request {
  student?: typeof studentsTable.$inferSelect;
}

interface RequireStudentOptions {
  /** Allow an unauthenticated guest to act on their own unclaimed row via x-guest-token. */
  allowGuest?: boolean;
  /** Which route param carries the target studentId. Falls back to req.body.studentId. */
  param?: "id" | "sid" | "studentId";
}

type AuthResult =
  | { ok: true; student: typeof studentsTable.$inferSelect }
  | { ok: false; status: number; error: string; code?: string };

/**
 * Core ownership check, reusable by both the id-in-URL middleware below and routes
 * that only have a nested resource id (e.g. an interview session id) and must first
 * resolve it to a studentId before checking access.
 */
export async function authorizeStudentAccess(req: Request, targetId: number, allowGuest: boolean): Promise<AuthResult> {
  const { userId } = getAuth(req);

  if (userId) {
    const [row] = await db.select().from(studentsTable).where(eq(studentsTable.clerkUserId, userId)).limit(1);
    if (!row) return { ok: false, status: 403, error: "No student profile for this account", code: "NEEDS_CLAIM" };
    if (row.id !== targetId) return { ok: false, status: 403, error: "Forbidden" };
    return { ok: true, student: row };
  }

  if (!allowGuest) return { ok: false, status: 401, error: "Sign in required" };

  const guestToken = req.header("x-guest-token");
  if (!guestToken) return { ok: false, status: 401, error: "Missing guest session" };

  const [row] = await db.select().from(studentsTable).where(eq(studentsTable.id, targetId)).limit(1);
  if (!row || row.clerkUserId !== null || row.guestToken !== guestToken) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, student: row };
}

/**
 * Verifies the caller owns the studentId in the request (param or body), either via
 * a Clerk session (clerkUserId match) or, where explicitly allowed, a guest token.
 * A claimed row (clerkUserId set) can never be driven anonymously, even with the
 * right guest token — the token is nulled at claim time in /auth/claim.
 */
export function requireStudent(opts: RequireStudentOptions = {}): RequestHandler {
  return async (req: StudentAuthedRequest, res: Response, next: NextFunction) => {
    const paramKey = opts.param ?? "id";
    const raw = req.params[paramKey] ?? req.body?.studentId;
    const targetId = Number(raw);
    if (!raw || isNaN(targetId)) {
      res.status(400).json({ error: "Invalid or missing studentId" });
      return;
    }

    try {
      const result = await authorizeStudentAccess(req, targetId, opts.allowGuest ?? false);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error, ...(result.code ? { code: result.code } : {}) });
        return;
      }
      req.student = result.student;
      next();
    } catch (err) {
      req.log.error({ err }, "student auth lookup failed");
      res.status(500).json({ error: "Auth error" });
    }
  };
}

/**
 * For routes keyed by a nested resource id (not studentId itself) — looks up the
 * resource's studentId via `loadStudentId`, then applies the same ownership check.
 */
export function requireStudentViaResource(
  loadStudentId: (req: Request) => Promise<number | null>,
  opts: { allowGuest?: boolean } = {},
): RequestHandler {
  return async (req: StudentAuthedRequest, res: Response, next: NextFunction) => {
    try {
      const studentId = await loadStudentId(req);
      if (studentId === null) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const result = await authorizeStudentAccess(req, studentId, opts.allowGuest ?? false);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error, ...(result.code ? { code: result.code } : {}) });
        return;
      }
      req.student = result.student;
      next();
    } catch (err) {
      req.log.error({ err }, "student auth lookup failed");
      res.status(500).json({ error: "Auth error" });
    }
  };
}
