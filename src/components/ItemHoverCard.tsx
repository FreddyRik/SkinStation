"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Currency } from "@/lib/currency";
import { formatFloat, formatMoney } from "@/lib/format";
import type { InventoryItemView } from "@/components/InventoryDashboard";
import {
  formatStickerWear,
  stripStickerPrefix,
} from "@/lib/stickers/normalize";
import { isSteamwebapiLimitMessage } from "@/lib/steamwebapi/errors";

type Props = {
  item: InventoryItemView;
  currency: Currency;
  /** Profile-level Steamwebapi quota warning, if any. */
  floatProviderWarning?: string | null;
  children: React.ReactNode;
};

export function itemHasHoverDetails(item: InventoryItemView): boolean {
  const isPlainCollectible =
    item.marketHashName.startsWith("Sticker |") ||
    item.marketHashName.startsWith("Patch |") ||
    item.marketHashName.startsWith("Sealed Graffiti") ||
    (item.type ?? "").toLowerCase().includes("container") ||
    (item.type ?? "").toLowerCase().includes("music kit") ||
    (item.type ?? "").toLowerCase().includes("pass");

  if (isPlainCollectible) return false;

  return (
    item.floatValue != null ||
    item.paintSeed != null ||
    (item.stickers?.length ?? 0) > 0
  );
}

export function ItemHoverCard({
  item,
  currency,
  floatProviderWarning,
  children,
}: Props) {
  const enabled = itemHasHoverDetails(item);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  function show() {
    if (!enabled) return;
    clearClose();
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = 340;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - panelWidth / 2),
      window.innerWidth - panelWidth - 12,
    );
    const top =
      rect.bottom + 8 + 300 > window.innerHeight
        ? Math.max(12, rect.top - 8 - 280)
        : rect.bottom + 8;
    setCoords({ top, left });
    setOpen(true);
  }

  useEffect(() => () => clearClose(), []);

  if (!enabled) {
    return <>{children}</>;
  }

  const stickers = item.stickers ?? [];
  const stickerTotal = stickers.reduce(
    (sum, s) => sum + (s.skinportPrice ?? s.steamPrice ?? 0),
    0,
  );

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
      onFocus={show}
      onBlur={scheduleClose}
    >
      {children}
      {open && coords && (
        <div
          id={panelId}
          role="tooltip"
          className="pointer-events-auto fixed z-50 w-[340px] rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-3 shadow-2xl shadow-black/50"
          style={{ top: coords.top, left: coords.left }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
        >
          <div className="flex gap-3">
            {item.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.iconUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg bg-[var(--bg)] object-contain"
              />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-lg bg-[var(--border)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-[var(--text)]">
                {item.marketHashName}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {item.exterior ?? item.type ?? "—"}
                {item.rarity ? ` · ${item.rarity}` : ""}
              </p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-[var(--text-muted)]">Float</dt>
              <dd className="font-mono text-[var(--text)]">
                {formatFloat(item.floatValue)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Pattern</dt>
              <dd className="font-mono text-[var(--text)]">
                {item.paintSeed ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Steam</dt>
              <dd style={{ color: "var(--steam)" }}>
                {formatMoney(item.steamPrice, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Skinport</dt>
              <dd style={{ color: "var(--skinport)" }}>
                {formatMoney(item.skinportPrice, currency)}
              </dd>
            </div>
          </dl>

          {item.floatValue == null && item.paintSeed == null && (
            <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
              {isSteamwebapiLimitMessage(floatProviderWarning)
                ? "Float unavailable — Steamwebapi request limit reached. Try again after your plan resets or upgrade at steamwebapi.com."
                : "Float/pattern not returned for this item by Steamwebapi yet."}
            </p>
          )}

          {stickers.length > 0 && (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text)]">Stickers</span>
                <span className="text-[var(--text-muted)]">
                  ~{formatMoney(stickerTotal || null, currency)}
                </span>
              </div>
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {stickers.map((s, idx) => {
                  const label =
                    stripStickerPrefix(s.name) ||
                    `Slot ${(s.slot ?? idx) + 1}`;
                  const wearLabel = formatStickerWear(s.wear);
                  return (
                    <li
                      key={`${s.slot ?? idx}-${label}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      {s.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.iconUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded bg-[var(--bg)] object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--border)] text-[10px] text-[var(--text-muted)]">
                          #{(s.slot ?? idx) + 1}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[var(--text)]">{label}</p>
                        {wearLabel && (
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {wearLabel}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <span
                          className="block"
                          style={{ color: "var(--steam)" }}
                        >
                          {formatMoney(s.steamPrice ?? null, currency)}
                        </span>
                        <span
                          className="block"
                          style={{ color: "var(--skinport)" }}
                        >
                          {formatMoney(s.skinportPrice ?? null, currency)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
