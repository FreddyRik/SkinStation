"use client";

export default function InventoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-[var(--danger)]/40 p-8 text-center">
      <h1 className="text-lg font-medium">Inventory failed to load</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Something went wrong rendering this inventory. Retry without leaving the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-[var(--accent)]/40 px-3 py-1.5 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
      >
        Try again
      </button>
    </div>
  );
}
