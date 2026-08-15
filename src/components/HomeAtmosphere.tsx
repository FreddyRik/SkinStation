import type { CSSProperties } from "react";
import type { HomeShowcaseImage } from "@/lib/home-showcase";

type SkinSlot = {
  top: string;
  left?: string;
  right?: string;
  size: number;
  delay: string;
  rot: number;
  enterX: string;
  enterY: string;
  depth: number;
  opacity: number;
};

const SLOTS: SkinSlot[] = [
  { top: "8%", left: "3%", size: 200, delay: "0s", rot: -14, enterX: "-42vw", enterY: "-10vh", depth: 0.95, opacity: 0.62 },
  { top: "14%", right: "4%", size: 210, delay: "0.06s", rot: 12, enterX: "44vw", enterY: "-8vh", depth: 1, opacity: 0.66 },
  { top: "48%", left: "1%", size: 170, delay: "0.12s", rot: -8, enterX: "-38vw", enterY: "6vh", depth: 0.7, opacity: 0.55 },
  { top: "52%", right: "2%", size: 190, delay: "0.18s", rot: 16, enterX: "40vw", enterY: "10vh", depth: 0.82, opacity: 0.58 },
  { top: "2%", left: "22%", size: 150, delay: "0.22s", rot: 6, enterX: "-18vw", enterY: "-16vh", depth: 0.45, opacity: 0.48 },
  { top: "4%", right: "20%", size: 160, delay: "0.28s", rot: -10, enterX: "20vw", enterY: "-14vh", depth: 0.5, opacity: 0.5 },
  { top: "68%", left: "16%", size: 140, delay: "0.34s", rot: 10, enterX: "-16vw", enterY: "18vh", depth: 0.38, opacity: 0.46 },
  { top: "66%", right: "14%", size: 155, delay: "0.4s", rot: -12, enterX: "18vw", enterY: "16vh", depth: 0.42, opacity: 0.48 },
  { top: "32%", left: "8%", size: 130, delay: "0.46s", rot: 8, enterX: "-28vw", enterY: "2vh", depth: 0.32, opacity: 0.44 },
  { top: "34%", right: "7%", size: 135, delay: "0.5s", rot: -6, enterX: "30vw", enterY: "4vh", depth: 0.35, opacity: 0.45 },
];

type ParallaxStyle = CSSProperties & {
  "--depth": string;
};

type SkinStyle = CSSProperties & {
  "--enter-x": string;
  "--enter-y": string;
  "--rest-rot": string;
  "--skin-opacity": string;
};

/** Soft floating skin images behind the home inventory hero. */
export function HomeAtmosphere({
  images,
}: {
  images: HomeShowcaseImage[];
}) {
  if (images.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="home-hero-bloom absolute left-1/2 top-[46%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[28rem] sm:w-[34rem]"
        style={{
          background: "color-mix(in srgb, var(--accent) 28%, transparent)",
        }}
      />

      {images.slice(0, SLOTS.length).map((img, i) => {
        const slot = SLOTS[i]!;
        const wrapStyle: ParallaxStyle = {
          top: slot.top,
          width: `clamp(5.6rem, 14vw, ${slot.size}px)`,
          height: `clamp(5.6rem, 14vw, ${slot.size}px)`,
          "--depth": String(slot.depth),
          ...(slot.left != null ? { left: slot.left } : {}),
          ...(slot.right != null ? { right: slot.right } : {}),
        };
        const imgStyle: SkinStyle = {
          animationDelay: `${slot.delay}, calc(${slot.delay} + 0.9s)`,
          "--enter-x": slot.enterX,
          "--enter-y": slot.enterY,
          "--rest-rot": `${slot.rot}deg`,
          "--skin-opacity": String(slot.opacity),
        };
        return (
          <div
            key={img.id}
            className="home-skin-parallax absolute"
            style={wrapStyle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.image}
              alt=""
              className="home-skin-float h-full w-full object-contain"
              style={imgStyle}
              loading="lazy"
              draggable={false}
            />
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]/70" />
    </div>
  );
}
