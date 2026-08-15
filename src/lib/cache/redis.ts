import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

/** Shared Upstash REST client, or null when env is unset. */
export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redis = null;
    return null;
  }
  redis = new Redis({ url, token, keepAlive: true });
  return redis;
}

export function hasUpstashEnv(): boolean {
  return getRedis() != null;
}
