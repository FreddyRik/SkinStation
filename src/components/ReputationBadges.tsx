"use client";

import { FaceitLevelBadge } from "@/components/FaceitLevelBadge";
import {
  FaceitBrandIcon,
  LeetifyBrandIcon,
  SteamBrandIcon,
} from "@/components/BrandIcons";
import type { ReputationView } from "@/types/reputation";

export type { ReputationView };

export function ReputationBadges({
  reputation,
  size = "md",
  nowrap = false,
}: {
  reputation: ReputationView;
  size?: "sm" | "md";
  /** Keep chips on one line (profile cards); long labels move to title. */
  nowrap?: boolean;
}) {
  const checked = Boolean(reputation.faceitFetchedAt);
  const noFaceit = checked && !reputation.faceitFound;
  const compact = nowrap;
  const chip = compact
    ? "box-border h-6 shrink-0 rounded-md px-1.5 text-[10px] leading-none"
    : size === "sm"
      ? "box-border h-6 rounded-md px-1.5 text-[10px] leading-none"
      : "box-border h-7 rounded-lg px-2 text-xs leading-none";
  const icon = size === "sm" || compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const faceitBadgeSize = size === "sm" || compact ? "xs" : "sm";
  const steamHref = reputation.steamUrl?.trim() || null;

  const chipBase = `inline-flex items-center gap-1.5 border font-semibold ${chip}`;

  return (
    <div
      className={
        compact
          ? "flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden"
          : "flex flex-wrap items-center gap-1.5"
      }
    >
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
            {!compact && reputation.steamLabel
              ? ` · ${reputation.steamLabel}`
              : ""}
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
              [
                reputation.faceitNickname
                  ? `FACEIT · ${reputation.faceitNickname}`
                  : "Open FACEIT profile",
                reputation.faceitElo != null
                  ? `ELO ${reputation.faceitElo}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
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
              {!compact && reputation.faceitNickname
                ? ` · ${reputation.faceitNickname}`
                : ""}
            </span>
          </a>
        ) : (
          <span
            className={`${chipBase} border-[#ff5500]/35 bg-[#ff5500]/10 text-[#ff5500]`}
            title={
              [
                reputation.faceitNickname
                  ? `FACEIT · ${reputation.faceitNickname}`
                  : "FACEIT profile",
                reputation.faceitElo != null
                  ? `ELO ${reputation.faceitElo}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
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
              {!compact && reputation.faceitNickname
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
              ? `Leetify · ${reputation.leetifyName}${
                  reputation.leetifyRating != null
                    ? ` · ${reputation.leetifyRating.toFixed(2)}`
                    : ""
                }`
              : reputation.leetifyRating != null
                ? `Leetify · ${reputation.leetifyRating.toFixed(2)}`
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
