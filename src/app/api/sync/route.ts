import { NextRequest } from "next/server";
import { parseCurrency } from "@/lib/currency";
import {
  isForceSyncAuthorized,
  jsonError,
  jsonOk,
  logApiError,
  readJsonBody,
  sanitizeSyncClientError,
} from "@/lib/api/errors";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";
import {
  ensureProfileFromInput,
  getSyncCooldownMs,
  syncInventory,
} from "@/lib/sync/inventory-sync";
import { prisma } from "@/lib/db";
import { parseSyncRequestBody } from "@/types/api";

export const maxDuration = 300;

const PROFILE_SYNC_LIMIT = {
  limit: 6,
  windowMs: 60 * 60 * 1000,
  name: "sync-profile",
};

export async function POST(req: NextRequest) {
  try {
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return parsed.response;

    const body = parseSyncRequestBody(parsed.value);
    if (!body) {
      return jsonError("Invalid request body.", 400);
    }

    let profileId = body.profileId;
    const currency = body.currency ? parseCurrency(body.currency) : undefined;
    const wantsForce = Boolean(body.force);
    const force = isForceSyncAuthorized(req, wantsForce);

    if (wantsForce && !force) {
      return jsonError("Force sync is not authorized.", 403);
    }

    if (!profileId && body.input) {
      const profile = await ensureProfileFromInput(body.input);
      profileId = profile.id;
    }

    if (!profileId) {
      return jsonError("profileId or input is required.", 400);
    }

    const exists = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!exists) {
      return jsonError("Profile not found.", 404);
    }

    const ip = clientIpFromRequest(req);
    const profileLimit = await rateLimit(
      `sync:profile:${profileId}:${ip}`,
      PROFILE_SYNC_LIMIT,
    );
    if (!profileLimit.ok && !force) {
      return jsonError(
        "Too many syncs for this profile. Please wait and try again.",
        429,
        { retryAfterSec: profileLimit.retryAfterSec },
      );
    }

    const result = await syncInventory(profileId, {
      force,
      currency,
    });

    return jsonOk({
      ...result,
      cooldownMs: getSyncCooldownMs(),
    });
  } catch (err) {
    logApiError("Sync failed:", err);
    const { status, error } = sanitizeSyncClientError(err);
    return jsonError(error, status);
  }
}
