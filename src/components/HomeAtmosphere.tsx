"use client";

import type { CSSProperties } from "react";
import type { HomeShowcaseImage } from "@/lib/home-showcase";

/** Soft floating skin images behind the home inventory hero. */
export function HomeAtmosphere({
  images,
}: {
  images: HomeShowcaseImage[];
}) {
  if (images.length === 0) return null;

  const slots = [
    { top: "8%", left: "2%", size: 88, delay: "0s", rot: -12 },
    { top: "18%", right: "3%", size: 96, delay: "0.6s", rot: 10 },
    { top: "55%", left: "0%", size: 78, delay: "1.2s", rot: -6 },
    { top: "62%", right: "1%", size: 90, delay: "0.3s", rot: 14 },
    { top: "4%", left: "22%", size: 70, delay: "1.8s", rot: 4 },
    { top: "6%", right: "20%", size: 74, delay: "1.1s", rot: -8 },
    { top: "72%", left: "18%", size: 68, delay: "0.9s", rot: 8 },
    { top: "70%", right: "16%", size: 72, delay: "1.5s", rot: -10 },
    { top: "38%", left: "4%", size: 64, delay: "2s", rot: 6 },
    { top: "40%", right: "5%", size: 66, delay: "0.4s", rot: -4 },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      <div
        className="absolute -left-10 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
        style={{ background: "rgba(94, 234, 212, 0.18)" }}
      />
      <div
        className="absolute -right-8 top-0 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: "rgba(255, 107, 53, 0.12)" }}
      />

      {images.slice(0, slots.length).map((img, i) => {
        const slot = slots[i]!;
        const style: CSSProperties = {
          top: slot.top,
          width: slot.size,
          height: slot.size,
          animationDelay: slot.delay,
          transform: `rotate(${slot.rot}deg)`,
          ...(slot.left != null ? { left: slot.left } : {}),
          ...(slot.right != null ? { right: slot.right } : {}),
        };
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            src={img.image}
            alt=""
            className="home-skin-float absolute object-contain opacity-[0.22] blur-[0.5px] sm:opacity-[0.28]"
            style={style}
            loading="lazy"
            draggable={false}
          />
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-panel)]/20 via-transparent to-[var(--bg-panel)]/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-panel)]/80 via-transparent to-[var(--bg-panel)]/80" />
    </div>
  );
}
