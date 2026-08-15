import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizeProfileCreateError } from "@/lib/api/errors";
import {
  ApiParseError,
  jsonErrorResponse,
  parseJsonSchema,
} from "@/lib/api/parse";
import {
  profileCreateRequestSchema,
  profileIdsQuerySchema,
} from "@/lib/api/schemas";
import { ensureProfileFromInput } from "@/lib/sync/inventory-sync";
import { z } from "zod";

/**
 * Returns profiles for caller-known ids only (from this device's localStorage).
 * Bare GET without ids returns an empty list — never a global recent directory.
 */
export async function GET(req: NextRequest) {
  try {
    const rawIds = req.nextUrl.searchParams.get("ids");
    const parsed = rawIds
      ? profileIdsQuerySchema.safeParse(rawIds)
      : { success: true as const, data: [] as string[] };
    const ids = parsed.success ? parsed.data : [];
    if (ids.length === 0) {
      return NextResponse.json({ profiles: [] });
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

    return NextResponse.json({
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
    console.error("Failed to load profiles:", err);
    return NextResponse.json(
      { error: "Failed to load profiles." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonSchema(req, profileCreateRequestSchema);
    const profile = await ensureProfileFromInput(body.input);
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof ApiParseError || err instanceof z.ZodError) {
      const { status, error } = jsonErrorResponse(err);
      return NextResponse.json({ error }, { status });
    }
    console.error("Failed to create profile:", err);
    const { status, error } = sanitizeProfileCreateError(err);
    return NextResponse.json({ error }, { status });
  }
}
