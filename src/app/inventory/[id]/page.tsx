import { notFound } from "next/navigation";
import { InventoryDashboard } from "@/components/InventoryDashboard";
import {
  buffGoodsIdFor,
  getBuffGoodsIdMap,
} from "@/lib/buff/goods-ids";
import { parseCurrency } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { portfolioTotalFromItems } from "@/lib/price-source";
import { itemSupportsStickers } from "@/lib/item-flags";
import { parseStickersJson } from "@/lib/stickers/parse";
import {
  applyReputationToProfile,
  getSyncCooldownMs,
} from "@/lib/sync/inventory-sync";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InventoryPage({ params }: PageProps) {
  const { id } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ buffPrice: "desc" }, { marketHashName: "asc" }],
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 500,
      },
    },
  });

  if (!profile) {
    notFound();
  }

  // Backfill FACEIT/Leetify on page load if never fetched (non-blocking).
  if (!profile.faceitFetchedAt) {
    void applyReputationToProfile(profile.steamId, { force: true }).catch(
      (err) => console.warn("Reputation enrich on inventory page failed:", err),
    );
  }

  const currency = parseCurrency(profile.currency);

  let goodsIds = new Map<string, number>();
  try {
    goodsIds = await getBuffGoodsIdMap();
  } catch (err) {
    console.warn("Buff goods id map unavailable:", err);
  }

  const items = profile.items.map((item) => {
    const stickers = itemSupportsStickers(item.type, item.marketHashName)
      ? parseStickersJson(item.stickers)
      : [];
    return {
      id: item.id,
      assetId: item.assetId,
      marketHashName: item.marketHashName,
      name: item.name,
      iconUrl: item.iconUrl,
      exterior: item.exterior,
      floatValue: item.floatValue,
      paintSeed: item.paintSeed,
      paintIndex: item.paintIndex,
      stickers,
      steamPrice: item.steamPrice,
      buffPrice: item.buffPrice,
      buffGoodsId: buffGoodsIdFor(goodsIds, item.marketHashName),
      rarity: item.rarity,
      type: item.type,
      tradable: item.tradable,
      marketable: item.marketable,
    };
  });

  const totalSteam = portfolioTotalFromItems(items, "steam");
  const totalBuff = portfolioTotalFromItems(items, "buff");

  return (
    <InventoryDashboard
      profile={{
        id: profile.id,
        steamId: profile.steamId,
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        currency,
        faceitUrl: profile.faceitUrl,
        faceitLevel: profile.faceitLevel,
        faceitElo: profile.faceitElo,
        faceitNickname: profile.faceitNickname,
        faceitFound: profile.faceitFound,
        faceitFetchedAt: profile.faceitFetchedAt?.toISOString() ?? null,
        leetifyUrl: profile.leetifyUrl,
        leetifyName: profile.leetifyName,
        leetifyRating: profile.leetifyRating,
        leetifyFound: profile.leetifyFound,
        lastSyncedAt: profile.lastSyncedAt?.toISOString() ?? null,
        lastError: profile.lastError,
        syncing: profile.syncing,
      }}
      items={items}
      snapshots={[...profile.snapshots].reverse().map((s) => ({
        id: s.id,
        currency: parseCurrency(s.currency, currency),
        itemCount: s.itemCount,
        totalSteam: s.totalSteam,
        totalBuff: s.totalBuff,
        createdAt: s.createdAt.toISOString(),
      }))}
      totals={{
        itemCount: items.length,
        totalSteam,
        totalBuff,
      }}
      cooldownMs={getSyncCooldownMs()}
    />
  );
}
