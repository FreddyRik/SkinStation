"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PRIMARY_NAV_LINKS } from "@/lib/site";

type Indicator = {
  x: number;
  width: number;
  visible: boolean;
};

const HIDDEN_INDICATOR: Indicator = { x: 0, width: 0, visible: false };

export function NavRail({ pathname }: { pathname: string }) {
  const trackRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<Indicator>(HIDDEN_INDICATOR);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const active = PRIMARY_NAV_LINKS.find((link) => link.match(pathname));
    const el = active ? itemRefs.current.get(active.href) : undefined;
    if (!track || !el) {
      setIndicator(HIDDEN_INDICATOR);
      return;
    }
    const trackBox = track.getBoundingClientRect();
    const itemBox = el.getBoundingClientRect();
    setIndicator({
      x: itemBox.left - trackBox.left,
      width: itemBox.width,
      visible: true,
    });
  }, [pathname]);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <nav
      ref={trackRef}
      className="relative flex items-stretch rounded-xl border border-[var(--border)]/80 bg-[var(--bg)]/45 p-1"
      aria-label="Primary"
    >
      <span
        aria-hidden
        className="nav-indicator pointer-events-none absolute top-1 bottom-1 rounded-lg bg-[var(--accent)]/16 shadow-[0_0_18px_-4px_color-mix(in_srgb,var(--accent)_55%,transparent)]"
        style={{
          width: indicator.width,
          opacity: indicator.visible ? 1 : 0,
          transform: `translateX(${indicator.x}px)`,
        }}
      />
      {PRIMARY_NAV_LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            ref={(node) => {
              if (node) itemRefs.current.set(link.href, node);
              else itemRefs.current.delete(link.href);
            }}
            aria-current={active ? "page" : undefined}
            className="group relative z-10 flex min-w-[5.5rem] flex-col items-center justify-center rounded-lg px-3 py-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
          >
            <span
              className={`font-mono text-[9px] leading-none tracking-[0.18em] transition ${
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)]/70 group-hover:text-[var(--accent)]"
              }`}
            >
              {link.code}
            </span>
            <span
              className={`mt-1 text-[13px] font-medium leading-none tracking-wide transition ${
                active
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
              }`}
            >
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
