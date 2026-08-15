import { NextRequest, NextResponse } from "next/server";
import { parseCurrency } from "@/lib/currency";
import {
  isForceSyncAuthorized,
  sanitizeSyncClientError,
} from "@/lib/api/errors";
import { ApiParseError, jsonErrorResponse, parseJsonSchema } from "@/lib/api/parse";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";
import { syncRequestSchema } from "@/lib/api/schemas";
import {
  ensureProfileFromInput,
  getSyncCooldownMs,
  syncInventory,
} from "@/lib/sync/inventory-sync";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const maxDuration = 300;

const PROFILE_SYNC_LIMIT = {
  limit: 6,
  windowMs: 60 * 60 * 1000,
  name: "sync-profile",
};

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonSchema(req, syncRequestSchema);

    let profileId = body.profileId;
    const currency = body.currency ? parseCurrency(body.currency) : undefined;
    const wantsForce = Boolean(body.force);
    const force = isForceSyncAuthorized(req, wantsForce);

    if (wantsForce && !force) {
      return NextResponse.json(
        { error: "Force sync is not authorized." },
        { status: 403 },
      );
    }

    if (!profileId && body.input) {
      const profile = await ensureProfileFromInput(body.input);
      profileId = profile.id;
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId or input is required." },
        { status: 400 },
      );
    }

    const exists = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!exists) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const ip = clientIpFromRequest(req);
    const profileLimit = await rateLimit(
      `sync:profile:${profileId}:${ip}`,
      PROFILE_SYNC_LIMIT,
    );
    if (!profileLimit.ok && !force) {
      const res = NextResponse.json(
        { error: "Too many syncs for this profile. Please wait and try again." },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(profileLimit.retryAfterSec));
      return res;
    }

    const result = await syncInventory(profileId, {
      force,
      currency,
    });

    return NextResponse.json({
      ...result,
      cooldownMs: getSyncCooldownMs(),
    });
  } catch (err) {
    if (err instanceof ApiParseError || err instanceof z.ZodError) {
      const { status, error } = jsonErrorResponse(err);
      return NextResponse.json({ error }, { status });
    }
    console.error("Sync failed:", err);
    const { status, error } = sanitizeSyncClientError(err);
    return NextResponse.json({ error }, { status });
  }
}
