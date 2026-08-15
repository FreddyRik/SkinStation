import { describe, expect, it } from "vitest";
import {
  averageNormalized,
  clampFloat,
  financialSummary,
  normalizeInputFloat,
  outputFloatFromNormalized,
  pickPrice,
  wearBandForFloat,
} from "@/lib/tradeup/math";
import { skinMarketHashName } from "@/lib/cs-catalog/wears";

describe("float math", () => {
  it("clamps to bounds and handles NaN", () => {
    expect(clampFloat(0.5, 0, 1)).toBe(0.5);
    expect(clampFloat(-1, 0, 1)).toBe(0);
    expect(clampFloat(2, 0, 1)).toBe(1);
    expect(clampFloat(Number.NaN, 0.07, 0.8)).toBe(0.07);
    expect(clampFloat(0.5, 1, 0)).toBe(1);
  });

  it("normalizes a float into the skin's range", () => {
    expect(normalizeInputFloat(0.15, 0.06, 0.8)).toBeCloseTo(
      (0.15 - 0.06) / (0.8 - 0.06),
    );
    expect(normalizeInputFloat(0.01, 0.06, 0.8)).toBe(0);
    expect(normalizeInputFloat(0.5, 0.4, 0.4)).toBe(0);
  });

  it("averages normalized inputs", () => {
    expect(averageNormalized([])).toBe(0);
    expect(averageNormalized([0.2, 0.4, 0.6])).toBeCloseTo(0.4);
  });

  it("maps average normalized float back to an output range", () => {
    expect(outputFloatFromNormalized(0, 0.06, 0.8)).toBe(0.06);
    expect(outputFloatFromNormalized(1, 0.06, 0.8)).toBe(0.8);
    expect(outputFloatFromNormalized(0.5, 0.0, 1)).toBe(0.5);
  });

  it("picks wear bands with half-open intervals (BS includes 1)", () => {
    expect(wearBandForFloat(0)).toMatchObject({ abbr: "FN" });
    expect(wearBandForFloat(0.07)).toMatchObject({ abbr: "MW" });
    expect(wearBandForFloat(0.15)).toMatchObject({ abbr: "FT" });
    expect(wearBandForFloat(0.45)).toMatchObject({ abbr: "BS" });
    expect(wearBandForFloat(1)).toMatchObject({ abbr: "BS" });
    expect(wearBandForFloat(Number.NaN)).toMatchObject({ abbr: "FN" });
  });
});

describe("pickPrice", () => {
  it("cascades Buff then Steam", () => {
    expect(pickPrice({ buff: 8, steam: 10 }, "buff")).toBe(8);
    expect(pickPrice({ buff: null, steam: 10 }, "buff")).toBe(10);
    expect(pickPrice({ buff: 8, steam: null }, "steam")).toBe(8);
    expect(pickPrice(undefined, "buff")).toBeNull();
  });
});

describe("financialSummary", () => {
  it("computes EV, profit, and ROI", () => {
    const summary = financialSummary(
      [
        { probability: 0.5, price: 20 },
        { probability: 0.5, price: 40 },
      ],
      25,
    );
    expect(summary.expectedValue).toBe(30);
    expect(summary.profit).toBe(5);
    expect(summary.roi).toBeCloseTo(0.2);
  });

  it("skips unpriced outcomes and returns null ROI when cost is 0", () => {
    const summary = financialSummary(
      [
        { probability: 1, price: null },
        { probability: 0, price: Number.NaN },
      ],
      0,
    );
    expect(summary.expectedValue).toBe(0);
    expect(summary.profit).toBe(0);
    expect(summary.roi).toBeNull();
  });
});

describe("skinMarketHashName", () => {
  it("builds wear and StatTrak variants including knives", () => {
    expect(skinMarketHashName("AK-47 | Redline", "Field-Tested", "normal")).toBe(
      "AK-47 | Redline (Field-Tested)",
    );
    expect(
      skinMarketHashName("AK-47 | Redline", "Field-Tested", "stattrak"),
    ).toBe("StatTrak™ AK-47 | Redline (Field-Tested)");
    expect(
      skinMarketHashName("★ Karambit | Fade", "Factory New", "stattrak"),
    ).toBe("★ StatTrak™ Karambit | Fade (Factory New)");
    expect(
      skinMarketHashName("AWP | Pit Viper", "Field-Tested", "souvenir"),
    ).toBe("Souvenir AWP | Pit Viper (Field-Tested)");
  });
});
