import { ProfileLookup } from "@/components/ProfileLookup";
import { buildPageMetadata, sitePageTitle } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: sitePageTitle("CS2 Inventory Search"),
  description:
    "Search a public Steam CS2 inventory — floats, Buff163 and Steam Market prices, and shareable inventory cards.",
  path: "/inventory",
});

export default function InventoryLookupPage() {
  // Recent profiles are device-local (localStorage) — never a global DB directory.
  return <ProfileLookup recentProfiles={[]} />;
}
