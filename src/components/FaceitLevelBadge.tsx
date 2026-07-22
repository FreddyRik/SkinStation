"use client";

import { useState } from "react";
import { faceitLevelImageSrc } from "@/lib/faceit/levels";

export function FaceitLevelBadge({
  level,
  href,
  size = "md",
  showLabel = false,
}: {
  level: number | null | undefined;
  href?: string | null;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const validLevel = level != null && level >= 1 && level <= 10;

  if (!validLevel) {
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-[#ff5500] hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        FACEIT
      </a>
    );
  }

  const dim =
    size === "xs" ? "h-3.5 w-3.5" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const px = size === "xs" ? 14 : size === "sm" ? 20 : 28;
  const src = !imgFailed ? faceitLevelImageSrc(level) : null;
  const badge = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`FACEIT level ${level}`}
      title={`FACEIT level ${level}`}
      width={px}
      height={px}
      className={`${dim} shrink-0 object-contain`}
      draggable={false}
      onError={() => setImgFailed(true)}
    />
  ) : (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-md bg-[#ff6300] text-[10px] font-bold leading-none text-[#0c0c0c]`}
      title={`FACEIT level ${level}`}
      aria-label={`FACEIT level ${level}`}
    >
      {level}
    </span>
  );

  const content = showLabel ? (
    <span className="inline-flex items-center gap-1.5">
      {badge}
      <span className="text-xs font-medium text-[#ff5500]">FACEIT</span>
    </span>
  ) : (
    badge
  );

  if (!href) return content;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 transition hover:brightness-110"
      title={`Open FACEIT profile (level ${level})`}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </a>
  );
}
