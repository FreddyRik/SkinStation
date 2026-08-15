import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { parseCurrency } from "@/lib/currency";
import { buildTradeUpCatalogPayload } from "@/lib/tradeup/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const currency = parseCurrency(
      url.searchParams.get("currency"),
      "USD",
    );
    const payload = await buildTradeUpCatalogPayload(currency);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=120",
      },
    });
  } catch (err) {
    console.error("Trade-up catalog API failed:", err);
    return jsonError("Failed to load trade-up catalog.", 502);
  }
}
