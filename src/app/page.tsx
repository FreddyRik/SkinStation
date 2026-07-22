import { prisma } from "@/lib/db";
import { ProfileLookup } from "@/components/ProfileLookup";
import { parseCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profiles = await prisma.profile.findMany({
    orderBy: { updatedAt: "desc" },
    take: 8,
    include: {
      _count: { select: { items: true } },
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <ProfileLookup
      recentProfiles={profiles.map((p) => {
        const currency = parseCurrency(p.currency);
        return {
          id: p.id,
          steamId: p.steamId,
          personaName: p.personaName,
          avatarUrl: p.avatarUrl,
          currency,
          faceitUrl: p.faceitUrl,
          faceitLevel: p.faceitLevel,
          faceitElo: p.faceitElo,
          faceitNickname: p.faceitNickname,
          faceitFound: p.faceitFound,
          faceitFetchedAt: p.faceitFetchedAt?.toISOString() ?? null,
          leetifyUrl: p.leetifyUrl,
          leetifyName: p.leetifyName,
          leetifyRating: p.leetifyRating,
          leetifyFound: p.leetifyFound,
          itemCount: p._count.items,
          lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
          latestSnapshot: p.snapshots[0]
            ? {
                currency: parseCurrency(p.snapshots[0].currency, currency),
                totalSteam: p.snapshots[0].totalSteam,
                totalBuff: p.snapshots[0].totalBuff,
              }
            : null,
        };
      })}
    />
  );
}
