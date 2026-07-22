import { notFound } from "next/navigation";
import { InventoryDashboard } from "@/components/InventoryDashboard";
import { parseCurrency } from "@/lib/currency";
import { prisma } from "@/lib/db";
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
        orderBy: [{ skinportPrice: "desc" }, { marketHashName: "asc" }],
      },
      snapshots: {
        orderBy: { createdAt: "asc" },
        take: 100,
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

  const items = profile.items.map((item) => ({
    id: item.id,
    assetId: item.assetId,
    marketHashName: item.marketHashName,
    name: item.name,
    iconUrl: item.iconUrl,
    exterior: item.exterior,
    floatValue: item.floatValue,
    paintSeed: item.paintSeed,
    paintIndex: item.paintIndex,
    stickers: parseStickersJson(item.stickers),
    steamPrice: item.steamPrice,
    skinportPrice: item.skinportPrice,
    rarity: item.rarity,
    type: item.type,
    tradable: item.tradable,
  }));

  const totalSteam = items.reduce((sum, i) => sum + (i.steamPrice ?? 0), 0);
  const totalSkinport = items.reduce(
    (sum, i) => sum + (i.skinportPrice ?? 0),
    0,
  );

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
      snapshots={profile.snapshots.map((s) => ({
        id: s.id,
        currency: parseCurrency(s.currency, currency),
        itemCount: s.itemCount,
        totalSteam: s.totalSteam,
        totalSkinport: s.totalSkinport,
        createdAt: s.createdAt.toISOString(),
      }))}
      totals={{
        itemCount: items.length,
        totalSteam,
        totalSkinport,
      }}
      cooldownMs={getSyncCooldownMs()}
    />
  );
}
