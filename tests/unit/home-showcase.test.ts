import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cs-catalog/catalog", () => ({
  getCatalogItems: vi.fn(),
}));

import { getHomeShowcase } from "@/lib/home-showcase";
import { getCatalogItems } from "@/lib/cs-catalog/catalog";

describe("getHomeShowcase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty showcase arrays when the catalog fails", async () => {
    vi.mocked(getCatalogItems).mockRejectedValue(new Error("github raw down"));
    await expect(getHomeShowcase()).resolves.toEqual({
      constellation: [],
      databasePreviews: [],
      tradeupPreviews: [],
    });
  });
});
