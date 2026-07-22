"use client";

import type { Currency } from "@/lib/currency";
import {
  priceSourceAccent,
  type PriceSource,
} from "@/lib/price-source";
import type { ShareCardStats, ShareTopItem } from "@/lib/share-card";
import { proxiedImageUrl } from "@/lib/share-card";

export type ShareCardProfile = {
  personaName: string | null;
  steamId: string;
  avatarUrl: string | null;
};

type ShareWrappedCardProps = {
  profile: ShareCardProfile;
  stats: ShareCardStats;
  currency: Currency;
  priceSource?: PriceSource;
  year?: number;
};

const RANK_TONES = [
  { badge: "#fbbf24", glow: "rgba(251, 191, 36, 0.35)" },
  { badge: "#c0c7d1", glow: "rgba(192, 199, 209, 0.28)" },
  { badge: "#d97757", glow: "rgba(217, 119, 87, 0.3)" },
] as const;

function TopSkinRow({ item, index }: { item: ShareTopItem; index: number }) {
  const tone = RANK_TONES[index] ?? RANK_TONES[2];
  const icon = proxiedImageUrl(item.iconUrl);

  return (
    <li
      className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3"
      style={{ boxShadow: `inset 0 0 0 1px ${tone.glow}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#0c1210]"
          style={{ background: tone.badge }}
        >
          {item.rank}
        </span>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt=""
            crossOrigin="anonymous"
            className="h-12 w-12 shrink-0 rounded-lg bg-black/40 object-contain"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-lg bg-[var(--border)]" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-semibold leading-snug"
              title={item.displayName}
            >
              {item.displayName}
            </p>
            <p
              className="shrink-0 text-sm font-semibold tabular-nums"
              style={{ color: "var(--value-accent, var(--skinport))" }}
            >
              {item.valueLabel}
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {[item.exterior, item.rarity].filter(Boolean).join(" · ") || "CS2 skin"}
          </p>
          <p className="text-xs tabular-nums text-[var(--accent-dim)]">
            Float{" "}
            <span className="font-semibold text-[var(--text)]">
              {item.floatLabel}
            </span>
          </p>
        </div>
      </div>

      {item.supportsStickers && (
        <div className="mt-2.5 border-t border-white/8 pt-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Stickers
          </p>
          {item.stickers.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No stickers applied</p>
          ) : (
            <ul className="space-y-1.5">
              {item.stickers.map((sticker) => {
                const stickerIcon = proxiedImageUrl(sticker.iconUrl);
                return (
                  <li
                    key={`${item.id}-sticker-${sticker.slot}-${sticker.name}`}
                    className="flex items-center gap-2"
                  >
                    {stickerIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={stickerIcon}
                        alt=""
                        crossOrigin="anonymous"
                        className="h-9 w-9 shrink-0 rounded-md bg-black/40 object-contain"
                      />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-md bg-[var(--border)]" />
                    )}
                    <span
                      className="min-w-0 flex-1 truncate text-xs text-[var(--text)]"
                      title={sticker.name}
                    >
                      {sticker.name}
                    </span>
                    {sticker.wearLabel && (
                      <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]">
                        {sticker.wearLabel}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export function ShareWrappedCard({
  profile,
  stats,
  currency,
  priceSource = stats.priceSource,
  year = new Date().getFullYear(),
}: ShareWrappedCardProps) {
  const displayName = profile.personaName ?? profile.steamId;
  const avatarSrc = proxiedImageUrl(profile.avatarUrl);
  const accent = priceSourceAccent(priceSource);
  const secondarySource =
    priceSource === "skinport" ? "Steam" : "Skinport";
  const secondaryLabel =
    priceSource === "skinport"
      ? stats.totalSteamLabel
      : stats.totalSkinportLabel;
  const secondaryColor =
    priceSource === "skinport" ? "var(--steam)" : "var(--skinport)";

  return (
    <article
      data-share-card
      className="share-card relative flex w-[360px] flex-col overflow-hidden rounded-[28px] text-[var(--text)] sm:w-[400px]"
      style={{
        ["--value-accent" as string]: accent,
        background:
          "radial-gradient(ellipse 120% 80% at 0% 0%, rgba(94,234,212,0.22), transparent 55%), radial-gradient(ellipse 90% 70% at 100% 10%, rgba(255,107,53,0.18), transparent 50%), linear-gradient(165deg, #14201b 0%, #0c1210 48%, #101816 100%)",
        boxShadow:
          "0 0 0 1px rgba(94,234,212,0.18), 0 28px 60px rgba(0,0,0,0.45)",
        fontFamily: "var(--font-share-body), 'Segoe UI', sans-serif",
        minHeight: 720,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(232,240,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,240,235,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "linear-gradient(180deg, black 0%, black 55%, transparent 100%)",
        }}
      />

      <div className="relative flex flex-1 flex-col gap-5 p-7 pb-6">
        <header className="space-y-4">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "var(--accent-dim)" }}
          >
            CS2 Inventory Wrapped · {year}
          </p>
          <div className="flex items-center gap-3">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                crossOrigin="anonymous"
                className="h-14 w-14 rounded-2xl object-cover"
                style={{ boxShadow: "0 0 0 2px rgba(94,234,212,0.35)" }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--border)] text-sm font-semibold">
                CS
              </div>
            )}
            <div className="min-w-0">
              <h2
                className="truncate text-[1.65rem] font-bold leading-tight tracking-tight"
                style={{
                  fontFamily: "var(--font-share-display), Georgia, serif",
                }}
              >
                {displayName}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Top skins by market value
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-black/25 px-5 py-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Portfolio ({stats.priceSourceLabel} · {currency})
          </p>
          <p
            className="text-4xl font-bold tabular-nums tracking-tight"
            style={{
              fontFamily: "var(--font-share-display), Georgia, serif",
              color: accent,
            }}
          >
            {stats.headlineLabel}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
            <span>
              <span className="text-[var(--text)]">{stats.itemCount}</span> items
            </span>
            <span>
              {secondarySource}{" "}
              <span style={{ color: secondaryColor }}>{secondaryLabel}</span>
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <h3
            className="text-sm font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--accent)" }}
          >
            Top 3 most expensive
          </h3>

          {stats.topItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No priced skins yet — sync inventory first.
            </p>
          ) : (
            <ol className="space-y-3">
              {stats.topItems.map((item, index) => (
                <TopSkinRow key={item.id} item={item} index={index} />
              ))}
            </ol>
          )}
        </section>

        <footer className="mt-auto flex items-end justify-between gap-3 pt-2 text-xs text-[var(--text-muted)]">
          <p>
            Inventory<span style={{ color: "var(--accent)" }}>Tracker</span>
          </p>
          <p className="tabular-nums">
            {stats.pricedCount}/{stats.itemCount} priced
          </p>
        </footer>
      </div>
    </article>
  );
}
