import { Suspense } from "react";
import { ItemDatabaseBrowser } from "@/components/ItemDatabaseBrowser";
import { sitePageTitle } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: sitePageTitle("Skin Database"),
  description:
    "Browse the live Counter-Strike 2 item catalog — skins, cases, keys, stickers, and more.",
};

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
