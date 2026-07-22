"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { ReputationBadges } from "@/components/ReputationBadges";
import type { Currency } from "@/lib/currency";
import {
  DEFAULT_CURRENCY,
  readStoredCurrency,
  writeStoredCurrency,
} from "@/lib/currency";
import { formatMoney } from "@/lib/format";

type ProfileSummary = {
  id: string;
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  currency: Currency;
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
  itemCount: number;
  lastSyncedAt: string | null;
  latestSnapshot: {
    currency: Currency;
    totalSteam: number;
    totalSkinport: number;
  } | null;
};

function steamProfileUrl(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}`;
}

export function ProfileLookup({
  recentProfiles,
}: {
  recentProfiles: ProfileSummary[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  useEffect(() => {
    setCurrency(readStoredCurrency());
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSyncNote(null);
    setLoading(true);
    writeStoredCurrency(currency);

    try {
      const createRes = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error ?? "Failed to resolve profile");
      }

      const profileId = createData.profile.id as string;
      setSyncNote(
        `Syncing inventory from Steam in ${currency}… this can take a minute.`,
      );

      const syncRes = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, currency }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) {
        // Open inventory so the user can retry; surface error via profile.lastError.
        router.push(`/inventory/${profileId}`);
        router.refresh();
        return;
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/80 p-6 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(94,234,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent-dim)]">
              Public Steam inventory
            </p>
            <CurrencyToggle
              value={currency}
              onChange={setCurrency}
              disabled={loading}
            />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
            Track your CS2 skins and market value
          </h1>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Paste a Steam profile URL or SteamID64. We pull your public CS2
            inventory, enrich floats via CSFloat, and price items on Steam Market
            and Skinport in USD or EUR.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://steamcommunity.com/id/yourname or SteamID64"
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none ring-[var(--accent)] placeholder:text-[var(--text-muted)] focus:ring-2"
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#042f2e] transition hover:bg-[var(--accent-dim)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load inventory"}
            </button>
          </form>

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
        </div>
      </section>

      {recentProfiles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-[var(--text)]">Recent profiles</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recentProfiles.map((p) => {
              const snapshotCurrency =
                p.latestSnapshot?.currency ?? p.currency;
              const inventoryHref = `/inventory/${p.id}`;

              return (
                <li key={p.id}>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 p-4 transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-panel)]">
                    <div className="flex items-center gap-4">
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

                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={inventoryHref}
                          className="block truncate font-medium text-[var(--text)] hover:text-[var(--accent)]"
                        >
                          {p.personaName ?? p.steamId}
                        </Link>
                        <ReputationBadges
                          size="sm"
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
                          {p.latestSnapshot
                            ? ` · Skinport ${formatMoney(p.latestSnapshot.totalSkinport, snapshotCurrency)}`
                            : ""}
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
