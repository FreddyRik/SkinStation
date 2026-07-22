"use client";

import { steamMarketListingUrl } from "@/lib/steam-market/listing";

/** Compact external link to the Steam Community Market listing. */
export function SteamMarketLink({
  marketHashName,
  className = "",
  children,
}: {
  marketHashName: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const href = steamMarketListingUrl(marketHashName);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Open on Steam Community Market"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-[var(--steam)] underline-offset-2 hover:underline ${className}`}
    >
      {children ?? (
        <>
          <span>Steam</span>
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
