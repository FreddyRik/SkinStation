import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizeProfileCreateError } from "@/lib/api/errors";
import { ensureProfileFromInput } from "@/lib/sync/inventory-sync";

/** Max profiles returned by the public directory (anti-enumeration). */
const RECENT_PROFILES_LIMIT = 8;

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { updatedAt: "desc" },
      take: RECENT_PROFILES_LIMIT,
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
        syncing: p.syncing,
        itemCount: p._count.items,
        latestSnapshot: p.snapshots[0] ?? null,
      })),
    });
  } catch (err) {
    console.error("Failed to load profiles:", err);
    return NextResponse.json(
      { error: "Failed to load profiles." },
      { status: 500 },
    );
  }
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
    console.error("Failed to create profile:", err);
    const { status, error } = sanitizeProfileCreateError(err);
    return NextResponse.json({ error }, { status });
  }
}
