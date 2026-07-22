"use client";

import { useEffect, useRef, useState } from "react";
import { PriceSourceToggle } from "@/components/PriceSourceToggle";
import { ShareWrappedCard } from "@/components/ShareWrappedCard";
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<PriceSource>(
    () => initialPriceSource ?? DEFAULT_PRICE_SOURCE,
  );
  const [stats, setStats] = useState<ShareCardStats>(() =>
    buildShareCardStats(items, currency, priceSource),
  );

  useEffect(() => {
    if (!open) return;
    setPriceSource(initialPriceSource ?? readStoredPriceSource());
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

  const sharePath = sharePagePath(profile.id, priceSource);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : sharePath;

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    setError(null);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function downloadPng() {
    const node = cardRef.current?.querySelector(
      "[data-share-card]",
    ) as HTMLElement | null;
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
  }

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Share link copied.");
    } catch {
      setError("Could not copy link — copy it manually from the field below.");
    }
  }

  function onPriceSourceChange(next: PriceSource) {
    writeStoredPriceSource(next);
    setPriceSource(next);
  }

  const otherLabel =
    priceSource === "skinport"
      ? PRICE_SOURCE_LABELS.steam
      : PRICE_SOURCE_LABELS.skinport;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="share-card-title"
              className="text-lg font-semibold tracking-tight"
            >
              Inventory Wrapped
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Download a graphic or share a link with your top 3 skins.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[auto_1fr] lg:items-start">
          <div
            ref={cardRef}
            className="mx-auto origin-top scale-[0.92] sm:scale-100"
          >
            <ShareWrappedCard
              profile={profile}
              stats={stats}
              currency={currency}
              priceSource={priceSource}
            />
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
                  className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#042f2e] hover:bg-[var(--accent-dim)] disabled:opacity-50"
                >
                  {busy ? "Generating…" : "Download PNG"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium hover:border-[var(--accent)]/40"
                >
                  Copy share link
                </button>
                <a
                  href={sharePath}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[var(--border)] px-4 py-3 text-center text-sm font-medium hover:border-[var(--steam)]/50"
                >
                  Open share page
                </a>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Share URL
              </span>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
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
    </div>
  );
}
