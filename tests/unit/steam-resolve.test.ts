import { describe, expect, it } from "vitest";
import { parseSteamInput } from "@/lib/steam/resolve";

describe("parseSteamInput", () => {
  it("accepts SteamID64", () => {
    expect(parseSteamInput("76561198000000000")).toEqual({
      kind: "steamid64",
      value: "76561198000000000",
    });
  });

  it("parses profile and vanity URLs", () => {
    expect(
      parseSteamInput("https://steamcommunity.com/profiles/76561198000000000"),
    ).toEqual({
      kind: "steamid64",
      value: "76561198000000000",
    });
    expect(parseSteamInput("https://steamcommunity.com/id/gaben")).toEqual({
      kind: "vanity",
      value: "gaben",
    });
  });

  it("rejects empty input, hostname-like vanities, and non-Steam URLs", () => {
    expect(() => parseSteamInput("")).toThrow(/Steam profile URL or SteamID64/);
    expect(() => parseSteamInput("https://example.com/id/gaben")).toThrow(
      /steamcommunity.com profile/,
    );
    expect(() => parseSteamInput("gaben")).toThrow(
      /steamcommunity.com profile/,
    );
    expect(() => parseSteamInput("10000000000000000")).toThrow(
      /Could not parse Steam profile URL or SteamID64/,
    );
  });
});
