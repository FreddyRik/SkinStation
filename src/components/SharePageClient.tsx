"use client";

import { useEffect, useRef, useState } from "react";
import { ShareWrappedCard } from "@/components/ShareWrappedCard";
import type { Currency } from "@/lib/currency";
import {
  DEFAULT_PRICE_SOURCE,
  type PriceSource,
} from "@/lib/price-source";
import {
  buildShareCardStats,
  buildShareCardStatsAsync,
  sharePagePath,
  type ShareCardStats,
  type ShareItemInput,
} from "@/lib/share-card";
import { exportShareCardPng } from "@/lib/share-card-export";
import {
  DEFAULT_SHARE_CARD_THEME,
  type ShareCardTheme,
} from "@/lib/share-card-theme";

export function SharePageClient({
  profile,
  items,
  currency,
  priceSource = DEFAULT_PRICE_SOURCE,
  theme = DEFAULT_SHARE_CARD_THEME,
}: {
  profile: {
    id: string;
    personaName: string | null;
    steamId: string;
    avatarUrl: string | null;
  };
  items: ShareItemInput[];
  currency: Currency;
  priceSource?: PriceSource;
  theme?: ShareCardTheme;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [stats, setStats] = useState<ShareCardStats>(() =>
    buildShareCardStats(items, currency, priceSource),
  );
  const sharePath = sharePagePath(profile.id, priceSource, theme);

  useEffect(() => {
    let cancelled = false;
    setStats(buildShareCardStats(items, currency, priceSource));
    void buildShareCardStatsAsync(items, currency, priceSource).then((next) => {
      if (!cancelled) setStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [items, currency, priceSource]);

  async function downloadPng() {
    const node = cardRef.current?.querySelector(
      "[data-share-card]",
    ) as HTMLElement | null;
    if (!node) return;
    setBusy(true);
    setNote(null);
    try {
      const dataUrl = await exportShareCardPng(node);
      const slug = (profile.personaName ?? profile.steamId)
        .replace(/[^\w\-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      const link = document.createElement("a");
      link.download = `inventory-wrapped-${slug || "profile"}.png`;
      link.href = dataUrl;
      link.click();
      setNote("Downloaded PNG.");
    } catch {
      setNote("Could not export the card. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote("Share link copied.");
    } catch {
      setNote("Copy failed — use the address bar URL.");
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div
        ref={cardRef}
        className="share-card-enter origin-top scale-[0.92] sm:scale-100"
      >
        <ShareWrappedCard
          profile={profile}
          stats={stats}
          currency={currency}
          priceSource={priceSource}
          theme={theme}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadPng()}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#042f2e] hover:bg-[var(--accent-dim)] disabled:opacity-50"
        >
          {busy ? "Generating…" : "Download PNG"}
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm hover:border-[var(--accent)]/40"
        >
          Copy link
        </button>
      </div>
      {note && <p className="text-sm text-[var(--steam)]">{note}</p>}
    </div>
  );
}
