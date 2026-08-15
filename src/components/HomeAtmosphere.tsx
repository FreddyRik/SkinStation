import type { CSSProperties } from "react";
import type { HomeShowcaseImage } from "@/lib/home-showcase";

/** Floating catalog assets for the cinematic vault hero (Layer 1). */
export function HomeAtmosphere({
  images,
}: {
  images: HomeShowcaseImage[];
}) {
  if (images.length === 0) return null;

  const slots = [
    { top: "8%", left: "4%", size: 108, delay: "0s", rot: -12 },
    { top: "16%", right: "5%", size: 120, delay: "0.6s", rot: 10 },
    { top: "52%", left: "2%", size: 92, delay: "1.2s", rot: -6 },
    { top: "58%", right: "3%", size: 110, delay: "0.3s", rot: 14 },
    { top: "6%", left: "24%", size: 78, delay: "1.8s", rot: 4 },
    { top: "8%", right: "22%", size: 84, delay: "1.1s", rot: -8 },
    { top: "70%", left: "18%", size: 76, delay: "0.9s", rot: 8 },
    { top: "68%", right: "16%", size: 82, delay: "1.5s", rot: -10 },
    { top: "36%", left: "6%", size: 72, delay: "2s", rot: 6 },
    { top: "38%", right: "7%", size: 74, delay: "0.4s", rot: -4 },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
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
            className="home-skin-float absolute object-contain opacity-[0.18] blur-[0.4px] sm:opacity-[0.26]"
            style={style}
            loading="lazy"
            draggable={false}
          />
        );
      })}
    </div>
  );
}
