import { NextRequest, NextResponse } from "next/server";
import { parseCurrency } from "@/lib/currency";
import {
  ensureProfileFromInput,
  getSyncCooldownMs,
  syncInventory,
} from "@/lib/sync/inventory-sync";
import { prisma } from "@/lib/db";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      profileId?: string;
      input?: string;
      force?: boolean;
      currency?: string;
    };

    let profileId = body.profileId;
    const currency = body.currency ? parseCurrency(body.currency) : undefined;

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

    const result = await syncInventory(profileId, {
      force: Boolean(body.force),
      currency,
    });

    return NextResponse.json({
      ...result,
      cooldownMs: getSyncCooldownMs(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    const status = message.includes("already in progress") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
