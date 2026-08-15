/** Soft float-provider warnings (sync still succeeded). */

import { isSteamwebapiLimitMessage } from "@/lib/steamwebapi/errors";
import {
  INSPECT_API_LIMIT_MESSAGE,
  INSPECT_API_MISSING_MESSAGE,
} from "@/lib/inspect/remote";

export function isFloatProviderSoftWarning(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  // Raw Steamwebapi quota strings are noisy — we emit a clearer soft warning instead.
  if (isSteamwebapiLimitMessage(message)) return false;
  const t = message.toLowerCase();
  return (
    t.includes("inspect api") ||
    t.includes("no remote float provider") ||
    t.includes("still have no float") ||
    t.includes("no float after sync") ||
    t.includes("float provider quota") ||
    t.includes("float enrichment returned no items") ||
    t.includes("may be incomplete") ||
    t.includes("certificate floats") ||
    message.startsWith(INSPECT_API_LIMIT_MESSAGE.slice(0, 20)) ||
    message.startsWith(INSPECT_API_MISSING_MESSAGE.slice(0, 20))
  );
}

export function floatUnavailableHint(
  floatProviderWarning: string | null | undefined,
): string {
  if (!floatProviderWarning || isSteamwebapiLimitMessage(floatProviderWarning)) {
    return "Float/pattern not available for this item yet.";
  }
  const t = floatProviderWarning.toLowerCase();
  if (t.includes("inspect api")) {
    return "Float unavailable — inspect API rate-limited or unavailable. Try Force again shortly.";
  }
  if (
    t.includes("no remote float provider") ||
    t.includes("certificate floats") ||
    t.includes("float enrichment returned no items") ||
    t.includes("may be incomplete")
  ) {
    return "Float unavailable — Steam no longer returns certificate floats on public inventory for every item.";
  }
  if (t.includes("float provider quota") || t.includes("still have no float")) {
    return "Float unavailable after sync — try Force again later.";
  }
  return "Float/pattern not available for this item yet.";
}
