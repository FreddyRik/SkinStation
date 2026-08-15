import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import { parseCurrency } from "@/lib/currency";
import type { SnapshotView } from "@/types/inventory";

const HISTORY_LOOKBACK_DAYS = 400;

type SnapshotRow = {
  id: string;
  currency: string;
  itemCount: number;
  totalSteam: number;
  totalBuff: number;
  createdAt: Date;
};

/**
 * Load downsampled portfolio history using the (profileId, createdAt) index.
 *
 * Last 30 days: one point per hour. Older points: one per day.
 * Avoids hydrating tens of thousands of 15-minute sync rows for 1Y charts.
 */
export async function loadPortfolioHistory(
  profileId: string,
  fallbackCurrency: Currency,
): Promise<SnapshotView[]> {
  const since = new Date(Date.now() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<SnapshotRow[]>(Prisma.sql`
    SELECT DISTINCT ON (bucket)
      id,
      currency,
      "itemCount",
      "totalSteam",
      "totalBuff",
      "createdAt"
    FROM (
      SELECT
        id,
        currency,
        "itemCount",
        "totalSteam",
        "totalBuff",
        "createdAt",
        CASE
          WHEN "createdAt" >= NOW() - INTERVAL '30 days'
            THEN date_trunc('hour', "createdAt")
          ELSE date_trunc('day', "createdAt")
        END AS bucket
      FROM "PortfolioSnapshot"
      WHERE "profileId" = ${profileId}
        AND "createdAt" >= ${since}
    ) AS t
    ORDER BY bucket ASC, "createdAt" DESC
  `);

  return rows
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({
      id: row.id,
      currency: parseCurrency(row.currency, fallbackCurrency),
      itemCount: row.itemCount,
      totalSteam: row.totalSteam,
      totalBuff: row.totalBuff,
      createdAt: row.createdAt.toISOString(),
    }));
}
