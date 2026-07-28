"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Keeps the share card at its designed pixel size for PNG export,
 * but scales it down to fit narrow viewports without horizontal scroll.
 */
export function ShareCardViewport({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function measure() {
      if (!outer || !inner) return;
      const cardWidth = Math.max(inner.offsetWidth, 1);
      const cardHeight = Math.max(inner.offsetHeight, 1);
      const available = Math.max(outer.clientWidth, 1);
      const nextScale = Math.min(1, available / cardWidth);
      setScale(nextScale);
      setLayout({
        width: cardWidth * nextScale,
        height: cardHeight * nextScale,
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={outerRef} className={`w-full min-w-0 ${className}`}>
      <div
        className="relative mx-auto overflow-hidden"
        style={
          layout
            ? { width: layout.width, height: layout.height }
            : { width: "100%", maxWidth: 400 }
        }
      >
        <div
          ref={innerRef}
          className="origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
