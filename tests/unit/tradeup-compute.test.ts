import { describe, expect, it } from "vitest";
import { computeTradeUp } from "@/lib/tradeup/compute";
import { validateTradeUpContract } from "@/lib/tradeup/eligibility";
import type {
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpInput,
} from "@/lib/tradeup/types";

function skin(overrides: Partial<TradeUpCatalogSkin> & Pick<TradeUpCatalogSkin, "id" | "name" | "rarityTier">): TradeUpCatalogSkin {
  return {
    image: null,
    minFloat: 0.06,
    maxFloat: 0.8,
    wearNames: ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"],
    collectionIds: ["col-1"],
    crateIds: [],
    isKnife: false,
    isGlove: false,
    stattrak: true,
    paintIndex: null,
    baseName: overrides.name,
    phase: null,
    rarityId: null,
    rarityName: null,
    rarityColor: null,
    ...overrides,
  };
}

const restrictedA = skin({
  id: "skin-a",
  name: "AK-47 | Redline",
  rarityTier: "restricted",
});
const restrictedB = skin({
  id: "skin-b",
  name: "AWP | Redline",
  rarityTier: "restricted",
});
const classifiedOut = skin({
  id: "skin-out",
  name: "AK-47 | Vulcan",
  rarityTier: "classified",
  collectionIds: ["col-1"],
});

const collection: TradeUpCollectionRow = {
  id: "col-1",
  name: "The Phoenix Collection",
  contains: [
    { id: "skin-a", rarityTier: "restricted" },
    { id: "skin-b", rarityTier: "restricted" },
    { id: "skin-out", rarityTier: "classified" },
  ],
};

const skinsById = new Map([
  [restrictedA.id, restrictedA],
  [restrictedB.id, restrictedB],
  [classifiedOut.id, classifiedOut],
]);

const ctx = {
  skinsById,
  collectionsById: new Map([[collection.id, collection]]),
  cratesById: new Map(),
};

function tenInputs(): TradeUpInput[] {
  return Array.from({ length: 10 }, (_, i) => ({
    key: `slot-${i}`,
    skinId: "skin-a",
    floatValue: 0.2,
    cost: 10,
    marketHashName: "AK-47 | Redline (Field-Tested)",
  }));
}

describe("validateTradeUpContract", () => {
  it("rejects empty, mixed rarity, and wrong slot counts", () => {
    expect(validateTradeUpContract([], skinsById, ctx).ok).toBe(false);
    const mixed = tenInputs();
    mixed[0] = {
      ...mixed[0]!,
      skinId: "missing",
    };
    expect(validateTradeUpContract(mixed, skinsById, ctx)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Could not resolve"),
    });

    const classifiedInput = skin({
      id: "skin-c",
      name: "AK-47 | Vulcan",
      rarityTier: "classified",
    });
    const mixedRarity = tenInputs();
    mixedRarity[1] = { ...mixedRarity[1]!, skinId: "skin-c" };
    expect(
      validateTradeUpContract(
        mixedRarity,
        new Map([...skinsById, [classifiedInput.id, classifiedInput]]),
        ctx,
      ),
    ).toMatchObject({ ok: false, error: "All inputs must share the same rarity." });

    expect(validateTradeUpContract(tenInputs().slice(0, 3), skinsById, ctx)).toMatchObject({
      ok: false,
      error: expect.stringContaining("exactly 10"),
    });
  });

  it("rejects knives as inputs", () => {
    const knife = skin({
      id: "knife",
      name: "★ Karambit | Fade",
      rarityTier: "extraordinary",
      isKnife: true,
    });
    const inputs = Array.from({ length: 10 }, (_, i) => ({
      key: `k-${i}`,
      skinId: "knife",
      floatValue: 0.1,
      cost: 1,
    }));
    expect(
      validateTradeUpContract(inputs, new Map([[knife.id, knife]]), ctx),
    ).toMatchObject({
      ok: false,
      error: "Knives and gloves cannot be used as trade-up inputs.",
    });
  });
});

describe("computeTradeUp", () => {
  it("returns odds, output float, and financials for a filled contract", () => {
    const result = computeTradeUp({
      inputs: tenInputs(),
      skinsById,
      ctx,
      variant: "normal",
      prices: {
        "AK-47 | Vulcan (Field-Tested)": { steam: 80, buff: 70 },
      },
      priceSource: "buff",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slotCount).toBe(10);
    expect(result.inputTier).toBe("restricted");
    expect(result.outputTier).toBe("classified");
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0]?.probability).toBeCloseTo(1);
    expect(result.outcomes[0]?.price).toBe(70);
    expect(result.totalCost).toBe(100);
    expect(result.expectedValue).toBe(70);
    expect(result.profit).toBe(-30);
    expect(result.outcomes[0]?.wearAbbr).toBe("FT");
  });

  it("surfaces validation errors without throwing", () => {
    const result = computeTradeUp({
      inputs: [],
      skinsById,
      ctx,
      variant: "normal",
      prices: {},
      priceSource: "buff",
    });
    expect(result).toMatchObject({ ok: false });
  });
});
