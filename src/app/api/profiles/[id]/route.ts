import { NextResponse } from "next/server";
import {
  buffGoodsIdFor,
  getBuffGoodsIdMap,
} from "@/lib/buff/goods-ids";
import { prisma } from "@/lib/db";
import { portfolioTotalFromItems } from "@/lib/price-source";
import { itemSupportsStickers } from "@/lib/item-flags";
import { parseStickersJson } from "@/lib/stickers/parse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ buffPrice: "desc" }, { marketHashName: "asc" }],
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

  let goodsIds = new Map<string, number>();
  try {
    goodsIds = await getBuffGoodsIdMap();
  } catch (err) {
    console.warn("Buff goods id map unavailable:", err);
  }

  const items = profile.items.map((item) => ({
    ...item,
    stickers: itemSupportsStickers(item.type, item.marketHashName)
      ? parseStickersJson(item.stickers)
      : [],
    buffGoodsId: buffGoodsIdFor(goodsIds, item.marketHashName),
  }));

  const totalSteam = portfolioTotalFromItems(items, "steam");
  const totalBuff = portfolioTotalFromItems(items, "buff");

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
      totalBuff,
    },
  });
}
