"use client";

import { FaceitLevelBadge } from "@/components/FaceitLevelBadge";
import {
  FaceitBrandIcon,
  LeetifyBrandIcon,
  SteamBrandIcon,
} from "@/components/BrandIcons";

export type ReputationView = {
  steamUrl?: string | null;
  steamLabel?: string | null;
  faceitUrl: string | null;
  faceitLevel: number | null;
  faceitElo: number | null;
  faceitNickname: string | null;
  faceitFound: boolean;
  faceitFetchedAt: string | null;
  leetifyUrl: string | null;
  leetifyName: string | null;
  leetifyRating: number | null;
  leetifyFound: boolean;
};

export function ReputationBadges({
  reputation,
  size = "md",
}: {
  reputation: ReputationView;
  size?: "sm" | "md";
}) {
  const checked = Boolean(reputation.faceitFetchedAt);
  const noFaceit = checked && !reputation.faceitFound;
  const chip =
    size === "sm"
      ? "box-border h-6 rounded-md px-1.5 text-[10px] leading-none"
      : "box-border h-7 rounded-lg px-2 text-xs leading-none";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const faceitBadgeSize = size === "sm" ? "xs" : "sm";
  const steamHref = reputation.steamUrl?.trim() || null;

  const chipBase = `inline-flex shrink-0 items-center gap-1.5 border font-semibold ${chip}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steamHref ? (
        <a
          href={steamHref}
          target="_blank"
          rel="noreferrer"
          className={`${chipBase} border-[var(--steam)]/35 bg-[var(--steam)]/10 text-[var(--steam)] hover:bg-[var(--steam)]/20`}
          title="Open Steam profile"
          onClick={(e) => e.stopPropagation()}
        >
          <SteamBrandIcon className={`shrink-0 ${icon}`} />
          <span className="truncate">
            Steam
            {reputation.steamLabel ? ` · ${reputation.steamLabel}` : ""}
          </span>
        </a>
      ) : null}

      {reputation.faceitFound ? (
        reputation.faceitUrl ? (
          <a
            href={reputation.faceitUrl}
            target="_blank"
            rel="noreferrer"
            className={`${chipBase} border-[#ff5500]/35 bg-[#ff5500]/10 text-[#ff5500] hover:bg-[#ff5500]/20`}
            title={
              reputation.faceitElo != null
                ? `FACEIT ELO ${reputation.faceitElo}`
                : "Open FACEIT profile"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {reputation.faceitLevel != null ? (
              <FaceitLevelBadge
                level={reputation.faceitLevel}
                size={faceitBadgeSize}
              />
            ) : (
              <FaceitBrandIcon className={`shrink-0 ${icon}`} />
            )}
            <span className="truncate">
              FACEIT
              {reputation.faceitNickname
                ? ` · ${reputation.faceitNickname}`
                : ""}
            </span>
          </a>
        ) : (
          <span
            className={`${chipBase} border-[#ff5500]/35 bg-[#ff5500]/10 text-[#ff5500]`}
            title={
              reputation.faceitElo != null
                ? `FACEIT ELO ${reputation.faceitElo}`
                : "FACEIT profile"
            }
          >
            {reputation.faceitLevel != null ? (
              <FaceitLevelBadge
                level={reputation.faceitLevel}
                size={faceitBadgeSize}
              />
            ) : (
              <FaceitBrandIcon className={`shrink-0 ${icon}`} />
            )}
            <span className="truncate">
              FACEIT
              {reputation.faceitNickname
                ? ` · ${reputation.faceitNickname}`
                : ""}
            </span>
          </span>
        )
      ) : noFaceit ? (
        <span
          className={`${chipBase} gap-1 border-[var(--warn)]/40 bg-[var(--warn)]/10 text-[var(--warn)]`}
          title="No FACEIT profile found for this Steam account"
        >
          <FaceitBrandIcon className={`shrink-0 ${icon}`} />
          <span className="truncate">No FACEIT</span>
        </span>
      ) : null}

      {reputation.leetifyFound && reputation.leetifyUrl ? (
        <a
          href={reputation.leetifyUrl}
          target="_blank"
          rel="noreferrer"
          className={`${chipBase} border-[#7c6af7]/40 bg-[#7c6af7]/15 text-[#b7a9ff] hover:bg-[#7c6af7]/25`}
          title={
            reputation.leetifyName
              ? `Leetify · ${reputation.leetifyName}`
              : "Open Leetify profile"
          }
          onClick={(e) => e.stopPropagation()}
        >
          <LeetifyBrandIcon className={`shrink-0 ${icon}`} />
          <span className="truncate">
            Leetify
            {reputation.leetifyRating != null
              ? ` · ${reputation.leetifyRating.toFixed(2)}`
              : ""}
          </span>
        </a>
      ) : null}
    </div>
  );
}
