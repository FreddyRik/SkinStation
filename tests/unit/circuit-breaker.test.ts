import { describe, expect, it } from "vitest";
import {
  recordCircuitFailure,
  recordCircuitSuccess,
  resolveCircuitState,
  runWithCircuit,
} from "@/lib/net/circuit-breaker";
import { backoffDelayMs } from "@/lib/net/resilient-fetch";
import { isForbiddenHostname, parseHttpsUrl } from "@/lib/net/ssrf";

describe("circuit breaker", () => {
  it("opens after the failure threshold and recovers after reset", () => {
    const snapshot = {
      state: "closed" as const,
      failures: 3,
      openedAt: 0,
      lastFailureAt: 0,
    };
    const opened = {
      state: "open" as const,
      failures: 4,
      openedAt: 1_000,
      lastFailureAt: 1_000,
    };
    expect(resolveCircuitState(snapshot, 1_000, { failureThreshold: 4, resetMs: 30_000 })).toBe(
      "closed",
    );
    expect(resolveCircuitState(opened, 1_000, { failureThreshold: 4, resetMs: 30_000 })).toBe(
      "open",
    );
    expect(resolveCircuitState(opened, 32_000, { failureThreshold: 4, resetMs: 30_000 })).toBe(
      "half_open",
    );
  });

  it("skips work when the named circuit is open after recorded failures", async () => {
    const name = `unit-${Math.random()}`;
    const opts = { failureThreshold: 2, resetMs: 60_000 };
    await recordCircuitFailure(name, opts);
    await recordCircuitFailure(name, opts);
    const skipped = await runWithCircuit(name, async () => "ok", opts);
    expect(skipped).toEqual({ ok: false, skipped: true });
    await recordCircuitSuccess(name);
    const recovered = await runWithCircuit(name, async () => "ok", opts);
    expect(recovered).toEqual({ ok: true, value: "ok" });
  });
});

describe("backoffDelayMs", () => {
  it("grows exponentially and stays capped", () => {
    expect(backoffDelayMs(0, 250, 4_000)).toBeGreaterThanOrEqual(250);
    expect(backoffDelayMs(1, 250, 4_000)).toBeGreaterThanOrEqual(500);
    expect(backoffDelayMs(8, 250, 4_000)).toBeLessThanOrEqual(4_000 + 120);
  });
});

describe("SSRF URL parse", () => {
  it("rejects non-HTTPS, credentials, IPs, and localhost", () => {
    expect(parseHttpsUrl("http://example.com")).toBeNull();
    expect(parseHttpsUrl("https://user:pass@example.com")).toBeNull();
    expect(parseHttpsUrl("https://127.0.0.1/foo")).toBeNull();
    expect(isForbiddenHostname("localhost")).toBe(true);
    expect(isForbiddenHostname("169.254.169.254")).toBe(true);
    expect(parseHttpsUrl("https://inspect.example.com/api")).not.toBeNull();
  });
});
