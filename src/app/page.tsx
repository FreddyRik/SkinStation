import { HomeHub } from "@/components/HomeHub";
import { getHomeShowcase } from "@/lib/home-showcase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CS2 Inventory Tracker",
  description:
    "Track CS2 inventories, browse the skin catalog, and calculate trade-up contracts — local Steam + Buff pricing.",
};

export default async function HomePage() {
  const showcase = await getHomeShowcase();
  return <HomeHub showcase={showcase} />;
}
