import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cs-catalog", () => ({
  getCatalogPayload: vi.fn(),
  enrichSlimItemsWithPrices: vi.fn((items: unknown) => items),
}));

vi.mock("@/lib/steam-market/csgotrader", () => ({
  getCsgoTraderSteamCatalog: vi.fn(),
}));

import { GET } from "@/app/api/cs-catalog/route";
import { getCatalogPayload } from "@/lib/cs-catalog";
import { getCsgoTraderSteamCatalog } from "@/lib/steam-market/csgotrader";

describe("GET /api/cs-catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns catalog items even when Steam price enrich fails", async () => {
    vi.mocked(getCatalogPayload).mockResolvedValue({
      items: [
        {
          id: "skin-1",
          name: "AK-47 | Redline",
          image: null,
          kind: "skin",
        } as never,
      ],
      collections: [{ id: "set-1", name: "Phoenix", image: null, itemCount: 1, isSkinCollection: true }],
    });
    vi.mocked(getCsgoTraderSteamCatalog).mockRejectedValue(
      new Error("trader down"),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      items: Array<{ id: string }>;
      collections: Array<{ id: string }>;
    };
    expect(json.items).toHaveLength(1);
    expect(json.collections).toHaveLength(1);
  });

  it("returns 502 when the catalog payload fails", async () => {
    vi.mocked(getCatalogPayload).mockRejectedValue(new Error("bycsgoapi down"));
    const res = await GET();
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Failed to load CS item catalog.");
  });
});
