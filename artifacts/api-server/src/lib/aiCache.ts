import { createHash } from "node:crypto";
import { eq, lt, sql } from "drizzle-orm";
import { db, aiCacheTable } from "@workspace/db";
import { logger } from "./logger";

function hashKey(namespace: string, parts: unknown[]): string {
  const raw = JSON.stringify(parts);
  const h = createHash("sha256").update(raw).digest("hex").slice(0, 32);
  return `${namespace}:${h}`;
}

export interface CacheOptions {
  namespace: string;
  keyParts: unknown[];
  ttlSeconds: number;
}

export async function cacheGet<T>(opts: CacheOptions): Promise<T | null> {
  const key = hashKey(opts.namespace, opts.keyParts);
  try {
    const [row] = await db
      .select()
      .from(aiCacheTable)
      .where(eq(aiCacheTable.key, key))
      .limit(1);
    if (!row) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;
    db.update(aiCacheTable)
      .set({ hits: sql`${aiCacheTable.hits} + 1` })
      .where(eq(aiCacheTable.key, key))
      .catch(() => undefined);
    return row.value as T;
  } catch (err) {
    logger.warn({ err, key }, "aiCache.get failed");
    return null;
  }
}

export async function cacheSet<T>(opts: CacheOptions, value: T): Promise<void> {
  const key = hashKey(opts.namespace, opts.keyParts);
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000);
  try {
    await db
      .insert(aiCacheTable)
      .values({ key, namespace: opts.namespace, value: value as object, expiresAt, hits: 0 })
      .onConflictDoUpdate({
        target: aiCacheTable.key,
        set: { value: value as object, expiresAt, namespace: opts.namespace },
      });
  } catch (err) {
    logger.warn({ err, key }, "aiCache.set failed");
  }
}

export async function cacheGetOrSet<T>(opts: CacheOptions, producer: () => Promise<T>): Promise<{ value: T; cached: boolean }> {
  const cached = await cacheGet<T>(opts);
  if (cached !== null) return { value: cached, cached: true };
  const fresh = await producer();
  await cacheSet(opts, fresh);
  return { value: fresh, cached: false };
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export async function sweepExpiredIfDue(): Promise<void> {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  try {
    await db.delete(aiCacheTable).where(lt(aiCacheTable.expiresAt, new Date()));
  } catch (err) {
    logger.warn({ err }, "aiCache.sweep failed");
  }
}
