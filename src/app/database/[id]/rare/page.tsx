import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CatalogContainsGrid } from "@/components/CatalogContainsGrid";
import {
  enrichContainsWithPrices,
  enrichSlimItemsWithPrices,
  getCatalogPayload,
  getItemById,
  inferRareSpecialCategory,
  rareSpecialCategoryLabel,
  uniqueRareItems,
} from "@/lib/cs-catalog";
import { getCsgoTraderSteamCatalog } from "@/lib/steam-market/csgotrader";
import { buildPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const item = await getItemById(decodedId);
  if (!item || item.kind !== "crate" || item.containsRare.length === 0) {
    return buildPageMetadata({
      title: "Rare special items not found",
      description: "This crate has no rare special items listed.",
      path: `/database/${decodedId}/rare`,
    });
  }

  const unique = uniqueRareItems(item.containsRare);
  const category = rareSpecialCategoryLabel(inferRareSpecialCategory(unique));
  const description = `Browse ${unique.length.toLocaleString("en-US")} possible ${category.toLowerCase()} from the ${item.name} on SkinStation.`;

  return buildPageMetadata({
    title: `${item.name} · Rare Special Items`,
    description,
    path: `/database/${encodeURIComponent(item.id)}/rare`,
    image: item.lootList?.image ?? item.image,
  });
}

export default async function CrateRareSpecialsPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const item = await getItemById(id);
  if (!item) notFound();

  if (item.kind !== "crate") {
    redirect(`/database/${encodeURIComponent(id)}`);
  }
  if (item.containsRare.length === 0) notFound();

  const steamUsd = await getCsgoTraderSteamCatalog("USD").catch(
    () => new Map<string, number>(),
  );
  const payload = await getCatalogPayload();
  const priced = enrichSlimItemsWithPrices(payload.items, steamUsd);
  const pricedById = new Map(priced.map((i) => [i.id, i]));
  const containsRare = enrichContainsWithPrices(item.containsRare, pricedById);
  const unique = uniqueRareItems(containsRare);
  const category = inferRareSpecialCategory(unique);
  const categoryLabel = rareSpecialCategoryLabel(category);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href={`/database/${encodeURIComponent(item.id)}`}
          className="type-overline inline-flex items-center gap-2 transition hover:text-[var(--accent)]"
        >
          <span aria-hidden>←</span> {item.name}
        </Link>
        <h1 className="type-page-title">Rare Special Items</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {categoryLabel} in {item.name}
          {" · "}
          {unique.length.toLocaleString("en-US")} possible{" "}
          {categoryLabel.toLowerCase()}
        </p>
      </div>

      <CatalogContainsGrid
        items={containsRare}
        emptyLabel="No rare special items listed."
      />
    </div>
  );
}
