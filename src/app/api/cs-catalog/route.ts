import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import {
  enrichSlimItemsWithPrices,
  getCatalogPayload,
} from "@/lib/cs-catalog";
import { getCsgoTraderSteamCatalog } from "@/lib/steam-market/csgotrader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getCatalogPayload();
    let items = payload.items;
    try {
      const steamUsd = await getCsgoTraderSteamCatalog("USD");
      items = enrichSlimItemsWithPrices(items, steamUsd);
    } catch (err) {
      console.warn("CS catalog price enrich failed:", err);
    }
    return NextResponse.json(
      {
        items,
        collections: payload.collections,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=120",
        },
      },
    );
  } catch (err) {
    console.error("CS catalog API failed:", err);
    return jsonError("Failed to load CS item catalog.", 502);
  }
}
