import type { CSSProperties } from "react";
import Link from "next/link";
import {
  inferRareSpecialCategory,
  pickRarePreviews,
  rareSpecialCategoryLabel,
  uniqueRareItems,
  type RareSpecialCategory,
} from "@/lib/cs-catalog/rare-specials";
import type { CatalogContainsItem } from "@/lib/cs-catalog/types";

function GoldQuestionMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="rare-gold-fill" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffe9a0" />
          <stop offset="45%" stopColor="#f5c400" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
      </defs>
      <circle
        cx="40"
        cy="40"
        r="22"
        fill="url(#rare-gold-fill)"
        stroke="#8a6a12"
        strokeWidth="1.5"
      />
      <path
        d="M22 44c2-14 10-22 18-22s16 8 18 22"
        fill="none"
        stroke="#d4af37"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18 46c4 8 12 14 22 14s18-6 22-14"
        fill="none"
        stroke="#c9a227"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text
        x="40"
        y="48"
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="#3b2a00"
        fontFamily="var(--font-display)"
      >
        ?
      </text>
    </svg>
  );
}

function footerNoun(category: RareSpecialCategory, count: number): string {
  if (category === "knives") return count === 1 ? "Knife" : "Knives";
  if (category === "gloves") return count === 1 ? "Glove" : "Gloves";
  return count === 1 ? "Item" : "Items";
}

export function RareSpecialItemsCard({
  crateName,
  crateId,
  items,
  lootImage,
}: {
  crateName: string;
  crateId: string;
  items: CatalogContainsItem[];
  lootImage?: string | null;
}) {
  const unique = uniqueRareItems(items);
  const category = inferRareSpecialCategory(unique);
  const categoryLabel = rareSpecialCategoryLabel(category);
  const previews = pickRarePreviews(unique, 4);
  const count = unique.length;
  const href = `/database/${encodeURIComponent(crateId)}/rare`;

  return (
    <Link
      href={href}
      aria-label={`Rare special items: ${count} possible ${footerNoun(category, count).toLowerCase()} in ${crateName}`}
      style={{ "--rarity": "#e4ae39" } as CSSProperties}
      className="rarity-frame flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--bg-elevated)]/40 transition hover:border-[#e4ae39]/55"
    >
      <div className="px-3 pt-3">
        <p className="type-overline truncate">{crateName}</p>
        <p className="type-card-title mt-1 truncate text-sm leading-tight">
          {categoryLabel}
        </p>
      </div>

      <div className="mx-3 mt-2 rounded-md bg-[#f5c400] px-1 py-1 text-center font-mono text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-black">
        ★ Rare Special Items ★
      </div>

      <div className="flex items-center justify-center py-2">
        {lootImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lootImage}
            alt=""
            className="h-16 w-16 object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
          />
        ) : (
          <GoldQuestionMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
        )}
      </div>

      {previews.length > 0 ? (
        <div className="grid flex-1 grid-cols-2 gap-1.5 px-3 pb-3">
          {previews.map((item) => (
            <div
              key={item.id}
              className="flex aspect-square items-center justify-center rounded-md bg-[var(--bg)]/70"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  className="max-h-full max-w-full object-contain p-0.5"
                  loading="lazy"
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="type-metric mt-auto bg-black/40 px-2 py-2.5 text-center text-[11px]">
        {count.toLocaleString("en-US")} Possible {footerNoun(category, count)}
      </div>
    </Link>
  );
}
