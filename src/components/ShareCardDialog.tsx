"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { PriceSourceToggle } from "@/components/PriceSourceToggle";
import { ShareCardThemeToggle } from "@/components/ShareCardThemeToggle";
import { ShareWrappedCard } from "@/components/ShareWrappedCard";
import { ShareCardViewport } from "@/components/ShareCardViewport";
import type { Currency } from "@/lib/currency";
import {
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_LABELS,
  readStoredPriceSource,
  type PriceSource,
  writeStoredPriceSource,
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
  readStoredShareCardTheme,
  type ShareCardTheme,
  writeStoredShareCardTheme,
} from "@/lib/share-card-theme";
import { queryHtmlElement } from "@/types/events";

type ShareCardDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: {
    id: string;
    personaName: string | null;
    steamId: string;
    avatarUrl: string | null;
  };
  items: ShareItemInput[];
  currency: Currency;
  priceSource?: PriceSource;
};

export function ShareCardDialog({
  open,
  onClose,
  profile,
  items,
  currency,
  priceSource: initialPriceSource,
}: ShareCardDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<PriceSource>(
    () => initialPriceSource ?? DEFAULT_PRICE_SOURCE,
  );
  const [theme, setTheme] = useState<ShareCardTheme>(
    () => DEFAULT_SHARE_CARD_THEME,
  );
  const [stats, setStats] = useState<ShareCardStats>(() =>
    buildShareCardStats(items, currency, priceSource),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPriceSource(initialPriceSource ?? readStoredPriceSource());
    setTheme(readStoredShareCardTheme());
  }, [open, initialPriceSource]);

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

  const sharePath = sharePagePath(profile.id, priceSource, theme);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : sharePath;

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    setError(null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const downloadPng = useCallback(async () => {
    const node = queryHtmlElement(cardRef.current, "[data-share-card]");
    if (!node) return;

    setBusy(true);
    setError(null);
    setStatus("Rendering share card…");
    try {
      const dataUrl = await exportShareCardPng(node);

      const slug = (profile.personaName ?? profile.steamId)
        .replace(/[^\w\-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      const filename = `inventory-wrapped-${slug || "profile"}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setStatus("Downloaded PNG.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export the share card.",
      );
    } finally {
      setBusy(false);
    }
  }, [profile.personaName, profile.steamId]);

  const copyLink = useCallback(async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Share link copied.");
    } catch {
      setError("Could not copy link — copy it manually from the field below.");
    }
  }, [shareUrl]);

  const onPriceSourceChange = useCallback((next: PriceSource) => {
    writeStoredPriceSource(next);
    setPriceSource(next);
  }, []);

  const onThemeChange = useCallback((next: ShareCardTheme) => {
    writeStoredShareCardTheme(next);
    setTheme(next);
  }, []);

  const onBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open || !mounted) return null;

  const otherLabel =
    priceSource === "buff"
      ? PRICE_SOURCE_LABELS.steam
      : PRICE_SOURCE_LABELS.buff;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex h-dvh min-h-dvh items-end justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
      onClick={onBackdropClick}
    >
      <div className="et-card flex max-h-[min(94vh,94dvh)] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-4 px-4 py-4 shadow-[inset_0_-1px_0_rgba(200,121,65,0.12)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2
              id="share-card-title"
              className="text-lg font-semibold tracking-tight"
            >
              SkinStation Wrapped
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Download a graphic or share a link with your top 3 skins.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="et-card self-start px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] sm:self-auto"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:grid-cols-[minmax(0,auto)_1fr] lg:items-start">
          <div ref={cardRef} className="mx-auto w-full min-w-0 max-w-[400px]">
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

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Price source
              </p>
              <PriceSourceToggle
                value={priceSource}
                onChange={onPriceSourceChange}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Actions
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy || items.length === 0}
                  onClick={() => void downloadPng()}
                  className="rounded-[4px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-fg)] hover:bg-[var(--accent-dim)] disabled:opacity-50"
                >
                  {busy ? "Generating…" : "Download PNG"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="et-card px-4 py-3 text-sm font-medium hover:bg-[var(--bg-panel)]"
                >
                  Copy share link
                </button>
                <a
                  href={sharePath}
                  target="_blank"
                  rel="noreferrer"
                  className="et-card px-4 py-3 text-center text-sm font-medium hover:bg-[var(--bg-panel)]"
                >
                  Open share page
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Theme
              </p>
              <ShareCardThemeToggle value={theme} onChange={onThemeChange} />
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Share URL
              </span>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="et-field w-full px-3 py-2.5 text-sm text-[var(--text)]"
              />
            </label>

            <ul className="space-y-1 text-sm text-[var(--text-muted)]">
              <li>
                · Totals use your current currency ({currency}) and{" "}
                {PRICE_SOURCE_LABELS[priceSource]} as the headline value.
              </li>
              <li>
                · Top 3 ranks by {PRICE_SOURCE_LABELS[priceSource]} price,
                falling back to {otherLabel}.
              </li>
              <li>· Friends can open the link anytime after you sync.</li>
            </ul>

            {status && <p className="text-sm text-[var(--steam)]">{status}</p>}
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
