"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { InventoryItemView } from "@/types/inventory";
import {
  downloadTextFile,
  inventoryExportFilename,
  inventoryToCsv,
  inventoryToJson,
  type InventoryExportMeta,
} from "@/lib/inventory-export";

type Props = {
  items: InventoryItemView[];
  meta: InventoryExportMeta;
  disabled?: boolean;
};

export function InventoryExportButton({
  items,
  meta,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const empty = items.length === 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function exportAs(format: "csv" | "json") {
    if (empty) return;
    const filename = inventoryExportFilename(meta, format);
    if (format === "csv") {
      downloadTextFile(
        inventoryToCsv(items, meta),
        filename,
        "text/csv;charset=utf-8",
      );
    } else {
      downloadTextFile(
        inventoryToJson(items, meta),
        filename,
        "application/json;charset=utf-8",
      );
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || empty}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={
          empty
            ? "No items to export"
            : `Export full inventory (${items.length} item${items.length === 1 ? "" : "s"})`
        }
        onClick={() => setOpen((v) => !v)}
        className="et-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--text-muted)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`h-3 w-3 opacity-70 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      {open && !empty && (
        <div
          id={menuId}
          role="menu"
          aria-label="Export format"
          className="et-card absolute left-0 top-[calc(100%+6px)] z-40 min-w-[11rem] overflow-hidden py-1"
        >
          <ExportMenuItem
            label="CSV spreadsheet"
            hint=".csv"
            onSelect={() => exportAs("csv")}
          />
          <ExportMenuItem
            label="JSON data"
            hint=".json"
            onSelect={() => exportAs("json")}
          />
        </div>
      )}
    </div>
  );
}

function ExportMenuItem({
  label,
  hint,
  onSelect,
}: {
  label: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-[var(--text)] transition hover:bg-[var(--bg-elevated)]"
    >
      <span className="font-medium">{label}</span>
      <span className="text-[var(--text-muted)]">{hint}</span>
    </button>
  );
}
