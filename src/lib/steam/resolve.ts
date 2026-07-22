export type ParsedSteamInput = {
  kind: "steamid64" | "vanity" | "profile_url";
  value: string;
};

const STEAM_ID64_RE = /^7656119\d{10}$/;

/** Parse SteamID64, vanity name, or profile URL. */
export function parseSteamInput(raw: string): ParsedSteamInput {
  const input = raw.trim();
  if (!input) {
    throw new Error("Enter a Steam profile URL or SteamID64.");
  }

  if (STEAM_ID64_RE.test(input)) {
    return { kind: "steamid64", value: input };
  }

  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (!url.hostname.includes("steamcommunity.com")) {
      throw new Error("URL must be a steamcommunity.com profile.");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "profiles" && parts[1] && STEAM_ID64_RE.test(parts[1])) {
      return { kind: "steamid64", value: parts[1] };
    }
    if (parts[0] === "id" && parts[1]) {
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
  const res = await fetch(
    `https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InventoryTracker/1.0; +local)",
      },
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to resolve vanity URL (HTTP ${res.status}).`);
  }

  const xml = await res.text();
  const match = xml.match(/<steamID64>(\d+)<\/steamID64>/);
  if (!match?.[1]) {
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
    const res = await fetch(`${profileUrl}/?xml=1`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InventoryTracker/1.0; +local)",
      },
      next: { revalidate: 0 },
    });
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
