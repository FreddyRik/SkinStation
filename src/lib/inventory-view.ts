export const INVENTORY_VIEWS = ["grid", "list"] as const;

export type InventoryView = (typeof INVENTORY_VIEWS)[number];

export const DEFAULT_INVENTORY_VIEW: InventoryView = "grid";

export const INVENTORY_VIEW_STORAGE_KEY = "inventory-tracker-inventory-view";

export const INVENTORY_VIEW_LABELS: Record<InventoryView, string> = {
  grid: "Grid",
  list: "List",
};

export function isInventoryView(value: unknown): value is InventoryView {
  return value === "grid" || value === "list";
}

export function parseInventoryView(
  value: unknown,
  fallback: InventoryView = DEFAULT_INVENTORY_VIEW,
): InventoryView {
  return isInventoryView(value) ? value : fallback;
}

export function readStoredInventoryView(): InventoryView {
  if (typeof window === "undefined") return DEFAULT_INVENTORY_VIEW;
  try {
    return parseInventoryView(
      window.localStorage.getItem(INVENTORY_VIEW_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_INVENTORY_VIEW;
  }
}

export function writeStoredInventoryView(view: InventoryView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVENTORY_VIEW_STORAGE_KEY, view);
  } catch {
    // ignore quota / private mode
  }
}
