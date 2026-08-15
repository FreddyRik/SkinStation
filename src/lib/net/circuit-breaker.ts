/**
 * Per-process circuit breaker for optional upstreams (inspect API, Steamwebapi, FX).
 * On Vercel each isolate has its own state — Redis is used when configured so
 * a dead provider is skipped across instances after the failure threshold.
 */

import { getRedis } from "@/lib/cache/redis";

export type CircuitState = "closed" | "open" | "half_open";

export type CircuitSnapshot = {
  state: CircuitState;
  failures: number;
  openedAt: number;
  lastFailureAt: number;
};

export type CircuitOptions = {
  failureThreshold: number;
  resetMs: number;
};

const DEFAULT_OPTIONS: CircuitOptions = {
  failureThreshold: 4,
  resetMs: 30_000,
};

const memory = new Map<string, CircuitSnapshot>();

function closedSnapshot(): CircuitSnapshot {
  return { state: "closed", failures: 0, openedAt: 0, lastFailureAt: 0 };
}

function redisKey(name: string): string {
  return `skinstation:circuit:${name}`;
}

async function readSnapshot(name: string): Promise<CircuitSnapshot> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<CircuitSnapshot>(redisKey(name));
      if (raw && typeof raw === "object" && "state" in raw) {
        return raw;
      }
    } catch (err) {
      console.warn("Circuit breaker Redis read failed:", err);
    }
  }
  return memory.get(name) ?? closedSnapshot();
}

async function writeSnapshot(name: string, snapshot: CircuitSnapshot): Promise<void> {
  memory.set(name, snapshot);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(redisKey(name), snapshot, { ex: 120 });
  } catch (err) {
    console.warn("Circuit breaker Redis write failed:", err);
  }
}

export function resolveCircuitState(
  snapshot: CircuitSnapshot,
  now: number,
  options: CircuitOptions = DEFAULT_OPTIONS,
): CircuitState {
  if (snapshot.state === "open" && now - snapshot.openedAt >= options.resetMs) {
    return "half_open";
  }
  return snapshot.state;
}

export async function isCircuitOpen(
  name: string,
  options: CircuitOptions = DEFAULT_OPTIONS,
): Promise<boolean> {
  const snapshot = await readSnapshot(name);
  return resolveCircuitState(snapshot, Date.now(), options) === "open";
}

export async function recordCircuitSuccess(name: string): Promise<void> {
  await writeSnapshot(name, closedSnapshot());
}

export async function recordCircuitFailure(
  name: string,
  options: CircuitOptions = DEFAULT_OPTIONS,
): Promise<CircuitSnapshot> {
  const now = Date.now();
  const prev = await readSnapshot(name);
  const state = resolveCircuitState(prev, now, options);
  const failures = state === "half_open" ? options.failureThreshold : prev.failures + 1;
  const next: CircuitSnapshot =
    failures >= options.failureThreshold
      ? {
          state: "open",
          failures,
          openedAt: now,
          lastFailureAt: now,
        }
      : {
          state: "closed",
          failures,
          openedAt: 0,
          lastFailureAt: now,
        };
  await writeSnapshot(name, next);
  return next;
}

export type CircuitRunResult<T> =
  | { ok: true; value: T }
  | { ok: false; skipped: true }
  | { ok: false; skipped: false; error: unknown };

/** Run `fn` unless the named circuit is open. Failures trip the breaker. */
export async function runWithCircuit<T>(
  name: string,
  fn: () => Promise<T>,
  options: CircuitOptions = DEFAULT_OPTIONS,
): Promise<CircuitRunResult<T>> {
  const snapshot = await readSnapshot(name);
  const state = resolveCircuitState(snapshot, Date.now(), options);
  if (state === "open") {
    return { ok: false, skipped: true };
  }
  try {
    const value = await fn();
    await recordCircuitSuccess(name);
    return { ok: true, value };
  } catch (error) {
    await recordCircuitFailure(name, options);
    return { ok: false, skipped: false, error };
  }
}
