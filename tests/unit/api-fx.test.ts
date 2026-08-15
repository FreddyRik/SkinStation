import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/fx", () => ({
  getUsdToEurRate: vi.fn(),
}));

import { GET } from "@/app/api/fx/route";
import { getUsdToEurRate } from "@/lib/fx";

describe("GET /api/fx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the USD→EUR rate and inverse", async () => {
    vi.mocked(getUsdToEurRate).mockResolvedValue(0.91);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { usdToEur: number; eurToUsd: number };
    expect(json.usdToEur).toBe(0.91);
    expect(json.eurToUsd).toBeCloseTo(1 / 0.91, 5);
  });
});
