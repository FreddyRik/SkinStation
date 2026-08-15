import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tradeup/catalog", () => ({
  buildTradeUpCatalogPayload: vi.fn(),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({
    ok: true,
    remaining: 10,
    retryAfterSec: 0,
  })),
  clientIpFromRequest: vi.fn(() => "1.2.3.4"),
}));

import { GET } from "@/app/api/tradeup/catalog/route";
import { buildTradeUpCatalogPayload } from "@/lib/tradeup/catalog";

describe("GET /api/tradeup/catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults an invalid currency to USD", async () => {
    vi.mocked(buildTradeUpCatalogPayload).mockResolvedValue({
      skins: [],
      collections: [],
      crates: [],
      prices: {},
      goodsIds: {},
      currency: "USD",
    });
    const res = await GET(
      new Request("http://localhost/api/tradeup/catalog?currency=gbp"),
    );
    expect(res.status).toBe(200);
    expect(buildTradeUpCatalogPayload).toHaveBeenCalledWith("USD");
  });

  it("passes usd through to the catalog loader", async () => {
    vi.mocked(buildTradeUpCatalogPayload).mockResolvedValue({
      skins: [],
      collections: [],
      crates: [],
      prices: {},
      goodsIds: {},
      currency: "USD",
    });
    const res = await GET(
      new Request("http://localhost/api/tradeup/catalog?currency=USD"),
    );
    expect(res.status).toBe(200);
    expect(buildTradeUpCatalogPayload).toHaveBeenCalledWith("USD");
  });

  it("returns 502 when the catalog loader fails", async () => {
    vi.mocked(buildTradeUpCatalogPayload).mockRejectedValue(
      new Error("prices unavailable"),
    );
    const res = await GET(new Request("http://localhost/api/tradeup/catalog"));
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Failed to load trade-up catalog.");
  });
});
