import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { getUsdToEurRate } from "@/lib/fx-live";
import { parseUsdToEurRate } from "@/lib/fx";

export const dynamic = "force-dynamic";

/** Public FX helper for client-side currency display conversion. */
export async function GET() {
  try {
    const usdToEur = parseUsdToEurRate(await getUsdToEurRate());
    if (usdToEur == null) {
      return jsonError("FX rate unavailable.", 502);
    }
    return NextResponse.json(
      {
        usdToEur,
        eurToUsd: Number((1 / usdToEur).toFixed(6)),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      },
    );
  } catch (err) {
    console.error("FX API failed:", err);
    return jsonError("FX rate unavailable.", 502);
  }
}
