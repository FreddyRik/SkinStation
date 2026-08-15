"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { ReputationBadges } from "@/components/ReputationBadges";
import { DEFAULT_CURRENCY, parseCurrency, writeStoredCurrency } from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { useUsdToEurRate } from "@/hooks/useUsdToEurRate";
import {
  jsonBooleanField,
  jsonErrorMessage,
  jsonNumberField,
  jsonRecord,
  jsonStringField,
  readResponseJson,
} from "@/lib/api/client";
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
  const currency = useDisplayCurrency();
  const usdToEur = useUsdToEurRate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [recentProfiles, setRecentProfiles] =
    useState<ProfileSummary[]>(seedProfiles);

  useEffect(() => {
    setRecentProfiles(readRecentProfiles());
  }, []);

  const onSubmit = useCallback(async (e: FormEvent) => {
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
      const createData = await readResponseJson(createRes);
      const createProfile = jsonRecord(jsonRecord(createData)?.profile);
      if (!createRes.ok || !createProfile) {
        const createError = jsonErrorMessage(
          createData,
          "Failed to resolve profile",
        );
        if (
          createRes.status === 429 ||
          looksLikeSteamRateLimitMessage(createError)
        ) {
          markSteamBackoff();
        }
        throw new Error(createError);
      }

      const remembered = entryFromApiProfile(createProfile);
      const profileId = remembered?.id ?? jsonStringField(createProfile, "id");
      if (!profileId) {
        throw new Error("Failed to resolve profile");
      }
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
      const syncData = await readResponseJson(syncRes);
      const syncError = jsonErrorMessage(syncData, "Failed to sync inventory");
      const syncWarning = jsonStringField(syncData, "warning");
      const usedCached = jsonBooleanField(syncData, "usedCachedInventory");
      const itemCount = jsonNumberField(syncData, "itemCount");

      if (
        syncRes.status === 429 ||
        looksLikeSteamRateLimitMessage(syncError) ||
        looksLikeSteamRateLimitMessage(syncWarning) ||
        usedCached
      ) {
        markSteamBackoff();
      }

      if (remembered && itemCount != null) {
        setRecentProfiles(
          rememberRecentProfile({
            ...remembered,
            itemCount,
            lastSyncedAt: new Date().toISOString(),
          }),
        );
      }

      if (!syncRes.ok) {
        // Prefer opening inventory when Steam fails — cached items may still be there.
        if (
          syncRes.status === 429 ||
          looksLikeSteamRateLimitMessage(syncError)
        ) {
          setSyncNote(
            "Steam rate-limited this sync. Opening inventory — cached items will show if we have any.",
          );
        }
        router.push(`/inventory/${profileId}`);
        router.refresh();
        return;
      }

      if (usedCached || syncWarning) {
        setSyncNote(
          syncWarning ?? "Opened cached inventory (Steam was unavailable).",
        );
      }

      router.push(`/inventory/${profileId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [currency, input, router]);

  const commandBar = (
    <form
      onSubmit={onSubmit}
      className={
        accentGlow
          ? "mx-auto mt-8 flex w-full max-w-3xl items-stretch overflow-hidden rounded-full bg-[#131A2A] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all duration-[400ms] ease-in-out focus-within:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8),0_0_0_1px_#C87941,0_0_36px_rgba(200,121,65,0.38)]"
          : "et-command mx-auto mt-6 max-w-xl"
      }
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="https://steamcommunity.com/id/yourname or SteamID64"
        className={
          accentGlow
            ? "min-w-0 flex-1 bg-transparent px-6 py-4 text-left text-white outline-none placeholder:text-[#8B95A5] sm:px-8 sm:py-5 sm:text-lg"
            : "et-command-input text-left"
        }
        disabled={loading}
        required
      />
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className={
          accentGlow
            ? "m-1.5 shrink-0 rounded-full bg-[#C87941] px-5 py-3 font-semibold text-[#0A0F1D] transition-all duration-[400ms] ease-in-out hover:bg-[#e09a62] disabled:cursor-not-allowed disabled:opacity-50 sm:m-2 sm:px-7 sm:text-base"
            : "et-command-submit"
        }
      >
        {loading ? "Loading…" : "Load inventory"}
      </button>
    </form>
  );

  const lookupNotes = (
    <>
      {syncNote && (
        <p className="text-sm text-[var(--steam)]">{syncNote}</p>
      )}
      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}
      <p className="text-xs text-[var(--text-muted)]">
        Inventory must be set to Public on Steam. First sync may take longer
        while floats and prices are fetched.
      </p>
    </>
  );

  return (
    <div className={accentGlow ? "" : "space-y-8"}>
      {accentGlow ? (
        <section className="flex min-h-[100dvh] flex-col items-center justify-center px-4 pb-16 pt-28 text-center sm:px-6 sm:pt-32">
          <div className="relative mx-auto w-full max-w-4xl space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#C87941]">
              Public Steam inventory
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl lg:leading-[1.05]">
              Your one-stop for CS2 skins
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#8B95A5] sm:text-lg">
              Track your inventory, browse the skin catalog, and run trade-up
              odds. Paste a Steam profile URL or SteamID64 to get started.
            </p>
            {commandBar}
            {lookupNotes}
          </div>
        </section>
      ) : (
      <section className="et-card relative overflow-hidden p-6 sm:p-10">
        {atmosphere}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,121,65,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,121,65,0.05) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent-dim)]">
            Public Steam inventory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
            Your one-stop for CS2 skins
          </h1>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Track your inventory, browse the skin catalog, and run trade-up
            odds. Paste a Steam profile URL or SteamID64 to get started.
          </p>
          {commandBar}
          {lookupNotes}
        </div>
      </section>
      )}

      {recentProfiles.length > 0 && (
        <section className={`mx-auto max-w-3xl space-y-4 ${accentGlow ? "px-4 pb-12 sm:px-6" : ""}`}>
          <h2 className="text-center text-lg font-medium text-[var(--text)]">
            Recent on this device
          </h2>
          <ul className="grid items-stretch gap-3 sm:grid-cols-2">
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

              return (
                <li key={p.id} className="min-w-0">
                  <div className="et-card et-card-hover flex h-full p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
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
                          className="block truncate font-data text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
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
