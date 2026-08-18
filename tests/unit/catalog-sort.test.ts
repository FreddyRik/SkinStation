import { describe, expect, it } from "vitest";
import { databaseHref } from "@/components/database/catalog-links";
import {
  catalogItemSortPrice,
  parseCatalogSort,
  sortCatalogItems,
} from "@/lib/cs-catalog/sort";

function row(
  name: string,
  priceMinUsd: number | null,
  extras?: {
    rarityName?: string;
    stattrakPriceMinUsd?: number | null;
  },
) {
  return {
    name,
    priceMinUsd,
    stattrakPriceMinUsd: extras?.stattrakPriceMinUsd ?? null,
    rarity: extras?.rarityName
      ? { id: "", name: extras.rarityName, color: "#fff" }
      : null,
  };
}

describe("parseCatalogSort", () => {
  it("accepts known keys and falls back otherwise", () => {
    expect(parseCatalogSort("price_desc")).toBe("price_desc");
    expect(parseCatalogSort("price_asc")).toBe("price_asc");
    expect(parseCatalogSort("rarity")).toBe("rarity");
    expect(parseCatalogSort("nope")).toBe("rarity");
    expect(parseCatalogSort(null)).toBe("rarity");
  });
});

describe("catalogItemSortPrice", () => {
  it("uses the normal floor, then StatTrak, and ignores non-finite values", () => {
    expect(catalogItemSortPrice(row("A", 12.5))).toBe(12.5);
    expect(
      catalogItemSortPrice(row("B", null, { stattrakPriceMinUsd: 40 })),
    ).toBe(40);
    expect(catalogItemSortPrice(row("C", Number.NaN))).toBeNull();
  });
});

describe("sortCatalogItems", () => {
  const items = [
    row("AK-47 | Blue", 5, { rarityName: "Mil-Spec Grade" }),
    row("AK-47 | Gold", 200, { rarityName: "Covert" }),
    row("AK-47 | Fade", null, { rarityName: "Classified" }),
  ];

  it("sorts rarest first by default", () => {
    expect(sortCatalogItems(items, "rarity").map((i) => i.name)).toEqual([
      "AK-47 | Gold",
      "AK-47 | Fade",
      "AK-47 | Blue",
    ]);
  });

  it("sorts by price high to low and keeps unpriced last", () => {
    expect(sortCatalogItems(items, "price_desc").map((i) => i.name)).toEqual([
      "AK-47 | Gold",
      "AK-47 | Blue",
      "AK-47 | Fade",
    ]);
  });

  it("sorts by price low to high and keeps unpriced last", () => {
    expect(sortCatalogItems(items, "price_asc").map((i) => i.name)).toEqual([
      "AK-47 | Blue",
      "AK-47 | Gold",
      "AK-47 | Fade",
    ]);
  });
});

describe("databaseHref", () => {
  it("omits default rarity sort from the query string", () => {
    expect(databaseHref({ section: "home" })).toBe("/database");
    expect(databaseHref({ section: "rifles", weapon: null })).toBe(
      "/database?section=rifles",
    );
  });

  it("keeps section, weapon, and price sort in shareable URLs", () => {
    expect(
      databaseHref({ section: "rifles", weapon: "AK-47" }, "price_desc"),
    ).toBe("/database?section=rifles&weapon=AK-47&sort=price_desc");
    expect(databaseHref({ section: "home" }, "price_asc")).toBe(
      "/database?sort=price_asc",
    );
  });
});
