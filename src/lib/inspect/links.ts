/**
 * CS2 inspect link helpers.
 *
 * Steam's public inventory JSON often returns unresolved `%propid:N%`
 * placeholders. Those cannot be decoded locally. Classic `S…A…D…` links can
 * still be sent to a Game-Coordinator inspect service (self-hosted CSGOFloat
 * compatible). Masked/hex links decode locally with
 * `@csfloat/cs2-inspect-serializer`.
 */

const CLASSIC_PREVIEW_PREFIX =
  "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

/** Build a classic inventory inspect link (D=0 when the real D is unknown). */
export function buildClassicInspectLink(
  steamId: string,
  assetId: string,
  dParam = "0",
): string {
  return `${CLASSIC_PREVIEW_PREFIX}S${steamId}A${assetId}D${dParam}`;
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

export function isMaskedInspectPayload(payload: string): boolean {
  const cleaned = payload.replace(/\s/g, "");
  if (isClassicInspectPayload(cleaned)) return false;
  if (/%propid:\d+%/i.test(cleaned)) return false;
  const hex = cleaned.replace(/%20/g, "").replace(/^%/, "");
  return /^[0-9A-Fa-f]{20,}$/.test(hex);
}

/** Link contains a hex/protobuf payload that local decode can read. */
export function isLocallyDecodableInspectLink(
  inspectLink: string | null,
): boolean {
  if (!inspectLink || isPropIdInspectLink(inspectLink)) return false;
  const payload = extractInspectPayload(inspectLink);
  return Boolean(payload && isMaskedInspectPayload(payload));
}

/**
 * Link is usable by a remote GC inspect provider (classic S/A/D or masked).
 * PropId placeholders are not.
 */
export function isRemoteInspectableLink(inspectLink: string | null): boolean {
  if (!inspectLink || isPropIdInspectLink(inspectLink)) return false;
  const payload = extractInspectPayload(inspectLink);
  if (!payload) return false;
  return isMaskedInspectPayload(payload) || isClassicInspectPayload(payload);
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
