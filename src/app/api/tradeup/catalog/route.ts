import { parseCurrency } from "@/lib/currency";
import { jsonError, jsonOk, logApiError } from "@/lib/api/errors";
import { buildTradeUpCatalogPayload } from "@/lib/tradeup/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const currency = parseCurrency(url.searchParams.get("currency"), "USD");
    const payload = await buildTradeUpCatalogPayload(currency);
    return jsonOk(payload);
  } catch (err) {
    logApiError("Trade-up catalog API failed:", err);
    return jsonError("Failed to load trade-up catalog.", 502);
  }
}
