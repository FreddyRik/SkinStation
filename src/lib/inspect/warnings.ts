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
  // Steamwebapi is optional last-resort — never treat its quota as a UI warning.
  if (isSteamwebapiLimitMessage(message)) return false;
  const t = message.toLowerCase();
  return (
    t.includes("inspect api") ||
    t.includes("no remote float provider") ||
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
  if (floatProviderWarning.toLowerCase().includes("inspect api")) {
    return "Float unavailable — inspect API rate-limited or unavailable. Try again shortly.";
  }
  if (floatProviderWarning.toLowerCase().includes("no remote float provider")) {
    return "Float unavailable — set INSPECT_API_URL to a self-hosted CSGOFloat-compatible inspect service. Masked inspect links still decode locally.";
  }
  return "Float/pattern not available for this item yet.";
}
