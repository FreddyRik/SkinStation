import { HomeHub } from "@/components/HomeHub";
import { JsonLd } from "@/components/JsonLd";
import { getHomeShowcase } from "@/lib/home-showcase";
import { homePageJsonLd } from "@/lib/json-ld";
import { buildPageMetadata, SITE_DESCRIPTION, SITE_HOME_TITLE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: SITE_HOME_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  const showcase = await getHomeShowcase();
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <HomeHub showcase={showcase} />
    </>
  );
}
