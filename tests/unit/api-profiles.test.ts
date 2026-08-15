import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sync/inventory-sync", () => ({
  ensureProfileFromInput: vi.fn(),
}));

import { GET, POST } from "@/app/api/profiles/route";
import { prisma } from "@/lib/db";
import { ensureProfileFromInput } from "@/lib/sync/inventory-sync";

const findMany = prisma.profile.findMany as unknown as Mock;
const mockedEnsure = vi.mocked(ensureProfileFromInput);

function nextRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

function jsonPost(url: string, body: Record<string, unknown>) {
  return nextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function profileRow(overrides?: Record<string, unknown>) {
  return {
    id: "profile01",
    steamId: "76561198000000000",
    personaName: "Alice",
    avatarUrl: null,
    profileUrl: "https://steamcommunity.com/profiles/76561198000000000",
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
    syncing: false,
    _count: { items: 4, snapshots: 1 },
    snapshots: [{ totalBuff: 12, totalSteam: 15, currency: "USD" }],
    ...overrides,
  };
}

describe("GET /api/profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when no ids are requested", async () => {
    const res = await GET(nextRequest("http://localhost/api/profiles"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { profiles: unknown[] };
    expect(json.profiles).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns caller-known profiles in requested order", async () => {
    findMany.mockResolvedValue([
      profileRow({ id: "profileb1", personaName: "Bob" }),
      profileRow({ id: "profilea1", personaName: "Alice" }),
    ]);

    const res = await GET(
      nextRequest(
        "http://localhost/api/profiles?ids=profilea1,profileb1,profilea1,missing",
      ),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      profiles: Array<{ id: string; itemCount: number }>;
    };
    expect(json.profiles.map((p) => p.id)).toEqual(["profilea1", "profileb1"]);
    expect(json.profiles[0]?.itemCount).toBe(4);
  });

  it("returns 500 when the database throws", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    const res = await GET(
      nextRequest("http://localhost/api/profiles?ids=profile01"),
    );
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Failed to load profiles.");
  });
});

describe("POST /api/profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when input is missing", async () => {
    const res = await POST(jsonPost("http://localhost/api/profiles", { input: "" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/Steam profile URL or SteamID64 is required/i);
  });

  it("creates or upserts a profile from Steam input", async () => {
    mockedEnsure.mockResolvedValue(
      profileRow({ id: "newprofile", personaName: "Bob" }) as never,
    );
    const res = await POST(
      jsonPost("http://localhost/api/profiles", {
        input: "https://steamcommunity.com/id/bob",
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { profile: { id: string } };
    expect(json.profile.id).toBe("newprofile");
    expect(mockedEnsure).toHaveBeenCalledWith(
      "https://steamcommunity.com/id/bob",
    );
  });

  it("maps steam resolution errors to 400", async () => {
    mockedEnsure.mockRejectedValue(
      new Error("Could not resolve that Steam profile"),
    );
    const res = await POST(
      jsonPost("http://localhost/api/profiles", { input: "not-a-profile" }),
    );
    expect(res.status).toBe(400);
  });

  it("maps Steam rate-limit errors to 429", async () => {
    mockedEnsure.mockRejectedValue(
      new Error("Steam is rate-limited right now"),
    );
    const res = await POST(
      jsonPost("http://localhost/api/profiles", { input: "76561198000000000" }),
    );
    expect(res.status).toBe(429);
  });
});
