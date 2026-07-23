import { NextResponse } from "next/server";
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
    return NextResponse.json({
      items,
      collections: payload.collections,
    });
  } catch (err) {
    console.error("CS catalog API failed:", err);
    return NextResponse.json(
      { error: "Failed to load CS item catalog." },
      { status: 502 },
    );
  }
}
