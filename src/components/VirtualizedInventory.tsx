"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { InventoryView } from "@/lib/inventory-view";

const GRID_ROW_PX = 148;
const LIST_ROW_PX = 72;
const OVERSCAN = 4;
const VIRTUALIZE_AFTER = 48;

type Props<T> = {
  items: T[];
  view: InventoryView;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
};

function columnCountForWidth(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

/**
 * Window-scrolled virtualizer for large inventories. Small lists render fully
 * so hover cards and layout stay simple.
 */
export function VirtualizedInventory<T>({
  items,
  view,
  getKey,
  renderItem,
}: Props<T>) {
  const listClassName =
    view === "list"
      ? "flex flex-col gap-1.5"
      : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(900);
  const [width, setWidth] = useState(1024);
  const [offsetTop, setOffsetTop] = useState(0);

  const measure = useCallback(() => {
    setViewportH(window.innerHeight);
    setScrollY(window.scrollY);
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    setOffsetTop(el.getBoundingClientRect().top + window.scrollY);
  }, []);

  useEffect(() => {
    if (items.length <= VIRTUALIZE_AFTER) return;
    measure();
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [measure, items.length, view]);

  const columns = view === "list" ? 1 : columnCountForWidth(width);
  const rowHeight = view === "list" ? LIST_ROW_PX : GRID_ROW_PX;
  const rowCount = Math.ceil(items.length / columns);

  const range = useMemo(() => {
    if (items.length <= VIRTUALIZE_AFTER) {
      return { start: 0, end: rowCount };
    }
    const startPx = Math.max(0, scrollY - offsetTop);
    const endPx = startPx + viewportH;
    const start = Math.max(0, Math.floor(startPx / rowHeight) - OVERSCAN);
    const end = Math.min(rowCount, Math.ceil(endPx / rowHeight) + OVERSCAN);
    return { start, end };
  }, [items.length, offsetTop, rowCount, rowHeight, scrollY, viewportH]);

  if (items.length <= VIRTUALIZE_AFTER) {
    return (
      <ul className={listClassName}>
        {items.map((item, index) => (
          <li
            key={getKey(item, index)}
            className={view === "grid" ? "h-full" : undefined}
            style={{ contentVisibility: "auto", containIntrinsicSize: `${rowHeight}px` }}
          >
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    );
  }

  const padTop = range.start * rowHeight;
  const padBottom = Math.max(0, (rowCount - range.end) * rowHeight);
  const visible: Array<{ item: T; index: number }> = [];
  for (let row = range.start; row < range.end; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      const item = items[index];
      if (!item) continue;
      visible.push({ item, index });
    }
  }

  return (
    <div ref={containerRef}>
      <ul
        className={listClassName}
        style={{ paddingTop: padTop, paddingBottom: padBottom }}
      >
        {visible.map(({ item, index }) => (
          <li
            key={getKey(item, index)}
            className={view === "grid" ? "h-full" : undefined}
          >
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    </div>
  );
}
