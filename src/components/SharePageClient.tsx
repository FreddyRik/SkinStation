"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShareWrappedCard } from "@/components/ShareWrappedCard";
import { ShareCardViewport } from "@/components/ShareCardViewport";
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
import { queryHtmlElement } from "@/types/events";

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

  const downloadPng = useCallback(async () => {
    const node = queryHtmlElement(cardRef.current, "[data-share-card]");
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
  }, [profile.personaName, profile.steamId]);

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote("Share link copied.");
    } catch {
      setNote("Copy failed — use the address bar URL.");
    }
  }, [sharePath]);

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-5">
      <div ref={cardRef} className="share-card-enter w-full min-w-0">
        <ShareCardViewport>
          <ShareWrappedCard
            profile={profile}
            stats={stats}
            currency={currency}
            priceSource={priceSource}
            theme={theme}
          />
        </ShareCardViewport>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-2 px-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadPng()}
          className="rounded-[4px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:bg-[var(--accent-dim)] disabled:opacity-50"
        >
          {busy ? "Generating…" : "Download PNG"}
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="et-card px-4 py-2.5 text-sm hover:bg-[var(--bg-panel)]"
        >
          Copy link
        </button>
      </div>
      {note && <p className="text-sm text-[var(--steam)]">{note}</p>}
    </div>
  );
}
