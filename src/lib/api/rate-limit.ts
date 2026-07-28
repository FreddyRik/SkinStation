/**
 * Rate limiting for Edge middleware and Node route handlers.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set (shared across Vercel instances). Falls back to in-memory otherwise.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

const upstashLimiters = new Map<string, Ratelimit>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token, keepAlive: true });
}

function hasUpstashEnv(): boolean {
  return Boolean(getRedis());
}

function getUpstashLimiter(
  name: string,
  opts: { limit: number; windowMs: number },
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${name}:${opts.limit}:${opts.windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.limit, `${windowSec} s`),
      prefix: `skinstation:${name}`,
      analytics: false,
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

function memoryRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const refillPerMs = opts.limit / opts.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      const evict = Math.ceil(MAX_BUCKETS * 0.1);
      const keys = buckets.keys();
      for (let i = 0; i < evict; i++) {
        const next = keys.next();
        if (next.done) break;
        buckets.delete(next.value);
      }
    }
    bucket = { tokens: opts.limit, updatedAt: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(opts.limit, bucket.tokens + elapsed * refillPerMs);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    const retryAfterSec = Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  bucket.tokens -= 1;
  return {
    ok: true,
    remaining: Math.floor(bucket.tokens),
    retryAfterSec: 0,
  };
}

/** Sync / compatible entry used by middleware (async for Upstash). */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number; name?: string },
): Promise<RateLimitResult> {
  if (hasUpstashEnv()) {
    try {
      const limiter = getUpstashLimiter(opts.name ?? "default", opts);
      if (!limiter) {
        return memoryRateLimit(key, opts);
      }
      const result = await limiter.limit(key);
      const retryAfterSec = result.success
        ? 0
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      return {
        ok: result.success,
        remaining: result.remaining,
        retryAfterSec,
      };
    } catch (err) {
      console.error("Upstash rate limit failed; falling back to memory:", err);
    }
  }
  return memoryRateLimit(key, opts);
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
