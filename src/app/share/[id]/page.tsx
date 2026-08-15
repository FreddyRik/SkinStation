import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SharePageClient } from "@/components/SharePageClient";
import { parseCurrency } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/db";
import {
  PRICE_SOURCE_LABELS,
  parsePriceSource,
} from "@/lib/price-source";
import { buildShareCardStats } from "@/lib/share-card";
import { parseShareCardTheme } from "@/lib/share-card-theme";
import { buildPageMetadata, SITE_NAME } from "@/lib/site";
import { itemSupportsStickers } from "@/lib/item-flags";
import { parseStickersJson } from "@/lib/stickers/parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string; theme?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { source: sourceParam } = await searchParams;
  const priceSource = parsePriceSource(sourceParam);
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!profile) {
    return buildPageMetadata({
      title: `${SITE_NAME} Wrapped`,
      description: "Shareable CS2 inventory card on SkinStation.",
      path: `/share/${id}`,
    });
  }

  const currency = parseCurrency(profile.currency);
  const stats = buildShareCardStats(profile.items, currency, priceSource);
  const name = profile.personaName ?? profile.steamId;
  const top = stats.topItems[0]?.displayName;
  const description = [
    `${stats.itemCount} items worth ${stats.headlineLabel} on ${PRICE_SOURCE_LABELS[priceSource]}`,
    top ? `Top skin: ${top}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return buildPageMetadata({
    title: `${name} · SkinStation Wrapped`,
    description,
    path: `/share/${profile.id}`,
    image: profile.avatarUrl,
  });
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { source: sourceParam, theme: themeParam } = await searchParams;
  const priceSource = parsePriceSource(sourceParam);
  const theme = parseShareCardTheme(themeParam);

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!profile) {
    notFound();
  }

  const currency = parseCurrency(profile.currency);
  const items = profile.items.map((item) => ({
    id: item.id,
    marketHashName: item.marketHashName,
    name: item.name,
    iconUrl: item.iconUrl,
    exterior: item.exterior,
    rarity: item.rarity,
    type: item.type,
    floatValue: item.floatValue,
    stickers: itemSupportsStickers(item.type, item.marketHashName)
      ? parseStickersJson(item.stickers)
      : [],
    steamPrice: item.steamPrice,
    buffPrice: item.buffPrice,
    marketable: item.marketable,
  }));
  const stats = buildShareCardStats(items, currency, priceSource);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col items-center gap-6 sm:gap-8">
      <div className="w-full min-w-0 space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-dim)]">
          Shareable inventory card
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight sm:text-4xl"
        >
          {profile.personaName ?? profile.steamId}
          <span className="text-[var(--text-muted)]"> · Wrapped</span>
        </h1>
        <p className="font-data text-sm text-[var(--text-muted)] sm:text-base">
          {stats.itemCount} items · {PRICE_SOURCE_LABELS[priceSource]}{" "}
          <span
            style={{
              color:
                priceSource === "buff"
                  ? "var(--buff)"
                  : "var(--steam)",
            }}
          >
            {formatMoney(stats.headlineTotal, currency)}
          </span>
        </p>
      </div>

      <SharePageClient
        profile={{
          id: profile.id,
          personaName: profile.personaName,
          steamId: profile.steamId,
          avatarUrl: profile.avatarUrl,
        }}
        items={items}
        currency={currency}
        priceSource={priceSource}
        theme={theme}
      />

      <div className="flex w-full flex-wrap items-center justify-center gap-3 text-sm">
        <Link
          href={`/inventory/${profile.id}`}
          className="rounded-[4px] bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-fg)] hover:bg-[var(--accent-dim)]"
        >
          Open full inventory
        </Link>
        <Link
          href="/"
          className="et-card px-4 py-2.5 text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Track your own
        </Link>
      </div>
    </div>
  );
}
