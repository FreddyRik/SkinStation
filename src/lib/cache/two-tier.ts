/**
 * Two-tier cache: Redis (short TTL) + PostgreSQL KvCache (stale-while-revalidate).
 * Uses parameterized SQL so reads work even before `prisma generate` picks up KvCache.
 */

import { Prisma } from "@prisma/client";
import type { ZodType } from "zod";
import { getRedis } from "@/lib/cache/redis";
import { prisma } from "@/lib/db";

export type CacheRead<T> = {
  value: T;
  /** True when Redis missed and the Postgres row is past `freshMs`. */
  stale: boolean;
};

type KvRow = {
  value: string;
  fetchedAt: Date;
};

async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const value = await redis.get<string>(key);
    return typeof value === "string" ? value : value != null ? JSON.stringify(value) : null;
  } catch (err) {
    console.warn("Redis cache get failed:", err);
    return null;
  }
}

async function redisSet(key: string, value: string, ttlSec: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: Math.max(1, ttlSec) });
  } catch (err) {
    console.warn("Redis cache set failed:", err);
  }
}

function parseWithSchema<T>(raw: string, schema: ZodType<T>): T | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function postgresGet(key: string): Promise<KvRow | null> {
  try {
    const rows = await prisma.$queryRaw<KvRow[]>(Prisma.sql`
      SELECT value, "fetchedAt"
      FROM "KvCache"
      WHERE key = ${key}
      LIMIT 1
    `);
    return rows[0] ?? null;
  } catch (err) {
    console.warn("Postgres KvCache read failed:", err);
    return null;
  }
}

async function postgresSet(key: string, value: string): Promise<void> {
  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "KvCache" (key, value, "fetchedAt", "updatedAt")
      VALUES (${key}, ${value}, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          "fetchedAt" = EXCLUDED."fetchedAt",
          "updatedAt" = EXCLUDED."updatedAt"
    `);
  } catch (err) {
    console.warn("Postgres KvCache write failed:", err);
  }
}

/** Read Redis first, then Postgres. `stale` is true when only a Postgres row older than `freshMs` exists. */
export async function cacheGetJson<T>(
  key: string,
  schema: ZodType<T>,
  options: { freshMs: number },
): Promise<CacheRead<T> | null> {
  const redisRaw = await redisGet(key);
  if (redisRaw) {
    const value = parseWithSchema(redisRaw, schema);
    if (value != null) return { value, stale: false };
  }

  const row = await postgresGet(key);
  if (!row) return null;
  const value = parseWithSchema(row.value, schema);
  if (value == null) return null;
  const age = Date.now() - new Date(row.fetchedAt).getTime();
  return { value, stale: age > options.freshMs };
}

export async function cacheSetJson(
  key: string,
  value: unknown,
  options: { redisTtlSec: number },
): Promise<void> {
  const serialized = JSON.stringify(value);
  await redisSet(key, serialized, options.redisTtlSec);
  await postgresSet(key, serialized);
}
