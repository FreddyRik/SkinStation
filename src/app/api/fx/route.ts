import { jsonError, jsonOk, logApiError } from "@/lib/api/errors";
import { getUsdToEurRate } from "@/lib/fx";

export const dynamic = "force-dynamic";

/** Public FX helper for client-side currency display conversion. */
export async function GET() {
  try {
    const usdToEur = await getUsdToEurRate();
    return jsonOk({
      usdToEur,
      eurToUsd: Number((1 / usdToEur).toFixed(6)),
    });
  } catch (err) {
    logApiError("FX API failed:", err);
    return jsonError("Failed to load exchange rate.", 502);
  }
}
