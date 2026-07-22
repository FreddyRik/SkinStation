export type ReputationLookup = {
  faceit: {
    playerId: string | null;
    nickname: string | null;
    profileUrl: string;
    skillLevel: number | null;
    elo: number | null;
    found: boolean;
  };
  leetify: {
    id: string | null;
    name: string | null;
    profileUrl: string;
    rating: number | null;
    found: boolean;
  };
};

type FaceitGameStats = {
  skill_level?: number | string;
  faceit_elo?: number | string;
};

type FaceitPlayerResponse = {
  player_id?: string;
  nickname?: string;
  faceit_url?: string;
  games?: {
    cs2?: FaceitGameStats;
    csgo?: FaceitGameStats;
  };
};

type LeetifyProfileResponse = {
  id?: string;
  name?: string;
  steam64_id?: string;
  ranks?: {
    leetify?: number | null;
    faceit?: number | null;
    faceit_elo?: number | null;
  };
};

function getFaceitApiKey(): string | null {
  const key = process.env.FACEIT_API_KEY?.trim();
  return key || null;
}

function normalizeFaceitUrl(raw: string | undefined, nickname: string): string {
  if (raw) return raw.replace("{lang}", "en");
  return `https://www.faceit.com/en/players/${encodeURIComponent(nickname)}`;
}

function faceitFinderUrl(steamId64: string): string {
  return `https://faceitfinder.com/profile/${encodeURIComponent(steamId64)}`;
}

function leetifyProfileUrl(leetifyId: string): string {
  return `https://leetify.com/app/profile/${encodeURIComponent(leetifyId)}`;
}

function parseSkillLevel(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return n;
}

function parseElo(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRating(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchOfficialFaceit(
  steamId64: string,
  apiKey: string,
): Promise<ReputationLookup["faceit"] | null> {
  for (const game of ["cs2", "csgo"] as const) {
    try {
      const params = new URLSearchParams({
        game,
        game_player_id: steamId64,
      });
      const res = await fetch(
        `https://open.faceit.com/data/v4/players?${params}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        },
      );

      if (res.status === 404) continue;
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        console.warn(`FACEIT API ${res.status}; using Leetify for Faceit ranks.`);
        return null;
      }
      if (!res.ok) continue;

      const data = (await res.json()) as FaceitPlayerResponse;
      if (!data.player_id || !data.nickname) continue;

      const gameStats = data.games?.[game] ?? data.games?.cs2 ?? data.games?.csgo;
      return {
        playerId: data.player_id,
        nickname: data.nickname,
        profileUrl: normalizeFaceitUrl(data.faceit_url, data.nickname),
        skillLevel: parseSkillLevel(gameStats?.skill_level),
        elo: parseElo(gameStats?.faceit_elo),
        found: true,
      };
    } catch (err) {
      console.warn("FACEIT lookup failed:", err);
      return null;
    }
  }
  return null;
}

async function fetchLeetifyProfile(
  steamId64: string,
): Promise<LeetifyProfileResponse | null> {
  try {
    const params = new URLSearchParams({ steam64_id: steamId64 });
    const res = await fetch(
      `https://api-public.cs-prod.leetify.com/v3/profile?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "InventoryTracker/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`Leetify lookup failed (HTTP ${res.status}).`);
      return null;
    }

    return (await res.json()) as LeetifyProfileResponse;
  } catch (err) {
    console.warn("Leetify lookup failed:", err);
    return null;
  }
}

/**
 * Resolve FACEIT + Leetify reputation for a SteamID64.
 * Leetify is public (no key). Official FACEIT API is used when FACEIT_API_KEY is set;
 * otherwise FACEIT level/ELO come from Leetify ranks when available.
 */
export async function lookupPlayerReputation(
  steamId64: string,
): Promise<ReputationLookup> {
  const empty: ReputationLookup = {
    faceit: {
      playerId: null,
      nickname: null,
      profileUrl: faceitFinderUrl(steamId64),
      skillLevel: null,
      elo: null,
      found: false,
    },
    leetify: {
      id: null,
      name: null,
      profileUrl: `https://leetify.com/app/search?query=${encodeURIComponent(steamId64)}`,
      rating: null,
      found: false,
    },
  };

  const apiKey = getFaceitApiKey();
  const [officialFaceit, leetify] = await Promise.all([
    apiKey
      ? withTimeout(
          fetchOfficialFaceit(steamId64, apiKey),
          10_000,
          "FACEIT lookup",
        ).catch((err) => {
          console.warn(err);
          return null;
        })
      : Promise.resolve(null),
    withTimeout(fetchLeetifyProfile(steamId64), 10_000, "Leetify lookup").catch(
      (err) => {
        console.warn(err);
        return null;
      },
    ),
  ]);

  if (leetify?.id) {
    empty.leetify = {
      id: leetify.id,
      name: leetify.name?.trim() || null,
      profileUrl: leetifyProfileUrl(leetify.id),
      rating: parseRating(leetify.ranks?.leetify),
      found: true,
    };
  }

  if (officialFaceit?.found) {
    empty.faceit = officialFaceit;
  } else if (leetify) {
    const skillLevel = parseSkillLevel(leetify.ranks?.faceit);
    const elo = parseElo(leetify.ranks?.faceit_elo);
    const found = skillLevel != null || elo != null;
    empty.faceit = {
      playerId: null,
      nickname: leetify.name?.trim() || null,
      // Finder always opens a Steam→FACEIT search; nickname URL is unreliable without API.
      profileUrl: faceitFinderUrl(steamId64),
      skillLevel,
      elo,
      found,
    };
  }

  return empty;
}

/** @deprecated Prefer lookupPlayerReputation */
export async function fetchFaceitBySteamId(steamId64: string) {
  const rep = await lookupPlayerReputation(steamId64);
  if (!rep.faceit.found) return null;
  return {
    playerId: rep.faceit.playerId,
    nickname: rep.faceit.nickname,
    profileUrl: rep.faceit.profileUrl,
    skillLevel: rep.faceit.skillLevel,
    elo: rep.faceit.elo,
    game: "cs2" as const,
    source: "leetify" as const,
  };
}
