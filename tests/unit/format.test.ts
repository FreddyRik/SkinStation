import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatFloat,
  formatMoney,
  formatSaleDate,
  formatUsd,
  toFiniteNumber,
} from "@/lib/format";

describe("formatMoney", () => {
  it("returns an em dash for missing or NaN values", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney(Number.NaN)).toBe("—");
  });

  it("formats USD under 100 with cents", () => {
    expect(formatMoney(12.5, "USD")).toBe("$12.50");
  });

  it("drops cents for values of 100 or more", () => {
    expect(formatMoney(250, "USD")).toBe("$250");
  });

  it("formats EUR with a de-DE locale", () => {
    expect(formatMoney(12.5, "EUR")).toMatch(/12,50/);
    expect(formatMoney(12.5, "EUR")).toMatch(/€/);
  });
});

describe("formatUsd", () => {
  it("delegates to USD formatting", () => {
    expect(formatUsd(1)).toBe("$1.00");
  });
});

describe("toFiniteNumber", () => {
  it("keeps finite numbers", () => {
    expect(toFiniteNumber(0.123)).toBe(0.123);
  });

  it("parses numeric strings", () => {
    expect(toFiniteNumber("0.42")).toBe(0.42);
  });

  it("rejects invalid input", () => {
    expect(toFiniteNumber("nope")).toBeNull();
    expect(toFiniteNumber("")).toBeNull();
    expect(toFiniteNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toFiniteNumber({})).toBeNull();
  });
});

describe("formatFloat", () => {
  it("returns an em dash when missing", () => {
    expect(formatFloat(null)).toBe("—");
  });

  it("trims trailing zeros without losing significant digits", () => {
    expect(formatFloat(0.07)).toBe("0.07");
    expect(formatFloat(0.12345678)).toBe("0.12345678");
    expect(formatFloat(1)).toBe("1");
  });
});

describe("formatDate", () => {
  it("returns Never for empty values", () => {
    expect(formatDate(null)).toBe("Never");
    expect(formatDate(undefined)).toBe("Never");
  });

  it("formats ISO timestamps in UTC", () => {
    expect(formatDate("2026-01-15T12:00:00.000Z")).toMatch(/Jan 15, 2026/);
  });
});

describe("formatSaleDate", () => {
  it("returns an em dash when empty", () => {
    expect(formatSaleDate(null)).toBe("—");
  });

  it("normalizes slash dates", () => {
    expect(formatSaleDate("2024/08/15")).toMatch(/Aug 15, 2024/);
  });

  it("returns the original string when unparseable", () => {
    expect(formatSaleDate("soon-ish")).toBe("soon-ish");
  });
});
