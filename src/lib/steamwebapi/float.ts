/**
 * Optional Steamwebapi float enrichment.
 * Free API key from https://www.steamwebapi.com — set STEAMWEBAPI_KEY in .env
 *
 * Steam's public inventory often returns broken %propid% inspect links, so
 * floats cannot be decoded locally. This client looks up float/pattern by
 * steamId + assetId when a key is configured.
 */

import { isSteamwebapiLimitResponse } from "@/lib/steamwebapi/errors";

export type SteamwebapiFloat = {
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
};

export type SteamwebapiFloatEnrichResult = {
  floats: Map<string, SteamwebapiFloat>;
  /** True when the API rejected further requests due to plan/rate limits. */
  limitHit: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSteamwebapiKey(): string | null {
  const key = process.env.STEAMWEBAPI_KEY?.trim();
  return key || null;
}

type FloatFetchOutcome =
  | { ok: true; value: SteamwebapiFloat | null }
  | { ok: false; limitHit: true };

async function fetchFloatForAsset(
  key: string,
  steamId: string,
  assetId: string,
): Promise<FloatFetchOutcome> {
  const attempts = [
    new URLSearchParams({
      key,
      steam_id: steamId,
      asset_id: assetId,
    }),
    new URLSearchParams({
      key,
      steamid: steamId,
      assetid: assetId,
    }),
    new URLSearchParams({
      key,
      url: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S${steamId}A${assetId}D0`,
    }),
  ];

  for (const params of attempts) {
    try {
      const res = await fetch(
        `https://www.steamwebapi.com/steam/api/float?${params}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "InventoryTracker/1.0",
          },
          next: { revalidate: 0 },
          signal: AbortSignal.timeout(12_000),
        },
      );
      const body = await res.text();
      if (isSteamwebapiLimitResponse(res.status, body)) {
        return { ok: false, limitHit: true };
      }
      if (!res.ok) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(body) as Record<string, unknown>;
      } catch {
        continue;
      }

      const errText = String(data.error ?? data.message ?? "");
      if (errText && isSteamwebapiLimitResponse(200, errText)) {
        return { ok: false, limitHit: true };
      }

      const floatValue =
        typeof data.floatvalue === "number"
          ? data.floatvalue
          : typeof data.float === "number"
            ? data.float
            : typeof data.paintwear === "number"
              ? data.paintwear
              : null;
      const paintSeed =
        typeof data.paintseed === "number"
          ? data.paintseed
          : typeof data.paintSeed === "number"
            ? data.paintSeed
            : null;
      const paintIndex =
        typeof data.paintindex === "number"
          ? data.paintindex
          : typeof data.paintIndex === "number"
            ? data.paintIndex
            : null;

      if (floatValue != null || paintSeed != null) {
        return { ok: true, value: { floatValue, paintSeed, paintIndex } };
      }
    } catch {
      // try next param shape
    }
  }

  return { ok: true, value: null };
}

/** Enrich weapon assets with float/pattern via Steamwebapi (optional key). */
export async function enrichFloatsViaSteamwebapi(
  steamId: string,
  assets: Array<{ assetId: string; marketHashName: string; type: string | null }>,
  options?: { maxFetches?: number; delayMs?: number },
): Promise<SteamwebapiFloatEnrichResult> {
  const key = getSteamwebapiKey();
  const floats = new Map<string, SteamwebapiFloat>();
  if (!key) return { floats, limitHit: false };

  const maxFetches = options?.maxFetches ?? 80;
  const delayMs = options?.delayMs ?? 250;

  const targets = assets.filter((a) => {
    const name = a.marketHashName;
    if (name.startsWith("Sticker |")) return false;
    if (name.startsWith("Patch |")) return false;
    if (name.startsWith("Sealed Graffiti")) return false;
    const type = (a.type ?? "").toLowerCase();
    return (
      type.includes("rifle") ||
      type.includes("pistol") ||
      type.includes("smg") ||
      type.includes("shotgun") ||
      type.includes("sniper") ||
      type.includes("machinegun") ||
      type.includes("knife") ||
      type.includes("gloves") ||
      name.includes("|") // weapon skins usually Weapon | Skin
    );
  });

  let fetched = 0;
  let limitHit = false;
  for (const target of targets) {
    if (fetched >= maxFetches) break;
    const outcome = await fetchFloatForAsset(key, steamId, target.assetId);
    fetched += 1;
    if (!outcome.ok) {
      limitHit = true;
      break;
    }
    if (outcome.value) floats.set(target.assetId, outcome.value);
    await sleep(delayMs);
  }

  return { floats, limitHit };
}
