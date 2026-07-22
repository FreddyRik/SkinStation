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
import { parseStickersJson } from "@/lib/stickers/parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
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
    return { title: "Inventory Wrapped" };
  }

  const currency = parseCurrency(profile.currency);
  const stats = buildShareCardStats(profile.items, currency, priceSource);
  const name = profile.personaName ?? profile.steamId;
  const top = stats.topItems[0]?.displayName;

  return {
    title: `${name} · CS2 Inventory Wrapped`,
    description: [
      `${stats.itemCount} items worth ${stats.headlineLabel} on ${PRICE_SOURCE_LABELS[priceSource]}`,
      top ? `Top skin: ${top}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { source: sourceParam } = await searchParams;
  const priceSource = parsePriceSource(sourceParam);

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
    stickers: parseStickersJson(item.stickers),
    steamPrice: item.steamPrice,
    skinportPrice: item.skinportPrice,
  }));
  const stats = buildShareCardStats(items, currency, priceSource);

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
      <div className="w-full space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-dim)]">
          Shareable inventory card
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-share-display), Georgia, serif" }}
        >
          {profile.personaName ?? profile.steamId}
          <span className="text-[var(--text-muted)]"> · Wrapped</span>
        </h1>
        <p className="text-[var(--text-muted)]">
          {stats.itemCount} items · {PRICE_SOURCE_LABELS[priceSource]}{" "}
          <span
            style={{
              color:
                priceSource === "skinport"
                  ? "var(--skinport)"
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
      />

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link
          href={`/inventory/${profile.id}`}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[#042f2e] hover:bg-[var(--accent-dim)]"
        >
          Open full inventory
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Track your own
        </Link>
      </div>
    </div>
  );
}
