import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CatalogContainsGrid,
  CatalogNamedRefList,
} from "@/components/CatalogContainsGrid";
import {
  enrichContainsWithPrices,
  enrichSlimItemsWithPrices,
  getCatalogPayload,
  getCollectionById,
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
  const collection = await getCollectionById(decodedId);
  if (!collection) {
    return buildPageMetadata({
      title: "Collection not found",
      description: "This CS2 collection could not be found.",
      path: `/collections/${decodedId}`,
    });
  }

  const itemCount = collection.contains.length;
  const description = `Browse ${itemCount.toLocaleString("en-US")} skin${
    itemCount === 1 ? "" : "s"
  } in the ${collection.name} Counter-Strike 2 collection on SkinStation.`;

  return buildPageMetadata({
    title: `${collection.name} · Skin Database`,
    description,
    path: `/collections/${encodeURIComponent(collection.id)}`,
    image: collection.image,
  });
}

export default async function CollectionPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const collection = await getCollectionById(id);
  if (!collection) notFound();

  const steamUsd = await getCsgoTraderSteamCatalog("USD").catch(
    () => new Map<string, number>(),
  );
  const payload = await getCatalogPayload();
  const priced = enrichSlimItemsWithPrices(payload.items, steamUsd);
  const pricedById = new Map(priced.map((i) => [i.id, i]));
  const contains = enrichContainsWithPrices(collection.contains, pricedById);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/database"
          className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          ← Skin Database
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
          {collection.name}
        </h1>
        <p className="font-data text-sm text-[var(--text-muted)]">
          Collection · {collection.contains.length.toLocaleString("en-US")} item
          {collection.contains.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="et-card flex w-full max-w-xs shrink-0 items-center justify-center p-6 sm:w-48">
          {collection.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.image}
              alt={collection.name}
              className="max-h-40 w-full object-contain"
            />
          ) : (
            <span className="text-sm text-[var(--text-muted)]">No image</span>
          )}
        </div>

        {collection.crates.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">Crates</h2>
            <CatalogNamedRefList
              items={collection.crates}
              hrefFor={(cid) => `/database/${encodeURIComponent(cid)}`}
            />
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">Contains</h2>
        <CatalogContainsGrid
          items={contains}
          emptyLabel="This collection has no listed skins."
        />
      </section>
    </div>
  );
}
