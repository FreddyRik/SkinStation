import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sync/inventory-sync", () => ({
  ensureProfileFromInput: vi.fn(),
  getSyncCooldownMs: vi.fn(() => 15 * 60 * 1000),
  syncInventory: vi.fn(),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({
    ok: true,
    remaining: 5,
    retryAfterSec: 0,
  })),
  clientIpFromRequest: vi.fn(() => "1.2.3.4"),
}));

import { POST } from "@/app/api/sync/route";
import { prisma } from "@/lib/db";
import {
  ensureProfileFromInput,
  getSyncCooldownMs,
  syncInventory,
} from "@/lib/sync/inventory-sync";
import { rateLimit } from "@/lib/api/rate-limit";

const findUnique = prisma.profile.findUnique as unknown as Mock;
const mockedSync = vi.mocked(syncInventory);
const mockedEnsure = vi.mocked(ensureProfileFromInput);
const mockedRateLimit = vi.mocked(rateLimit);

function post(body: Record<string, unknown>, headers?: HeadersInit): NextRequest {
  return new NextRequest("http://localhost/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRateLimit.mockResolvedValue({
      ok: true,
      remaining: 5,
      retryAfterSec: 0,
    });
    delete process.env.SYNC_FORCE_SECRET;
  });

  it("returns 400 when profileId and input are missing", async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/profileId or input is required/i);
  });

  it("returns 403 when force sync is requested without a secret", async () => {
    const res = await POST(post({ profileId: "p1", force: true }));
    expect(res.status).toBe(403);
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it("resolves input to a profileId then 404s when the row is gone", async () => {
    mockedEnsure.mockResolvedValue({ id: "p1" } as never);
    findUnique.mockResolvedValue(null);
    const res = await POST(post({ input: "76561198000000000" }));
    expect(res.status).toBe(404);
  });

  it("returns 429 when the per-profile rate limit is exceeded", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    mockedRateLimit.mockResolvedValue({
      ok: false,
      remaining: 0,
      retryAfterSec: 30,
    });
    const res = await POST(post({ profileId: "p1" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it("runs syncInventory and includes cooldownMs", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    mockedSync.mockResolvedValue({
      profileId: "p1",
      steamId: "76561198000000000",
      currency: "USD",
      itemCount: 3,
      totalSteam: 10,
      totalBuff: 8,
      inspected: 1,
      steamPricesResolved: 2,
    });
    vi.mocked(getSyncCooldownMs).mockReturnValue(900000);

    const res = await POST(post({ profileId: "p1", currency: "USD" }));
    expect(res.status).toBe(200);
    expect(mockedSync).toHaveBeenCalledWith("p1", {
      force: false,
      currency: "USD",
    });
    const json = (await res.json()) as {
      itemCount: number;
      cooldownMs: number;
    };
    expect(json.itemCount).toBe(3);
    expect(json.cooldownMs).toBe(900000);
  });

  it("maps private-inventory failures to 403", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    mockedSync.mockRejectedValue(new Error("Steam inventory is private"));
    const res = await POST(post({ profileId: "p1" }));
    expect(res.status).toBe(403);
  });

  it("maps an in-progress sync to 409", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    mockedSync.mockRejectedValue(new Error("already in progress"));
    const res = await POST(post({ profileId: "p1" }));
    expect(res.status).toBe(409);
  });
});
