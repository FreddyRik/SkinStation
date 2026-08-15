import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  jsonError,
  jsonOk,
  logApiError,
  readJsonBody,
  sanitizeProfileCreateError,
} from "@/lib/api/errors";
import { ensureProfileFromInput } from "@/lib/sync/inventory-sync";
import { RECENT_PROFILES_LIMIT } from "@/lib/recent-profiles";
import { parseCreateProfileRequestBody } from "@/types/api";

/** Max ids accepted for a device-local refresh (anti-enumeration). */
const MAX_IDS = RECENT_PROFILES_LIMIT;

function parseRequestedIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_IDS) break;
  }
  return ids;
}

/**
 * Returns profiles for caller-known ids only (from this device's localStorage).
 * Bare GET without ids returns an empty list — never a global recent directory.
 */
export async function GET(req: NextRequest) {
  try {
    const ids = parseRequestedIds(req.nextUrl.searchParams.get("ids"));
    if (ids.length === 0) {
      return jsonOk({ profiles: [] });
    }

    const profiles = await prisma.profile.findMany({
      where: { id: { in: ids } },
      include: {
        _count: { select: { items: true, snapshots: true } },
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const byId = new Map(profiles.map((p) => [p.id, p]));
    // Preserve caller order (MRU from localStorage).
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((p): p is (typeof profiles)[number] => p != null);

    return jsonOk({
      profiles: ordered.map((p) => ({
        id: p.id,
        steamId: p.steamId,
        personaName: p.personaName,
        avatarUrl: p.avatarUrl,
        profileUrl: p.profileUrl,
        currency: p.currency,
        faceitUrl: p.faceitUrl,
        faceitLevel: p.faceitLevel,
        faceitElo: p.faceitElo,
        faceitNickname: p.faceitNickname,
        faceitFound: p.faceitFound,
        faceitFetchedAt: p.faceitFetchedAt,
        leetifyUrl: p.leetifyUrl,
        leetifyName: p.leetifyName,
        leetifyRating: p.leetifyRating,
        leetifyFound: p.leetifyFound,
        lastSyncedAt: p.lastSyncedAt,
        syncing: p.syncing,
        itemCount: p._count.items,
        latestSnapshot: p.snapshots[0] ?? null,
      })),
    });
  } catch (err) {
    logApiError("Failed to load profiles:", err);
    return jsonError("Failed to load profiles.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return parsed.response;

    const body = parseCreateProfileRequestBody(parsed.value);
    if (!body?.input?.trim()) {
      return jsonError("Steam profile URL or SteamID64 is required.", 400);
    }

    const profile = await ensureProfileFromInput(body.input);
    return jsonOk({ profile });
  } catch (err) {
    logApiError("Failed to create profile:", err);
    const { status, error } = sanitizeProfileCreateError(err);
    return jsonError(error, status);
  }
}
