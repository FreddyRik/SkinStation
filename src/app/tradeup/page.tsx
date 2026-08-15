import { Suspense } from "react";
import { TradeUpCalculator } from "@/components/tradeup/TradeUpCalculator";
import { buildPageMetadata, sitePageTitle } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: sitePageTitle("CS2 Trade-up Calculator"),
  description:
    "Calculate CS2 trade-up contract odds, output floats, and expected value from your inventory or a custom sandbox — including 5-Covert knife and glove contracts.",
  path: "/tradeup",
});

export default function TradeUpPage() {
  return (
    <Suspense
      fallback={
        <p className="et-slot p-8 text-center text-[var(--text-muted)]">
          Loading trade-up calculator…
        </p>
      }
    >
      <TradeUpCalculator />
    </Suspense>
  );
}
