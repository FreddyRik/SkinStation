"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { ReputationBadges } from "@/components/ReputationBadges";
import type { Currency } from "@/lib/currency";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  parseCurrency,
  readStoredCurrency,
  writeStoredCurrency,
} from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";
import { useUsdToEurRate } from "@/hooks/useUsdToEurRate";
import {
  readRecentProfiles,
  rememberRecentProfile,
  type RecentProfileEntry,
} from "@/lib/recent-profiles";
import {
  formatBackoffCountdown,
  isSteamBackoffActive,
  looksLikeSteamRateLimitMessage,
  markSteamBackoff,
  steamBackoffRemainingMs,
} from "@/lib/steam-backoff";

type ProfileSummary = RecentProfileEntry;

function steamProfileUrl(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}`;
}

function entryFromApiProfile(
  profile: Record<string, unknown>,
  overrides?: Partial<RecentProfileEntry>,
): RecentProfileEntry | null {
  const id = typeof profile.id === "string" ? profile.id : null;
  const steamId = typeof profile.steamId === "string" ? profile.steamId : null;
  if (!id || !steamId) return null;

  const currency = parseCurrency(profile.currency);
  const faceitFetchedAt =
    typeof profile.faceitFetchedAt === "string"
      ? profile.faceitFetchedAt
      : null;
  const lastSyncedAt =
    typeof profile.lastSyncedAt === "string" ? profile.lastSyncedAt : null;

  return {
    id,
    steamId,
    personaName:
      typeof profile.personaName === "string" ? profile.personaName : null,
    avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : null,
    currency,
    faceitUrl: typeof profile.faceitUrl === "string" ? profile.faceitUrl : null,
    faceitLevel:
      typeof profile.faceitLevel === "number" ? profile.faceitLevel : null,
    faceitElo: typeof profile.faceitElo === "number" ? profile.faceitElo : null,
    faceitNickname:
      typeof profile.faceitNickname === "string" ? profile.faceitNickname : null,
    faceitFound: Boolean(profile.faceitFound),
    faceitFetchedAt,
    leetifyUrl:
      typeof profile.leetifyUrl === "string" ? profile.leetifyUrl : null,
    leetifyName:
      typeof profile.leetifyName === "string" ? profile.leetifyName : null,
    leetifyRating:
      typeof profile.leetifyRating === "number" ? profile.leetifyRating : null,
    leetifyFound: Boolean(profile.leetifyFound),
    itemCount: typeof profile.itemCount === "number" ? profile.itemCount : 0,
    lastSyncedAt,
    latestSnapshot: null,
    ...overrides,
  };
}

export function ProfileLookup({
  recentProfiles: seedProfiles = [],
  atmosphere = null,
  accentGlow = false,
}: {
  recentProfiles?: ProfileSummary[];
  /** Optional decorative layer rendered behind the hero card content. */
  atmosphere?: ReactNode;
  /** Soft accent glow on the panel edge and load button (home hub). */
  accentGlow?: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const usdToEur = useUsdToEurRate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [recentProfiles, setRecentProfiles] =
    useState<ProfileSummary[]>(seedProfiles);

  useEffect(() => {
    setCurrency(readStoredCurrency());
    setRecentProfiles(readRecentProfiles());
    function onCurrency(e: Event) {
      const next = (e as CustomEvent<Currency>).detail;
      if (next) setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSyncNote(null);
    setLoading(true);
    writeStoredCurrency(currency);

    try {
      if (isSteamBackoffActive()) {
        const left = steamBackoffRemainingMs();
        throw new Error(
          `Steam is rate-limiting this server right now. Wait ${formatBackoffCountdown(left)} before loading another inventory.`,
        );
      }

      const createRes = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const createData = (await createRes.json()) as {
        error?: string;
        profile?: Record<string, unknown>;
      };
      if (!createRes.ok || !createData.profile) {
        if (
          createRes.status === 429 ||
          looksLikeSteamRateLimitMessage(createData.error)
        ) {
          markSteamBackoff();
        }
        throw new Error(createData.error ?? "Failed to resolve profile");
      }

      const profileId = createData.profile.id as string;
      const remembered = entryFromApiProfile(createData.profile);
      if (remembered) {
        setRecentProfiles(rememberRecentProfile(remembered));
      }

      // Store prices in USD; the UI converts with FX for display currency.
      const storageCurrency = DEFAULT_CURRENCY;
      setSyncNote(
        `Syncing inventory from Steam… this can take a minute.`,
      );

      const syncRes = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, currency: storageCurrency }),
      });
      const syncData = (await syncRes.json().catch(() => null)) as {
        error?: string;
        itemCount?: number;
        warning?: string;
        usedCachedInventory?: boolean;
        skippedCooldown?: boolean;
      } | null;

      if (
        syncRes.status === 429 ||
        looksLikeSteamRateLimitMessage(syncData?.error) ||
        looksLikeSteamRateLimitMessage(syncData?.warning) ||
        syncData?.usedCachedInventory
      ) {
        markSteamBackoff();
      }

      if (remembered && typeof syncData?.itemCount === "number") {
        setRecentProfiles(
          rememberRecentProfile({
            ...remembered,
            itemCount: syncData.itemCount,
            lastSyncedAt: new Date().toISOString(),
          }),
        );
      }

      if (!syncRes.ok) {
        // Prefer opening inventory when Steam fails — cached items may still be there.
        if (
          syncRes.status === 429 ||
          looksLikeSteamRateLimitMessage(syncData?.error)
        ) {
          setSyncNote(
            "Steam rate-limited this sync. Opening inventory — cached items will show if we have any.",
          );
        }
        router.push(`/inventory/${profileId}`);
        router.refresh();
        return;
      }

      if (syncData?.usedCachedInventory || syncData?.warning) {
        setSyncNote(
          typeof syncData.warning === "string" && syncData.warning
            ? syncData.warning
            : "Opened cached inventory (Steam was unavailable).",
        );
      }

      router.push(`/inventory/${profileId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={accentGlow ? "flex flex-1 flex-col" : "space-y-8"}>
      <section
        className={
          accentGlow
            ? "relative flex flex-1 flex-col items-center justify-center py-6 sm:py-8"
            : "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/80 p-6 sm:p-10"
        }
      >
        {atmosphere}
        {!accentGlow ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(color-mix(in srgb, var(--accent) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--accent) 8%, transparent) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        ) : null}
        <div
          className={`relative mx-auto text-center ${
            accentGlow ? "max-w-3xl space-y-5" : "max-w-2xl space-y-4"
          }`}
        >
          <p
            className={`text-sm uppercase tracking-[0.18em] ${
              accentGlow
                ? "hero-rise text-[var(--accent)]"
                : "text-[var(--accent-dim)]"
            }`}
            style={accentGlow ? { animationDelay: "0.08s" } : undefined}
          >
            Public Steam inventory
          </p>
          <h1
            className={
              accentGlow
                ? "hero-rise type-page-title text-[clamp(2.35rem,5vw,4.25rem)]"
                : "text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl"
            }
            style={accentGlow ? { animationDelay: "0.18s" } : undefined}
          >
            Your one-stop for CS2 skins
          </h1>
          <p
            className={`leading-relaxed text-[var(--text-muted)] ${
              accentGlow ? "hero-rise mx-auto max-w-xl text-base sm:text-lg" : ""
            }`}
            style={accentGlow ? { animationDelay: "0.28s" } : undefined}
          >
            Track your inventory, browse the skin catalog, and run trade-up
            odds. Paste a Steam profile URL or SteamID64 to get started.
          </p>

          {accentGlow ? (
            <form
              onSubmit={onSubmit}
              className="hero-rise mx-auto mt-2 flex w-full max-w-2xl items-stretch overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]/85 p-1.5 shadow-[0_0_48px_-8px_color-mix(in_srgb,var(--accent)_55%,transparent)] backdrop-blur-sm"
              style={{ animationDelay: "0.42s" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://steamcommunity.com/id/yourname or SteamID64"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-left text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] sm:px-5 sm:py-3.5"
                disabled={loading}
                required
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="home-load-btn shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-dim)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-7"
              >
                {loading ? "Loading…" : "Load inventory"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://steamcommunity.com/id/yourname or SteamID64"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-left text-[var(--text)] outline-none ring-[var(--accent)] placeholder:text-[var(--text-muted)] focus:ring-2"
                disabled={loading}
                required
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-dim)] disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
              >
                {loading ? "Loading…" : "Load inventory"}
              </button>
            </form>
          )}

          {syncNote && (
            <p className="text-sm text-[var(--steam)]">{syncNote}</p>
          )}
          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}
          <p
            className={`text-xs text-[var(--text-muted)] ${
              accentGlow ? "hero-rise" : ""
            }`}
            style={accentGlow ? { animationDelay: "0.55s" } : undefined}
          >
            Inventory must be set to Public on Steam. First sync may take longer
            while floats and prices are fetched.
          </p>
        </div>
      </section>

      {recentProfiles.length > 0 && (
        <section
          className={
            accentGlow
              ? "relative z-10 mx-auto w-full max-w-3xl space-y-5 border-t border-[var(--border)]/35 pb-4 pt-8"
              : "mx-auto max-w-3xl space-y-4"
          }
        >
          <h2
            className={
              accentGlow
                ? "type-overline text-center"
                : "text-center text-lg font-medium text-[var(--text)]"
            }
          >
            Recent on this device
          </h2>
          <ul
            className={
              accentGlow
                ? "flex flex-col items-center gap-5"
                : "grid items-stretch gap-3 sm:grid-cols-2"
            }
          >
            {recentProfiles.map((p) => {
              const snapshotCurrency =
                p.latestSnapshot?.currency ?? p.currency;
              const inventoryHref = `/inventory/${p.id}`;
              const buffDisplay = p.latestSnapshot
                ? formatMoney(
                    convertMoney(
                      p.latestSnapshot.totalBuff,
                      snapshotCurrency,
                      currency,
                      usdToEur,
                    ),
                    currency,
                  )
                : null;
              const singleHomeRecent =
                Boolean(accentGlow) && recentProfiles.length === 1;

              return (
                <li
                  key={p.id}
                  className={
                    accentGlow
                      ? singleHomeRecent
                        ? "w-fit max-w-full"
                        : "w-full min-w-0 max-w-lg"
                      : "min-w-0"
                  }
                >
                  <div
                    className={
                      accentGlow
                        ? "flex w-fit max-w-full items-center gap-4"
                        : "flex h-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 p-4 transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-panel)]"
                    }
                  >
                    <div
                      className={`flex min-w-0 items-center gap-4 ${
                        accentGlow ? "" : "flex-1"
                      }`}
                    >
                      <Link
                        href={inventoryHref}
                        className="relative shrink-0"
                        aria-label={`Open inventory for ${p.personaName ?? p.steamId}`}
                      >
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatarUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--border)] text-sm text-[var(--text-muted)]">
                            CS
                          </div>
                        )}
                        {p.faceitFound && p.faceitLevel != null ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/faceit/level-${p.faceitLevel}.png`}
                            alt={`FACEIT ${p.faceitLevel}`}
                            title={`FACEIT ${p.faceitLevel}`}
                            className="absolute -bottom-1 -right-1 h-5 w-5 object-contain"
                            draggable={false}
                          />
                        ) : p.faceitFetchedAt && !p.faceitFound ? (
                          <span
                            className="absolute -bottom-1 -right-1 text-sm"
                            title="No FACEIT"
                            aria-hidden
                          >
                            🤨
                          </span>
                        ) : null}
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <Link
                          href={inventoryHref}
                          className="block truncate font-medium text-[var(--text)] hover:text-[var(--accent)]"
                        >
                          {p.personaName ?? p.steamId}
                        </Link>
                        <ReputationBadges
                          size="sm"
                          nowrap
                          reputation={{
                            steamUrl: steamProfileUrl(p.steamId),
                            faceitUrl: p.faceitUrl,
                            faceitLevel: p.faceitLevel,
                            faceitElo: p.faceitElo,
                            faceitNickname: p.faceitNickname,
                            faceitFound: p.faceitFound,
                            faceitFetchedAt: p.faceitFetchedAt,
                            leetifyUrl: p.leetifyUrl,
                            leetifyName: p.leetifyName,
                            leetifyRating: p.leetifyRating,
                            leetifyFound: p.leetifyFound,
                          }}
                        />
                        <Link
                          href={inventoryHref}
                          className="block truncate text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                        >
                          {p.itemCount} items
                          {buffDisplay ? ` · Buff ${buffDisplay}` : ""}
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
