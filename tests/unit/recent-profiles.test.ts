import { describe, expect, it } from "vitest";
import {
  parseRecentProfileEntry,
  readRecentProfiles,
  rememberRecentProfile,
  RECENT_PROFILES_LIMIT,
  type RecentProfileEntry,
} from "@/lib/recent-profiles";

function entry(id: string): RecentProfileEntry {
  return {
    id,
    steamId: `76561198${id.padStart(8, "0")}`,
    personaName: `User ${id}`,
    avatarUrl: null,
    currency: "USD",
    faceitUrl: null,
    faceitLevel: null,
    faceitElo: null,
    faceitNickname: null,
    faceitFound: false,
    faceitFetchedAt: null,
    leetifyUrl: null,
    leetifyName: null,
    leetifyRating: null,
    leetifyFound: false,
    itemCount: 3,
    lastSyncedAt: null,
    latestSnapshot: { currency: "USD", totalSteam: 1, totalBuff: 2 },
  };
}

describe("parseRecentProfileEntry", () => {
  it("requires id and steamId", () => {
    expect(parseRecentProfileEntry(null)).toBeNull();
    expect(parseRecentProfileEntry({ id: "a" })).toBeNull();
    expect(parseRecentProfileEntry({ id: "a", steamId: "76561198000000000" })).toMatchObject({
      id: "a",
      itemCount: 0,
    });
  });

  it("drops incomplete snapshots", () => {
    const parsed = parseRecentProfileEntry({
      id: "a",
      steamId: "76561198000000000",
      latestSnapshot: { totalSteam: 1 },
    });
    expect(parsed?.latestSnapshot).toBeNull();
  });
});

describe("rememberRecentProfile", () => {
  it("dedupes by id, most-recent first, and caps the list", () => {
    for (let i = 0; i < RECENT_PROFILES_LIMIT + 2; i += 1) {
      rememberRecentProfile(entry(String(i)));
    }
    const list = readRecentProfiles();
    expect(list).toHaveLength(RECENT_PROFILES_LIMIT);
    expect(list[0]?.id).toBe(String(RECENT_PROFILES_LIMIT + 1));
    rememberRecentProfile(entry("3"));
    expect(readRecentProfiles()[0]?.id).toBe("3");
    expect(readRecentProfiles().filter((p) => p.id === "3")).toHaveLength(1);
  });

  it("returns an empty list for corrupt JSON", () => {
    window.localStorage.setItem("skinstation-recent-profiles", "{not-json");
    expect(readRecentProfiles()).toEqual([]);
  });
});
