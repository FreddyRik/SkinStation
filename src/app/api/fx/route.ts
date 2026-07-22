import { NextResponse } from "next/server";
import { getUsdToEurRate } from "@/lib/fx";

export const dynamic = "force-dynamic";

/** Public FX helper for client-side currency display conversion. */
export async function GET() {
  const usdToEur = await getUsdToEurRate();
  return NextResponse.json({
    usdToEur,
    // Inverse for convenience
    eurToUsd: Number((1 / usdToEur).toFixed(6)),
  });
}
