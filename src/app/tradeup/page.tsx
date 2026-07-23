import { Suspense } from "react";
import { TradeUpCalculator } from "@/components/tradeup/TradeUpCalculator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trade-up Calculator · CS2 Inventory Tracker",
  description:
    "Calculate CS2 trade-up odds, floats, and expected value from your inventory or a custom sandbox — including 5-Covert knife and glove contracts.",
};

export default function TradeUpPage() {
  return (
    <Suspense
      fallback={
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
          Loading trade-up calculator…
        </p>
      }
    >
      <TradeUpCalculator />
    </Suspense>
  );
}
