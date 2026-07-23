/**
 * Lightweight in-memory token bucket for Edge middleware.
 * Suitable for single-instance / local deployments; not shared across replicas.
 */

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 5_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const refillPerMs = opts.limit / opts.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Evict oldest ~10% when map grows too large.
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
