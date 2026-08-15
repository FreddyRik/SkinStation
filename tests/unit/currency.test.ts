import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENCY_STORAGE_KEY,
  parseCurrency,
  readStoredCurrency,
  writeStoredCurrency,
} from "@/lib/currency";

describe("parseCurrency", () => {
  it("accepts USD and EUR", () => {
    expect(parseCurrency("USD")).toBe("USD");
    expect(parseCurrency("EUR")).toBe("EUR");
  });

  it("falls back for unknown values", () => {
    expect(parseCurrency("GBP")).toBe("USD");
    expect(parseCurrency(null, "EUR")).toBe("EUR");
  });
});

describe("currency storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("reads the default when nothing is stored", () => {
    expect(readStoredCurrency()).toBe("USD");
  });

  it("persists and broadcasts changes", () => {
    const seen: string[] = [];
    window.addEventListener("inventory-tracker:currency", (e) => {
      seen.push((e as CustomEvent<string>).detail);
    });
    writeStoredCurrency("EUR");
    expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("EUR");
    expect(readStoredCurrency()).toBe("EUR");
    expect(seen).toEqual(["EUR"]);
  });

  it("ignores corrupt stored values", () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, "yen");
    expect(readStoredCurrency()).toBe("USD");
  });

  it("survives localStorage throwing (private mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeStoredCurrency("EUR")).not.toThrow();
  });
});
