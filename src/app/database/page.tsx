import { Suspense } from "react";
import { ItemDatabaseBrowser } from "@/components/ItemDatabaseBrowser";
import { buildPageMetadata, sitePageTitle } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: sitePageTitle("CS2 Skin Database"),
  description:
    "Browse the live Counter-Strike 2 skin catalog — weapons, cases, keys, stickers, agents, and more with market prices.",
  path: "/database",
});

export default function DatabasePage() {
  return (
    <Suspense
      fallback={
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
          Loading catalog…
        </p>
      }
    >
      <ItemDatabaseBrowser />
    </Suspense>
  );
}
