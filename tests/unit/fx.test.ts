import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cache/two-tier", () => ({
  cacheGetJson: vi.fn(async () => null),
  cacheSetJson: vi.fn(async () => undefined),
}));

vi.mock("@/lib/net/circuit-breaker", () => ({
  isCircuitOpen: vi.fn(async () => false),
  recordCircuitFailure: vi.fn(async () => ({
    state: "closed",
    failures: 1,
    openedAt: 0,
    lastFailureAt: Date.now(),
  })),
  recordCircuitSuccess: vi.fn(async () => undefined),
}));

import { convertMoney, convertMoneyOrZero } from "@/lib/fx";
import { getUsdToEurRate } from "@/lib/fx-live";

describe("convertMoney", () => {
  it("returns null for missing values", () => {
    expect(convertMoney(null, "USD", "EUR", 0.9)).toBeNull();
    expect(convertMoney(Number.NaN, "USD", "EUR", 0.9)).toBeNull();
  });

  it("is a no-op for the same currency", () => {
    expect(convertMoney(10, "USD", "USD", 0.9)).toBe(10);
  });

  it("converts USD to EUR and back with rounding", () => {
    expect(convertMoney(100, "USD", "EUR", 0.92)).toBe(92);
    expect(convertMoney(92, "EUR", "USD", 0.92)).toBe(100);
  });

  it("uses the 0.92 fallback when the rate is invalid", () => {
    expect(convertMoney(100, "USD", "EUR", 0)).toBe(92);
    expect(convertMoney(100, "USD", "EUR", -1)).toBe(92);
  });

  it("treats missing amounts as zero in convertMoneyOrZero", () => {
    expect(convertMoneyOrZero(null, "USD", "EUR", 0.9)).toBe(0);
    expect(convertMoneyOrZero(10, "USD", "USD")).toBe(10);
  });
});

describe("getUsdToEurRate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to 0.92 when Frankfurter is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );
    await expect(getUsdToEurRate(true)).resolves.toBe(0.92);
  });
});
