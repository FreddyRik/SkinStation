import { HomeHub } from "@/components/HomeHub";
import { getHomeShowcase } from "@/lib/home-showcase";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default async function HomePage() {
  const showcase = await getHomeShowcase();
  return <HomeHub showcase={showcase} />;
}
