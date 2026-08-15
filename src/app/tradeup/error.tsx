"use client";

export default function TradeUpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="et-card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
        Trade-up calculator error
      </h1>
      <p className="mt-2 text-sm text-[var(--danger)]">
        Something went wrong computing this trade-up.
      </p>
      {error.message ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-4 text-sm text-[var(--accent)] underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
