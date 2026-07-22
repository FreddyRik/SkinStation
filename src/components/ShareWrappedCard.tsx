"use client";

import type { Currency } from "@/lib/currency";
import {
  priceSourceAccent,
  type PriceSource,
} from "@/lib/price-source";
import type { ShareCardStats, ShareTopItem } from "@/lib/share-card";
import { proxiedImageUrl } from "@/lib/share-card";
import {
  DEFAULT_SHARE_CARD_THEME,
  SHARE_CARD_THEME_STYLES,
  type ShareCardTheme,
} from "@/lib/share-card-theme";

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
  theme?: ShareCardTheme;
  year?: number;
};

const RANK_TONES = [
  { badge: "#fbbf24", glow: "rgba(251, 191, 36, 0.35)" },
  { badge: "#c0c7d1", glow: "rgba(192, 199, 209, 0.28)" },
  { badge: "#d97757", glow: "rgba(217, 119, 87, 0.3)" },
] as const;

function TopSkinRow({
  item,
  index,
  theme,
}: {
  item: ShareTopItem;
  index: number;
  theme: ShareCardTheme;
}) {
  const tone = RANK_TONES[index] ?? RANK_TONES[2];
  const icon = proxiedImageUrl(item.iconUrl);
  const style = SHARE_CARD_THEME_STYLES[theme];

  return (
    <li
      className="rounded-2xl px-3 py-3"
      style={{
        background: style.rowBg,
        border: `1px solid ${style.rowBorder}`,
        boxShadow: `inset 0 0 0 1px ${tone.glow}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: tone.badge, color: style.badgeText }}
        >
          {item.rank}
        </span>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt=""
            crossOrigin="anonymous"
            className="h-12 w-12 shrink-0 rounded-lg object-contain"
            style={{ background: style.iconBg }}
          />
        ) : (
          <div
            className="h-12 w-12 shrink-0 rounded-lg"
            style={{ background: style.vars["--share-border"] }}
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--share-text)" }}
              title={item.displayName}
            >
              {item.displayName}
            </p>
            <p
              className="shrink-0 text-sm font-semibold tabular-nums"
              style={{ color: "var(--value-accent)" }}
            >
              {item.valueLabel}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--share-text-muted)" }}>
            {[item.exterior, item.rarity].filter(Boolean).join(" · ") ||
              "CS2 skin"}
          </p>
          {item.supportsFloat && item.floatLabel != null && (
            <p
              className="text-xs tabular-nums"
              style={{ color: "var(--share-accent-dim)" }}
            >
              Float{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--share-text)" }}
              >
                {item.floatLabel}
              </span>
            </p>
          )}
        </div>
      </div>

      {item.supportsStickers && item.stickers.length > 0 && (
        <div
          className="mt-2.5 pt-2.5"
          style={{ borderTop: `1px solid ${style.rowBorder}` }}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--share-text-muted)" }}
            >
              Stickers
            </p>
            {item.stickerTotal > 0 && (
              <p
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: "var(--value-accent)" }}
              >
                ~{item.stickerTotalLabel}
              </p>
            )}
          </div>
          <ul className="space-y-1.5">
            {item.stickers.map((sticker, idx) => {
              const stickerIcon = proxiedImageUrl(sticker.iconUrl);
              return (
                <li
                  key={`${item.id}-sticker-${idx}-${sticker.slot}-${sticker.name}`}
                  className="flex items-center gap-2"
                >
                  {stickerIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={stickerIcon}
                      alt=""
                      crossOrigin="anonymous"
                      className="h-9 w-9 shrink-0 rounded-md object-contain"
                      style={{ background: style.iconBg }}
                    />
                  ) : (
                    <div
                      className="h-9 w-9 shrink-0 rounded-md"
                      style={{ background: style.vars["--share-border"] }}
                    />
                  )}
                  <span
                    className="min-w-0 flex-1 truncate text-xs"
                    style={{ color: "var(--share-text)" }}
                    title={sticker.name}
                  >
                    {sticker.name}
                  </span>
                  <div className="shrink-0 text-right">
                    {sticker.wearLabel && (
                      <span
                        className="block text-[10px] tabular-nums"
                        style={{ color: "var(--share-text-muted)" }}
                      >
                        {sticker.wearLabel}
                      </span>
                    )}
                    <span
                      className="block text-[11px] font-semibold tabular-nums"
                      style={{ color: "var(--value-accent)" }}
                    >
                      {sticker.valueLabel}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
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
  theme = DEFAULT_SHARE_CARD_THEME,
  year = new Date().getFullYear(),
}: ShareWrappedCardProps) {
  const displayName = profile.personaName ?? profile.steamId;
  const avatarSrc = proxiedImageUrl(profile.avatarUrl);
  const accent = priceSourceAccent(priceSource);
  const style = SHARE_CARD_THEME_STYLES[theme];
  const secondarySource =
    priceSource === "buff" ? "Steam" : "Buff";
  const secondaryLabel =
    priceSource === "buff"
      ? stats.totalSteamLabel
      : stats.totalBuffLabel;
  const secondaryColor =
    priceSource === "buff" ? "var(--steam)" : "var(--buff)";

  return (
    <article
      data-share-card
      data-share-theme={theme}
      className="share-card relative flex w-[360px] flex-col overflow-hidden rounded-[28px] sm:w-[400px]"
      style={{
        ...style.vars,
        ["--value-accent" as string]: accent,
        color: style.vars["--share-text"],
        background: style.background,
        boxShadow: style.boxShadow,
        fontFamily: "var(--font-share-body), 'Segoe UI', sans-serif",
        minHeight: 720,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: style.gridOverlay,
          backgroundSize: "24px 24px",
          maskImage:
            "linear-gradient(180deg, black 0%, black 55%, transparent 100%)",
        }}
      />

      <div className="relative flex flex-1 flex-col gap-5 p-7 pb-6">
        <header className="space-y-4">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "var(--share-accent-dim)" }}
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
                style={{ boxShadow: style.avatarRing }}
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-semibold"
                style={{
                  background: style.vars["--share-border"],
                  color: "var(--share-text)",
                }}
              >
                CS
              </div>
            )}
            <div className="min-w-0">
              <h2
                className="truncate text-[1.65rem] font-bold leading-tight tracking-tight"
                style={{
                  fontFamily: "var(--font-share-display), Georgia, serif",
                  color: "var(--share-text)",
                }}
              >
                {displayName}
              </h2>
              <p className="text-sm" style={{ color: "var(--share-text-muted)" }}>
                Top skins by market value
              </p>
            </div>
          </div>
        </header>

        <section
          className="space-y-2 rounded-2xl px-5 py-4 backdrop-blur-sm"
          style={{
            background: style.panelBg,
            border: `1px solid ${style.panelBorder}`,
          }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.2em]"
            style={{ color: "var(--share-text-muted)" }}
          >
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
          <div
            className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
            style={{ color: "var(--share-text-muted)" }}
          >
            <span>
              <span style={{ color: "var(--share-text)" }}>
                {stats.itemCount}
              </span>{" "}
              items
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
            style={{ color: "var(--share-accent)" }}
          >
            Top 3 most expensive
          </h3>

          {stats.topItems.length === 0 ? (
            <p
              className="rounded-xl border border-dashed px-4 py-6 text-center text-sm"
              style={{
                borderColor: style.vars["--share-border"],
                color: "var(--share-text-muted)",
              }}
            >
              No priced skins yet — sync inventory first.
            </p>
          ) : (
            <ol className="space-y-3">
              {stats.topItems.map((item, index) => (
                <TopSkinRow
                  key={item.id}
                  item={item}
                  index={index}
                  theme={theme}
                />
              ))}
            </ol>
          )}
        </section>

        <footer
          className="mt-auto flex items-end justify-between gap-3 pt-2 text-xs"
          style={{ color: "var(--share-text-muted)" }}
        >
          <p>
            Inventory
            <span style={{ color: "var(--share-accent)" }}>Tracker</span>
          </p>
          <p className="tabular-nums">
            {stats.pricedCount}/{stats.itemCount} priced
          </p>
        </footer>
      </div>
    </article>
  );
}
