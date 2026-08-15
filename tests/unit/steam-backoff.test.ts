import { afterEach, describe, expect, it } from "vitest";
import {
  STEAM_BACKOFF_STORAGE_KEY,
  clearSteamBackoff,
  formatBackoffCountdown,
  isSteamBackoffActive,
  looksLikeSteamRateLimitMessage,
  markSteamBackoff,
  steamBackoffRemainingMs,
} from "@/lib/steam-backoff";

describe("steam backoff", () => {
  afterEach(() => {
    clearSteamBackoff();
  });

  it("is inactive with no stored deadline", () => {
    expect(isSteamBackoffActive()).toBe(false);
    expect(steamBackoffRemainingMs()).toBe(0);
  });

  it("marks a pause and reports remaining time", () => {
    markSteamBackoff(60_000);
    expect(isSteamBackoffActive()).toBe(true);
    expect(steamBackoffRemainingMs()).toBeGreaterThan(50_000);
    expect(window.localStorage.getItem(STEAM_BACKOFF_STORAGE_KEY)).toBeTruthy();
  });

  it("clears an expired deadline", () => {
    window.localStorage.setItem(
      STEAM_BACKOFF_STORAGE_KEY,
      String(Date.now() - 1000),
    );
    expect(isSteamBackoffActive()).toBe(false);
  });

  it("treats corrupt storage as inactive", () => {
    window.localStorage.setItem(STEAM_BACKOFF_STORAGE_KEY, "nope");
    expect(isSteamBackoffActive()).toBe(false);
  });
});

describe("rate-limit message detection", () => {
  it("matches common Steam 429 copy", () => {
    expect(looksLikeSteamRateLimitMessage("Steam rate-limited this sync")).toBe(
      true,
    );
    expect(looksLikeSteamRateLimitMessage("rate limited by Steam")).toBe(true);
    expect(looksLikeSteamRateLimitMessage("inventory private")).toBe(false);
    expect(looksLikeSteamRateLimitMessage(null)).toBe(false);
  });
});

describe("formatBackoffCountdown", () => {
  it("formats seconds and minutes", () => {
    expect(formatBackoffCountdown(1500)).toBe("2s");
    expect(formatBackoffCountdown(65_000)).toBe("1m 05s");
  });
});
