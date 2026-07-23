import { NextResponse } from "next/server";
import { parseCurrency, type Currency } from "@/lib/currency";
import { buildTradeUpCatalogPayload } from "@/lib/tradeup/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const currency = parseCurrency(
      url.searchParams.get("currency"),
      "USD",
    ) as Currency;
    const payload = await buildTradeUpCatalogPayload(currency);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("Trade-up catalog API failed:", err);
    return NextResponse.json(
      { error: "Failed to load trade-up catalog." },
      { status: 502 },
    );
  }
}
