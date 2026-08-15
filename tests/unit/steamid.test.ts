import { describe, expect, it } from "vitest";
import {
  isSteamAssetId,
  isSteamId64,
  STEAM_ID64_MAX,
  STEAM_ID64_MIN,
} from "@/lib/steam/steamid";

describe("isSteamId64", () => {
  it("accepts public individual accounts", () => {
    expect(isSteamId64("76561198000000000")).toBe(true);
    expect(isSteamId64(STEAM_ID64_MIN.toString())).toBe(true);
    expect(isSteamId64(STEAM_ID64_MAX.toString())).toBe(true);
  });

  it("rejects wrong length, non-digits, and out-of-range values", () => {
    expect(isSteamId64("")).toBe(false);
    expect(isSteamId64("7656119")).toBe(false);
    expect(isSteamId64("7656119800000000a")).toBe(false);
    expect(isSteamId64("10000000000000000")).toBe(false);
    expect(isSteamId64("76561197000000000")).toBe(false);
  });
});

describe("isSteamAssetId", () => {
  it("accepts decimal uint64 asset ids", () => {
    expect(isSteamAssetId("123")).toBe(true);
    expect(isSteamAssetId("18446744073709551615")).toBe(true);
  });

  it("rejects empty, oversized, and non-numeric ids", () => {
    expect(isSteamAssetId("")).toBe(false);
    expect(isSteamAssetId("12a")).toBe(false);
    expect(isSteamAssetId("1".repeat(21))).toBe(false);
  });
});
