import type { CSSProperties } from "react";
import Link from "next/link";
import {
  CATALOG_KIND_LABELS,
  formatPhaseShort,
  navFilterForWeapon,
  phaseAccent,
} from "@/lib/cs-catalog";
import {
  FlagChips,
  KnifeBadge,
  RarityChip,
} from "@/components/database/CatalogBadges";
import {
  collectionHref,
  itemHref,
} from "@/components/database/catalog-links";
import type { CatalogCardProps } from "@/types/catalog-ui";

export function CatalogCard({
  item,
  onWeaponClick,
  formatUsdRange,
}: CatalogCardProps) {
  const href = itemHref(item);
  const isSkin = item.kind === "skin";
  const eyebrow = isSkin ? item.weaponName : CATALOG_KIND_LABELS[item.kind];
  const title = isSkin ? item.patternName || item.name : item.name;
  const isPhaseFamily = isSkin && item.phaseFamilySize > 1;
  const phaseShort =
    isSkin && !isPhaseFamily ? formatPhaseShort(item.phase) : null;
  const rarityLabel = item.rarity
    ? [item.rarity.name, isSkin ? item.weaponCategory : null]
        .filter(Boolean)
        .join(" ")
    : null;
  const weaponFilter =
    isSkin && item.weaponName
      ? navFilterForWeapon(item.weaponCategory, item.weaponName)
      : null;
  const sourceHref =
    item.sourceId && item.sourceKind === "collection"
      ? collectionHref(item.sourceId)
      : item.sourceId && item.sourceKind === "crate"
        ? `/database/${encodeURIComponent(item.sourceId)}`
        : null;
  const normalRange = formatUsdRange(item.priceMinUsd, item.priceMaxUsd);
  const stRange =
    item.kind === "skin" && item.stattrak
      ? formatUsdRange(item.stattrakPriceMinUsd, item.stattrakPriceMaxUsd)
      : null;

  const extraCollections =
    item.sourceKind === "collection" && item.collectionCount > 1
      ? item.collectionCount - 1
      : 0;
  const sourceLabel =
    extraCollections > 0
      ? `${item.sourceName} +${extraCollections}`
      : item.sourceName;
  const sourceTitle =
    extraCollections > 0
      ? `${item.sourceName} and ${extraCollections} more collection${
          extraCollections === 1 ? "" : "s"
        }`
      : item.sourceName
        ? `Open ${item.sourceName}`
        : undefined;

  const rarityVar = {
    "--rarity": item.rarity?.color?.trim() || "var(--accent)",
  } as CSSProperties;

  return (
    <li>
      <article
        className="rarity-frame group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border bg-[var(--bg-elevated)]/40 px-3 pb-3 pt-4 text-center"
        style={rarityVar}
      >
        <div className="flex w-full flex-col items-center gap-1 px-1">
          {eyebrow ? (
            weaponFilter && onWeaponClick ? (
              <button
                type="button"
                onClick={() => onWeaponClick(item.weaponName!, item.weaponCategory)}
                className="type-overline flex max-w-full items-center justify-center gap-1 transition hover:text-[var(--accent)]"
                title={`Browse all ${eyebrow} skins`}
              >
                {item.isKnife ? <KnifeBadge /> : null}
                <span className="truncate underline-offset-2 hover:underline">
                  {eyebrow}
                </span>
              </button>
            ) : (
              <p className="type-overline flex items-center justify-center gap-1">
                {item.isKnife ? <KnifeBadge /> : null}
                <span className="truncate">{eyebrow}</span>
              </p>
            )
          ) : null}
          <Link
            href={href}
            className="type-card-title line-clamp-2 min-h-[2.5rem] text-base leading-snug transition hover:text-[var(--accent)] sm:text-lg"
            title={
              isPhaseFamily
                ? `${item.name} · ${item.phaseFamilySize} phases`
                : phaseShort
                  ? `${item.name} · ${item.phase}`
                  : item.name
            }
          >
            {title}
            {phaseShort ? (
              <span
                className="ml-1.5 inline-block align-middle font-mono text-[11px] font-bold tracking-wide"
                style={{ color: phaseAccent(item.phase) }}
              >
                {phaseShort}
              </span>
            ) : null}
          </Link>
          {isPhaseFamily ? (
            <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-muted)]">
              {item.phaseFamilySize} PHASES
            </p>
          ) : null}
        </div>

        <Link
          href={href}
          className="mt-2 flex w-full flex-wrap items-center justify-center gap-1.5"
        >
          {rarityLabel ? (
            <RarityChip label={rarityLabel} color={item.rarity?.color} />
          ) : null}
          {isSkin ? (
            <FlagChips stattrak={item.stattrak} souvenir={item.souvenir} />
          ) : null}
        </Link>

        <Link
          href={href}
          className="my-3 flex h-36 w-full items-center justify-center sm:h-44"
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-md transition duration-300 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <span className="type-overline">No image</span>
          )}
        </Link>

        {normalRange || stRange ? (
          <Link href={href} className="mb-2 flex w-full flex-col items-center gap-0.5">
            {normalRange ? (
              <p className="type-metric text-sm text-[var(--steam)]">
                {normalRange}
              </p>
            ) : null}
            {stRange ? (
              <p className="type-metric text-sm text-[var(--buff)]">{stRange}</p>
            ) : null}
          </Link>
        ) : null}

        {item.sourceName && sourceHref ? (
          <Link
            href={sourceHref}
            className="mt-auto flex w-full items-center justify-center gap-2 border-t border-[var(--border)]/60 pt-2.5 transition hover:text-[var(--accent)]"
            title={sourceTitle}
          >
            {item.sourceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.sourceImage}
                alt=""
                className="h-5 w-5 object-contain opacity-90"
                loading="lazy"
              />
            ) : null}
            <p className="truncate text-[11px] text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline">
              {sourceLabel}
            </p>
          </Link>
        ) : item.sourceName ? (
          <div
            className="mt-auto flex w-full items-center justify-center gap-2 border-t border-[var(--border)]/60 pt-2.5"
            title={sourceTitle}
          >
            {item.sourceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.sourceImage}
                alt=""
                className="h-5 w-5 object-contain opacity-90"
                loading="lazy"
              />
            ) : null}
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {sourceLabel}
            </p>
          </div>
        ) : (
          <div className="mt-auto pt-2.5" aria-hidden />
        )}

        <span
          aria-hidden
          className="rarity-edge pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-70"
        />
      </article>
    </li>
  );
}
