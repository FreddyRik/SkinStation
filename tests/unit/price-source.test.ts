import { describe, expect, it } from "vitest";
import {
  itemPrice,
  itemPriceOrZero,
  parsePriceSource,
  portfolioTotalFromItems,
  primaryTotal,
  priceSourceAccent,
} from "@/lib/price-source";

const skin = {
  steamPrice: 10,
  buffPrice: 8,
  marketable: true,
  type: "Rifle",
  marketHashName: "AK-47 | Redline (Field-Tested)",
};

describe("parsePriceSource", () => {
  it("accepts buff and steam", () => {
    expect(parsePriceSource("buff")).toBe("buff");
    expect(parsePriceSource("steam")).toBe("steam");
  });

  it("maps legacy skinport to buff", () => {
    expect(parsePriceSource("skinport")).toBe("buff");
  });

  it("falls back for unknown values", () => {
    expect(parsePriceSource("nope")).toBe("buff");
    expect(parsePriceSource(null, "steam")).toBe("steam");
  });
});

describe("itemPrice cascade", () => {
  it("uses the selected source then the other market", () => {
    expect(itemPrice(skin, "buff")).toBe(8);
    expect(itemPrice(skin, "steam")).toBe(10);
    expect(itemPrice({ ...skin, buffPrice: null }, "buff")).toBe(10);
    expect(itemPrice({ ...skin, steamPrice: null }, "steam")).toBe(8);
  });

  it("returns null when both markets are empty", () => {
    expect(
      itemPrice({ ...skin, steamPrice: null, buffPrice: null }, "buff"),
    ).toBeNull();
  });

  it("hides prices for unlistable collectibles", () => {
    expect(
      itemPrice(
        {
          steamPrice: 5,
          buffPrice: 5,
          type: "Collectible",
          marketHashName: "5 Year Veteran Coin",
        },
        "buff",
      ),
    ).toBeNull();
  });

  it("treats missing prices as zero for sorting", () => {
    expect(
      itemPriceOrZero({ ...skin, steamPrice: null, buffPrice: null }, "buff"),
    ).toBe(0);
  });
});

describe("portfolio totals", () => {
  it("sums using the same per-item fallback as the grid", () => {
    const items = [
      skin,
      { ...skin, buffPrice: null, steamPrice: 20 },
      {
        steamPrice: 99,
        buffPrice: 99,
        type: "Collectible",
        marketHashName: "Service Medal",
      },
    ];
    expect(portfolioTotalFromItems(items, "buff")).toBe(8 + 20);
  });

  it("picks snapshot totals by source", () => {
    expect(primaryTotal({ totalSteam: 1, totalBuff: 2 }, "buff")).toBe(2);
    expect(primaryTotal({ totalSteam: 1, totalBuff: 2 }, "steam")).toBe(1);
  });

  it("returns the matching accent token", () => {
    expect(priceSourceAccent("buff")).toBe("var(--buff)");
    expect(priceSourceAccent("steam")).toBe("var(--steam)");
  });
});
