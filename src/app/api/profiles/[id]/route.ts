import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStickersJson } from "@/lib/stickers/parse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ skinportPrice: "desc" }, { marketHashName: "asc" }],
      },
      snapshots: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const items = profile.items.map((item) => ({
    ...item,
    stickers: parseStickersJson(item.stickers),
  }));

  const totalSteam = items.reduce((sum, i) => sum + (i.steamPrice ?? 0), 0);
  const totalSkinport = items.reduce(
    (sum, i) => sum + (i.skinportPrice ?? 0),
    0,
  );

  return NextResponse.json({
    profile: {
      id: profile.id,
      steamId: profile.steamId,
      personaName: profile.personaName,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      currency: profile.currency,
      faceitUrl: profile.faceitUrl,
      faceitLevel: profile.faceitLevel,
      faceitElo: profile.faceitElo,
      faceitNickname: profile.faceitNickname,
      faceitFound: profile.faceitFound,
      faceitFetchedAt: profile.faceitFetchedAt,
      leetifyUrl: profile.leetifyUrl,
      leetifyName: profile.leetifyName,
      leetifyRating: profile.leetifyRating,
      leetifyFound: profile.leetifyFound,
      lastSyncedAt: profile.lastSyncedAt,
      lastError: profile.lastError,
      syncing: profile.syncing,
    },
    items,
    snapshots: profile.snapshots,
    totals: {
      itemCount: items.length,
      totalSteam,
      totalSkinport,
    },
  });
}
