"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

type HeroStageStyle = CSSProperties & {
  "--hero-px": string;
  "--hero-py": string;
};

export function HomeHeroStage({
  atmosphere,
  banner,
  children,
}: {
  atmosphere: ReactNode;
  banner: ReactNode;
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const el = stage;

    function resetParallax() {
      el.style.setProperty("--hero-px", "0");
      el.style.setProperty("--hero-py", "0");
    }

    function onMove(event: MouseEvent) {
      if (motion.matches || !finePointer.matches) {
        resetParallax();
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      el.style.setProperty("--hero-px", String(Math.max(-1, Math.min(1, x))));
      el.style.setProperty("--hero-py", String(Math.max(-1, Math.min(1, y))));
    }

    function onLeave() {
      resetParallax();
    }

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    motion.addEventListener("change", resetParallax);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      motion.removeEventListener("change", resetParallax);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw]"
      style={{ "--hero-px": "0", "--hero-py": "0" } as HeroStageStyle}
    >
      <div className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col overflow-x-clip">
        <div className="pointer-events-none absolute inset-0">
          {atmosphere}
        </div>
        <div className="relative z-10 px-4 pt-1 sm:px-6">{banner}</div>
        <div className="relative z-10 flex flex-1 flex-col px-4 pb-12 sm:px-6">
          {children}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--bg)]/80"
        />
      </div>
    </section>
  );
}
