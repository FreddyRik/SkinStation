/**
 * CS2 inspect link helpers.
 *
 * Steam's public inventory JSON often returns unresolved `%propid:N%`
 * placeholders. Those cannot be decoded locally. Classic `S…A…D…` links can
 * still be sent to a Game-Coordinator inspect service (self-hosted CSGOFloat
 * compatible). Masked/hex and hybrid `S…A…D<hex>` links decode locally with
 * `@vlydev/cs2-masked-inspect` (primary) / `@csfloat/cs2-inspect-serializer`.
 */

import { isSteamAssetId, isSteamId64 } from "@/lib/steam/steamid";

const CLASSIC_PREVIEW_PREFIX =
  "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

const INSPECT_SCHEME_RE =
  /^steam:\/\/(?:rungame\/730\/\d+\/|run\/730\/\/)\+csgo_econ_action_preview(?:%20|\+| )/i;

/** Build a classic inventory inspect link (D=0 when the real D is unknown). */
export function buildClassicInspectLink(
  steamId: string,
  assetId: string,
  dParam = "0",
): string {
  const did = /^\d{1,20}$/.test(dParam) ? dParam : "0";
  return `${CLASSIC_PREVIEW_PREFIX}S${steamId}A${assetId}D${did}`;
}

export function extractInspectPayload(inspectLink: string): string | null {
  const match = inspectLink.match(
    /csgo_econ_action_preview(?:%20|\+| )([^\s&]+)/i,
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isPropIdInspectLink(inspectLink: string | null): boolean {
  if (!inspectLink) return false;
  return /%propid:\d+%/i.test(inspectLink);
}

export function isClassicInspectPayload(payload: string): boolean {
  const cleaned = payload.replace(/\s/g, "");
  return /^[SM]\d+A\d+D\d+$/i.test(cleaned);
}

/**
 * Hybrid: classic `S/A/D` prefix with a hex protobuf after D (not a decimal did).
 * Offline-decodable — same protobuf blob as a pure masked link.
 */
export function isHybridInspectPayload(payload: string): boolean {
  const cleaned = payload.replace(/\s/g, "");
  const match = cleaned.match(/^[SM]\d+A\d+D([0-9A-Fa-f]+)$/i);
  if (!match?.[1]) return false;
  const dPart = match[1];
  // Hex letters ⇒ protobuf payload (classic D is decimal-only).
  return /[A-Fa-f]/.test(dPart) && dPart.length >= 10;
}

/** Pure hex/protobuf payload (no S/A/D prefix). */
export function isMaskedInspectPayload(payload: string): boolean {
  const cleaned = payload.replace(/\s/g, "");
  if (isClassicInspectPayload(cleaned) || isHybridInspectPayload(cleaned)) {
    return false;
  }
  if (/%propid:\d+%/i.test(cleaned)) return false;
  const hex = cleaned.replace(/%20/g, "").replace(/^%/, "");
  return /^[0-9A-Fa-f]{20,}$/.test(hex);
}

/** Link contains a protobuf payload that local decode can read (masked or hybrid). */
export function isLocallyDecodableInspectLink(
  inspectLink: string | null,
): boolean {
  if (!inspectLink || isPropIdInspectLink(inspectLink)) return false;
  const payload = extractInspectPayload(inspectLink);
  if (!payload) {
    // Bare hex certificate strings (no steam:// wrapper).
    return isMaskedInspectPayload(inspectLink);
  }
  return isMaskedInspectPayload(payload) || isHybridInspectPayload(payload);
}

/**
 * Strict CS2 inspect URI: steam://rungame/730/... or steam://run/730//...
 * plus a classic / hybrid / masked payload. Rejects javascript: and http URLs.
 */
export function isWellFormedInspectLink(inspectLink: string): boolean {
  const trimmed = inspectLink.trim();
  if (!trimmed || trimmed.length > 4096) return false;
  if (/%propid:\d+%/i.test(trimmed)) return false;
  if (!INSPECT_SCHEME_RE.test(trimmed)) return false;
  return isRemoteInspectableLink(trimmed) || isLocallyDecodableInspectLink(trimmed);
}

export function isRemoteInspectableLink(inspectLink: string | null): boolean {
  if (!inspectLink || isPropIdInspectLink(inspectLink)) return false;
  const payload = extractInspectPayload(inspectLink);
  if (!payload) return false;
  return (
    isMaskedInspectPayload(payload) ||
    isHybridInspectPayload(payload) ||
    isClassicInspectPayload(payload)
  );
}

/**
 * Prefer a real inspect link; if Steam only gave `%propid`, synthesize a
 * classic `S{steamId}A{assetId}D0` link for remote providers.
 */
export function resolveInspectLinkForEnrichment(options: {
  steamId: string;
  assetId: string;
  inspectLink: string | null;
}): string | null {
  const { steamId, assetId, inspectLink } = options;
  if (!isSteamId64(steamId) || !isSteamAssetId(assetId)) {
    return inspectLink && isWellFormedInspectLink(inspectLink) ? inspectLink : null;
  }
  if (inspectLink && isRemoteInspectableLink(inspectLink)) {
    return inspectLink;
  }
  if (inspectLink && isLocallyDecodableInspectLink(inspectLink)) {
    return inspectLink;
  }
  // Broken / missing → classic link for remote GC inspect.
  if (steamId && assetId) {
    return buildClassicInspectLink(steamId, assetId);
  }
  return null;
}
