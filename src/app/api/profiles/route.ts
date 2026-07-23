import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureProfileFromInput } from "@/lib/sync/inventory-sync";

export async function GET() {
  const profiles = await prisma.profile.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true, snapshots: true } },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    profiles: profiles.map((p) => ({
      id: p.id,
      steamId: p.steamId,
      personaName: p.personaName,
      avatarUrl: p.avatarUrl,
      profileUrl: p.profileUrl,
      currency: p.currency,
      faceitUrl: p.faceitUrl,
      faceitLevel: p.faceitLevel,
      faceitElo: p.faceitElo,
      faceitNickname: p.faceitNickname,
      faceitFound: p.faceitFound,
      faceitFetchedAt: p.faceitFetchedAt,
      leetifyUrl: p.leetifyUrl,
      leetifyName: p.leetifyName,
      leetifyRating: p.leetifyRating,
      leetifyFound: p.leetifyFound,
      lastSyncedAt: p.lastSyncedAt,
      lastError: p.lastError,
      syncing: p.syncing,
      itemCount: p._count.items,
      latestSnapshot: p.snapshots[0] ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { input?: string };
    if (!body.input?.trim()) {
      return NextResponse.json(
        { error: "Steam profile URL or SteamID64 is required." },
        { status: 400 },
      );
    }

    const profile = await ensureProfileFromInput(body.input);
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create profile";
    const lower = message.toLowerCase();
    let status = 500;
    if (
      lower.includes("could not resolve") ||
      lower.includes("invalid steam") ||
      lower.includes("vanity") ||
      lower.includes("required")
    ) {
      status = 400;
    } else if (
      lower.includes("rate-limited") ||
      lower.includes("rate limited")
    ) {
      status = 429;
    } else if (
      lower.includes("steam") ||
      lower.includes("fetch") ||
      lower.includes("network")
    ) {
      status = 502;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
