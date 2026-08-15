import { describe, expect, it } from "vitest";
import {
  contractSlotCount,
  detectMarketVariant,
  extractWearName,
  isTradeUpInputTier,
  nextTier,
  normalizeBaseSkinName,
  rarityNameToTier,
  rarityToTier,
} from "@/lib/tradeup/rarity";

describe("trade-up rarity ladder", () => {
  it("walks consumer → extraordinary", () => {
    expect(nextTier("consumer")).toBe("industrial");
    expect(nextTier("covert")).toBe("extraordinary");
    expect(nextTier("extraordinary")).toBeNull();
  });

  it("uses 10 slots except Covert → 5", () => {
    expect(contractSlotCount("restricted")).toBe(10);
    expect(contractSlotCount("covert")).toBe(5);
  });

  it("rejects extraordinary as an input", () => {
    expect(isTradeUpInputTier("covert")).toBe(true);
    expect(isTradeUpInputTier("extraordinary")).toBe(false);
  });

  it("maps ByMykel ids and Steam names", () => {
    expect(rarityToTier({ id: "rarity_mythical_weapon" })).toBe("restricted");
    expect(rarityToTier({ name: "Classified" })).toBe("classified");
    expect(rarityNameToTier("Mil-Spec Grade")).toBe("milspec");
    expect(rarityToTier(null)).toBeNull();
    expect(rarityNameToTier("unknown")).toBeNull();
  });
});

describe("market hash parsing", () => {
  it("detects StatTrak, Souvenir, and knife StatTrak", () => {
    expect(
      detectMarketVariant("StatTrak™ AK-47 | Redline (Field-Tested)"),
    ).toMatchObject({
      variant: "stattrak",
      baseWithWear: "AK-47 | Redline (Field-Tested)",
    });
    expect(
      detectMarketVariant("Souvenir AWP | Pit Viper (Field-Tested)"),
    ).toMatchObject({ variant: "souvenir" });
    expect(
      detectMarketVariant("★ StatTrak™ Karambit | Fade (Factory New)"),
    ).toMatchObject({ variant: "stattrak" });
    expect(
      detectMarketVariant("AK-47 | Redline (Field-Tested)"),
    ).toMatchObject({ variant: "normal" });
  });

  it("strips wear and prefixes to a catalog base name", () => {
    expect(
      normalizeBaseSkinName("StatTrak™ AK-47 | Redline (Field-Tested)"),
    ).toBe("AK-47 | Redline");
    expect(extractWearName("AK-47 | Redline (Well-Worn)")).toBe("Well-Worn");
    expect(extractWearName("Kilowatt Case")).toBeNull();
  });
});
