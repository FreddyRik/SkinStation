"use client";

import {
  INVENTORY_VIEWS,
  INVENTORY_VIEW_LABELS,
  type InventoryView,
  writeStoredInventoryView,
} from "@/lib/inventory-view";

export function InventoryViewToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: InventoryView;
  onChange: (view: InventoryView) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-0.5"
      role="group"
      aria-label="Inventory layout"
    >
      {INVENTORY_VIEWS.map((view) => {
        const active = value === view;
        return (
          <button
            key={view}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={INVENTORY_VIEW_LABELS[view]}
            onClick={() => {
              writeStoredInventoryView(view);
              onChange(view);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition disabled:opacity-50 ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {INVENTORY_VIEW_LABELS[view]}
          </button>
        );
      })}
    </div>
  );
}
