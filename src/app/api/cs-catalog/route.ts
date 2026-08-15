import {
  enrichSlimItemsWithPrices,
  getCatalogPayload,
} from "@/lib/cs-catalog";
import { jsonError, jsonOk, logApiError } from "@/lib/api/errors";
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
    return jsonOk({
      items,
      collections: payload.collections,
    });
  } catch (err) {
    logApiError("CS catalog API failed:", err);
    return jsonError("Failed to load CS item catalog.", 502);
  }
}
