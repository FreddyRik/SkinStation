"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Currency } from "@/lib/currency";
import { formatFloat, formatMoney } from "@/lib/format";
import type { InventoryItemView } from "@/components/InventoryDashboard";
import {
  isNonWeaponConsumable,
  itemCanListOnMarket,
  itemSupportsFloat,
  itemSupportsStickers,
} from "@/lib/item-flags";
import { canLinkBuffMarket, canLinkSteamMarket } from "@/lib/steam-market/listing";
import {
  DEFAULT_PRICE_SOURCE,
  itemPrice,
  type PriceSource,
} from "@/lib/price-source";
import {
  formatStickerWear,
  stripStickerPrefix,
} from "@/lib/stickers/normalize";
import { floatUnavailableHint } from "@/lib/inspect/warnings";
import { BuffMarketLink } from "@/components/BuffMarketLink";
import { SteamMarketLink } from "@/components/SteamMarketLink";

const PANEL_WIDTH = 340;
const VIEWPORT_PAD = 12;
const BRIDGE = 10;
const CLOSE_MS = 220;
const ESTIMATED_PANEL_H = 280;

type Props = {
  item: InventoryItemView;
  currency: Currency;
  priceSource?: PriceSource;
  /** Profile-level Steamwebapi quota warning, if any. */
  floatProviderWarning?: string | null;
  children: React.ReactNode;
};

type Placement = {
  top: number;
  left: number;
  side: "below" | "above";
};

export function itemHasHoverDetails(item: InventoryItemView): boolean {
  if (isNonWeaponConsumable(item.type, item.marketHashName)) {
    return false;
  }

  const appliedStickerCount = itemSupportsStickers(
    item.type,
    item.marketHashName,
  )
    ? (item.stickers?.length ?? 0)
    : 0;

  return (
    item.floatValue != null ||
    item.paintSeed != null ||
    appliedStickerCount > 0
  );
}

function computePlacement(
  trigger: DOMRect,
  /** Visual card height (excludes the pointer bridge). */
  contentHeight: number,
): Placement {
  const totalH = contentHeight + BRIDGE;
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD;
  const spaceAbove = trigger.top - VIEWPORT_PAD;
  const side: "below" | "above" =
    spaceBelow >= totalH || spaceBelow >= spaceAbove ? "below" : "above";

  // Outer wrapper sits flush with the trigger; BRIDGE padding fills the gap.
  let top = side === "below" ? trigger.bottom : trigger.top - totalH;

  top = Math.max(
    VIEWPORT_PAD,
    Math.min(top, window.innerHeight - totalH - VIEWPORT_PAD),
  );

  let left = trigger.left + trigger.width / 2 - PANEL_WIDTH / 2;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD),
  );

  return { top, left, side };
}

export function ItemHoverCard({
  item,
  currency,
  priceSource = DEFAULT_PRICE_SOURCE,
  floatProviderWarning,
  children,
}: Props) {
  const enabled = itemHasHoverDetails(item);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function clearClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearClose();
    closeTimer.current = setTimeout(() => {
      openRef.current = false;
      setOpen(false);
      setPlacement(null);
    }, CLOSE_MS);
  }

  const updatePlacement = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const measured = contentRef.current?.offsetHeight ?? ESTIMATED_PANEL_H;
    setPlacement(computePlacement(rect, measured));
  }, []);

  function show() {
    if (!enabled) return;
    clearClose();
    openRef.current = true;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const measured = contentRef.current?.offsetHeight ?? ESTIMATED_PANEL_H;
    setPlacement(computePlacement(rect, measured));
    setOpen(true);
  }

  // Re-measure once the panel is in the DOM so tall sticker lists flip/clamp correctly
  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
  }, [open, updatePlacement, item.id]);

  // Keep aligned while scrolling/resizing; close if the trigger leaves the viewport
  useEffect(() => {
    if (!open) return;

    function onReposition() {
      if (!openRef.current) return;
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const fullyOff =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;
      if (fullyOff) {
        openRef.current = false;
        setOpen(false);
        setPlacement(null);
        return;
      }
      updatePlacement();
    }

    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updatePlacement]);

  useEffect(() => () => clearClose(), []);

  if (!enabled) {
    return <div className="h-full">{children}</div>;
  }

  const supportsFloat =
    item.floatValue != null ||
    item.paintSeed != null ||
    itemSupportsFloat(item.type, item.marketHashName);
  const showPrice = itemCanListOnMarket(item);
  const stickers = itemSupportsStickers(item.type, item.marketHashName)
    ? (item.stickers ?? [])
    : [];
  const stickerTotal = stickers.reduce(
    (sum, s) =>
      sum +
      (itemPrice(
        { steamPrice: s.steamPrice ?? null, buffPrice: s.buffPrice ?? null },
        priceSource,
      ) ?? 0),
    0,
  );

  const panel =
    open &&
    placement &&
    mounted &&
    createPortal(
      <div
        id={panelId}
        role="tooltip"
        className="pointer-events-auto fixed z-[80] w-[340px]"
        style={{
          top: placement.top,
          left: placement.left,
          // Bridge padding so the cursor can travel trigger → panel without a dead zone
          paddingTop: placement.side === "below" ? BRIDGE : 0,
          paddingBottom: placement.side === "above" ? BRIDGE : 0,
        }}
        onMouseEnter={clearClose}
        onMouseLeave={scheduleClose}
      >
        <div
          ref={contentRef}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-3 shadow-2xl shadow-black/50"
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
            {supportsFloat && (
              <>
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
              </>
            )}
            {showPrice && (
              <>
                <div>
                  <dt className="text-[var(--text-muted)]">Steam</dt>
                  <dd style={{ color: "var(--steam)" }}>
                    {canLinkSteamMarket(item) ? (
                      <SteamMarketLink
                        marketHashName={item.marketHashName}
                        className="font-medium no-underline hover:underline"
                      >
                        {formatMoney(item.steamPrice, currency)}
                      </SteamMarketLink>
                    ) : (
                      formatMoney(item.steamPrice, currency)
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Buff163</dt>
                  <dd style={{ color: "var(--buff)" }}>
                    {canLinkBuffMarket(item) && item.buffGoodsId != null ? (
                      <BuffMarketLink
                        goodsId={item.buffGoodsId}
                        className="font-medium no-underline hover:underline"
                      >
                        {formatMoney(item.buffPrice, currency)}
                      </BuffMarketLink>
                    ) : (
                      formatMoney(item.buffPrice, currency)
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {supportsFloat &&
            item.floatValue == null &&
            item.paintSeed == null && (
              <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                {floatUnavailableHint(floatProviderWarning)}
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
              <ul className="max-h-[min(12rem,40vh)] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {stickers.map((s, idx) => {
                  const label =
                    stripStickerPrefix(s.name) ||
                    `Slot ${(s.slot ?? idx) + 1}`;
                  const wearLabel = formatStickerWear(s.wear);
                  return (
                    <li
                      key={`sticker-${idx}-${s.slot ?? "x"}-${label}`}
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
                          style={{ color: "var(--buff)" }}
                        >
                          {formatMoney(s.buffPrice ?? null, currency)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <div
      ref={triggerRef}
      className="relative h-full"
      tabIndex={0}
      aria-describedby={open ? panelId : undefined}
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
      onFocus={show}
      onBlur={scheduleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          openRef.current = false;
          setOpen(false);
          setPlacement(null);
        }
      }}
    >
      {children}
      {panel}
    </div>
  );
}
