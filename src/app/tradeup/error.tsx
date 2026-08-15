"use client";

export default function TradeUpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="hud-panel mx-auto max-w-lg border-[var(--danger)]/40 p-8 text-center">
      <h1 className="type-section-title">Trade-up calculator error</h1>
      <p className="mt-2 text-sm text-[var(--danger)]">
        Something went wrong computing this trade-up.
      </p>
      {error.message ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-[var(--accent)]/40 px-3 py-1.5 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
      >
        Try again
      </button>
    </div>
  );
}
