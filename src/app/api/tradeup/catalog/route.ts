import { NextResponse } from "next/server";
import { jsonError, jsonErrorWithRetryAfter } from "@/lib/api/errors";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";
import { parseCurrency } from "@/lib/currency";
import { buildTradeUpCatalogPayload } from "@/lib/tradeup/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limited = await rateLimit(`tradeup:${ip}`, {
      limit: 30,
      windowMs: 60_000,
      name: "tradeup",
    });
    if (!limited.ok) {
      return jsonErrorWithRetryAfter(
        "Too many requests. Please wait and try again.",
        limited.retryAfterSec,
      );
    }
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
