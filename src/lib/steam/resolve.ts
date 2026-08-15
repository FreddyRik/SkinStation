import {
  fetchSteamProfileXml,
  fetchSteamVanityXml,
} from "@/lib/steam/steam-proxy";
import { isSteamId64 } from "@/lib/steam/steamid";

export type ParsedSteamInput = {
  kind: "steamid64" | "vanity" | "profile_url";
  value: string;
};

/** Parse SteamID64, vanity name, or profile URL. */
export function parseSteamInput(raw: string): ParsedSteamInput {
  const input = raw.trim();
  if (!input) {
    throw new Error("Enter a Steam profile URL or SteamID64.");
  }

  if (isSteamId64(input)) {
    return { kind: "steamid64", value: input };
  }
  if (/^\d{17}$/.test(input)) {
    throw new Error("Could not parse Steam profile URL or SteamID64.");
  }

  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const host = url.hostname.toLowerCase();
    if (
      host !== "steamcommunity.com" &&
      !host.endsWith(".steamcommunity.com")
    ) {
      throw new Error("URL must be a steamcommunity.com profile.");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "profiles" && parts[1] && isSteamId64(parts[1])) {
      return { kind: "steamid64", value: parts[1] };
    }
    if (
      parts[0] === "id" &&
      parts[1] &&
      /^[a-zA-Z0-9_-]{2,64}$/.test(parts[1])
    ) {
      return { kind: "vanity", value: parts[1] };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("steamcommunity")) {
      throw err;
    }
  }

  // Bare vanity name
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(input)) {
    return { kind: "vanity", value: input };
  }

  throw new Error("Could not parse Steam profile URL or SteamID64.");
}

export async function resolveSteamId64(raw: string): Promise<string> {
  const parsed = parseSteamInput(raw);
  if (parsed.kind === "steamid64") {
    return parsed.value;
  }

  const vanity = parsed.value;
  const res = await fetchSteamVanityXml(vanity);

  if (!res.ok) {
    throw new Error(`Failed to resolve vanity URL (HTTP ${res.status}).`);
  }

  const xml = await res.text();
  const match = xml.match(/<steamID64>(\d+)<\/steamID64>/);
  if (!match?.[1] || !isSteamId64(match[1])) {
    throw new Error(
      `Could not resolve vanity name "${vanity}". Check the profile URL.`,
    );
  }
  return match[1];
}

export type SteamProfileMeta = {
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string;
};

export async function fetchSteamProfileMeta(
  steamId: string,
): Promise<SteamProfileMeta> {
  const profileUrl = `https://steamcommunity.com/profiles/${steamId}`;
  try {
    const res = await fetchSteamProfileXml(steamId);
    if (!res.ok) {
      return { steamId, personaName: null, avatarUrl: null, profileUrl };
    }
    const xml = await res.text();
    const name =
      xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/)?.[1] ??
      xml.match(/<steamID>(.*?)<\/steamID>/)?.[1] ??
      null;
    const avatar =
      xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/)?.[1] ??
      xml.match(/<avatarFull>(.*?)<\/avatarFull>/)?.[1] ??
      null;
    return {
      steamId,
      personaName: name,
      avatarUrl: avatar,
      profileUrl,
    };
  } catch {
    return { steamId, personaName: null, avatarUrl: null, profileUrl };
  }
}
