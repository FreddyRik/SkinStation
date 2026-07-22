"use client";

import { buffMarketListingUrl } from "@/lib/steam-market/listing";

/** Compact external link to the Buff163 goods page. */
export function BuffMarketLink({
  goodsId,
  className = "",
  children,
}: {
  goodsId: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const href = buffMarketListingUrl(goodsId);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Open on Buff163"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-[var(--buff)] underline-offset-2 hover:underline ${className}`}
    >
      {children ?? (
        <>
          <span>Buff</span>
          <ExternalIcon />
        </>
      )}
    </a>
  );
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0 opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6.5 3.5H3.5A1 1 0 0 0 2.5 4.5v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
      <path d="M9.5 2.5h4v4M13.5 2.5 7 9" />
    </svg>
  );
}
