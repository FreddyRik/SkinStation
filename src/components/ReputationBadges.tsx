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
      ? "rounded-md px-1.5 py-0.5 text-[10px]"
      : "rounded-lg px-2 py-1 text-xs";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const steamHref =
    reputation.steamUrl?.trim() ||
    null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steamHref ? (
        <a
          href={steamHref}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-1.5 border border-[var(--steam)]/35 bg-[var(--steam)]/10 font-semibold text-[var(--steam)] hover:bg-[var(--steam)]/20 ${chip}`}
          title="Open Steam profile"
          onClick={(e) => e.stopPropagation()}
        >
          <SteamBrandIcon className={icon} />
          Steam
          {reputation.steamLabel ? ` · ${reputation.steamLabel}` : ""}
        </a>
      ) : null}

      {reputation.faceitFound ? (
        reputation.faceitUrl ? (
          <a
            href={reputation.faceitUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 border border-[#ff5500]/35 bg-[#ff5500]/10 font-semibold text-[#ff5500] hover:bg-[#ff5500]/20 ${chip}`}
            title={
              reputation.faceitElo != null
                ? `FACEIT ELO ${reputation.faceitElo}`
                : "Open FACEIT profile"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {reputation.faceitLevel != null ? (
              <FaceitLevelBadge level={reputation.faceitLevel} size="sm" />
            ) : (
              <FaceitBrandIcon className={icon} />
            )}
            FACEIT
            {reputation.faceitNickname ? ` · ${reputation.faceitNickname}` : ""}
          </a>
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 border border-[#ff5500]/35 bg-[#ff5500]/10 font-semibold text-[#ff5500] ${chip}`}
            title={
              reputation.faceitElo != null
                ? `FACEIT ELO ${reputation.faceitElo}`
                : "FACEIT profile"
            }
          >
            {reputation.faceitLevel != null ? (
              <FaceitLevelBadge level={reputation.faceitLevel} size="sm" />
            ) : (
              <FaceitBrandIcon className={icon} />
            )}
            FACEIT
            {reputation.faceitNickname ? ` · ${reputation.faceitNickname}` : ""}
          </span>
        )
      ) : noFaceit ? (
        <span
          className={`inline-flex items-center gap-1 border border-[var(--warn)]/40 bg-[var(--warn)]/10 font-semibold text-[var(--warn)] ${chip}`}
          title="No FACEIT profile found for this Steam account"
        >
          <FaceitBrandIcon className={icon} />
          No FACEIT
        </span>
      ) : null}

      {reputation.leetifyFound && reputation.leetifyUrl ? (
        <a
          href={reputation.leetifyUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-1.5 border border-[#7c6af7]/40 bg-[#7c6af7]/15 font-semibold text-[#b7a9ff] hover:bg-[#7c6af7]/25 ${chip}`}
          title={
            reputation.leetifyName
              ? `Leetify · ${reputation.leetifyName}`
              : "Open Leetify profile"
          }
          onClick={(e) => e.stopPropagation()}
        >
          <LeetifyBrandIcon className={icon} />
          Leetify
          {reputation.leetifyRating != null
            ? ` · ${reputation.leetifyRating.toFixed(2)}`
            : ""}
        </a>
      ) : null}
    </div>
  );
}
