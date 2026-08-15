import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/buff/goods-ids", () => ({
  buffGoodsIdFor: vi.fn(() => 42),
  getBuffGoodsIdMap: vi.fn(async () => new Map([["AK-47 | Redline (Field-Tested)", 42]])),
}));

import { GET } from "@/app/api/profiles/[id]/route";
import { prisma } from "@/lib/db";

const findUnique = prisma.profile.findUnique as unknown as Mock;

describe("GET /api/profiles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the profile does not exist", async () => {
    findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/profiles/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns items, snapshots, and portfolio totals", async () => {
    findUnique.mockResolvedValue({
      id: "p1",
      steamId: "76561198000000000",
      personaName: "Alice",
      avatarUrl: null,
      profileUrl: null,
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
      lastSyncedAt: null,
      lastError: null,
      syncing: false,
      items: [
        {
          id: "i1",
          type: "Rifle",
          marketHashName: "AK-47 | Redline (Field-Tested)",
          stickers: "[]",
          steamPrice: 10,
          buffPrice: 8,
          marketable: true,
        },
      ],
      snapshots: [{ id: "s1", totalBuff: 8, totalSteam: 10 }],
    });

    const res = await GET(new Request("http://localhost/api/profiles/p1"), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      profile: { id: string };
      items: Array<{ buffGoodsId: number | null }>;
      totals: { itemCount: number; totalBuff: number; totalSteam: number };
    };
    expect(json.profile.id).toBe("p1");
    expect(json.totals.itemCount).toBe(1);
    expect(json.totals.totalBuff).toBe(8);
    expect(json.items[0]?.buffGoodsId).toBe(42);
  });

  it("returns 500 when the database throws", async () => {
    findUnique.mockRejectedValue(new Error("db down"));
    const res = await GET(new Request("http://localhost/api/profiles/p1"), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(500);
  });
});
