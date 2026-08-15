import { describe, expect, it } from "vitest";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";

describe("clientIpFromRequest", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
        "x-real-ip": "9.9.9.9",
      },
    });
    expect(clientIpFromRequest(req)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(
      clientIpFromRequest(
        new Request("http://localhost", { headers: { "x-real-ip": "8.8.8.8" } }),
      ),
    ).toBe("8.8.8.8");
    expect(clientIpFromRequest(new Request("http://localhost"))).toBe("unknown");
  });
});

describe("in-memory rateLimit", () => {
  it("allows traffic under the limit then blocks with Retry-After", async () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 2, windowMs: 60_000, name: "unit" };
    const first = await rateLimit(key, opts);
    const second = await rateLimit(key, opts);
    const third = await rateLimit(key, opts);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
