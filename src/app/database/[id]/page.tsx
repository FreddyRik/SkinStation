import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BuyFromOffers } from "@/components/BuyFromOffers";
import {
  CatalogContainsGrid,
  CatalogNamedRefList,
} from "@/components/CatalogContainsGrid";
import { JsonLd } from "@/components/JsonLd";
import { SkinDetailView } from "@/components/SkinDetailView";
import {
  CATALOG_KIND_LABELS,
  buildCatalogBuyOffers,
  buildSkinDetailPrices,
  enrichContainsWithPrices,
  enrichSlimItemsWithPrices,
  findPhaseSiblings,
  getCatalogPayload,
  getCollectionById,
  getItemById,
} from "@/lib/cs-catalog";
import {
  buffGoodsIdFor,
  getBuffGoodsIdMap,
} from "@/lib/buff/goods-ids";
import {
  getCsgoTraderBuffCatalog,
  getCsgoTraderSteamCatalog,
} from "@/lib/steam-market/csgotrader";
import { formatSaleDate } from "@/lib/format";
import { catalogProductJsonLd } from "@/lib/json-ld";
import { buildPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const item = await getItemById(decodedId);
  if (!item) {
    return buildPageMetadata({
      title: "Item not found",
      description: "This catalog item could not be found.",
      path: `/database/${decodedId}`,
    });
  }

  const title = `${item.name}${item.phase ? ` · ${item.phase}` : ""} · Skin Database`;
  const description =
    item.description?.slice(0, 160) ||
    `${item.name} in the Counter-Strike 2 skin database on SkinStation.`;

  return buildPageMetadata({
    title,
    description,
    path: `/database/${encodeURIComponent(item.id)}`,
    image: item.image,
  });
}

async function loadPriceMaps() {
  const [steamUsd, buffUsd, goodsMap] = await Promise.all([
    getCsgoTraderSteamCatalog("USD").catch(() => new Map<string, number>()),
    getCsgoTraderBuffCatalog("USD").catch(() => new Map<string, number>()),
    getBuffGoodsIdMap().catch(() => new Map<string, number>()),
  ]);
  return { steamUsd, buffUsd, goodsMap };
}

async function pricedContainsById(steamUsd: Map<string, number>) {
  const payload = await getCatalogPayload();
  const priced = enrichSlimItemsWithPrices(payload.items, steamUsd);
  return new Map(priced.map((i) => [i.id, i]));
}

export default async function CatalogItemPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const item = await getItemById(id);
  if (!item) notFound();

  if (item.kind === "collection") {
    redirect(`/collections/${encodeURIComponent(id)}`);
  }

  const { steamUsd, buffUsd, goodsMap } = await loadPriceMaps();

  if (item.kind === "skin") {
    const prices = buildSkinDetailPrices(item, steamUsd, buffUsd);
    const buffGoodsByHash: Record<string, number> = {};
    for (const variant of [prices.normal, prices.stattrak, prices.souvenir]) {
      for (const row of variant) {
        const gid = buffGoodsIdFor(goodsMap, row.marketHashName);
        if (gid != null) buffGoodsByHash[row.marketHashName] = gid;
      }
    }
    const collections = await Promise.all(
      item.collections.map(async (c) => {
        const full = await getCollectionById(c.id);
        return {
          id: c.id,
          name: c.name,
          image: c.image ?? full?.image ?? null,
          itemCount: full?.contains.length ?? 0,
        };
      }),
    );

    const payload = await getCatalogPayload();
    const phaseSiblings = findPhaseSiblings(payload.items, item);

    return (
      <>
        <JsonLd
          data={catalogProductJsonLd({
            name: item.name,
            description: item.description,
            image: item.image,
            marketHashName: item.marketHashName,
            path: `/database/${encodeURIComponent(item.id)}`,
          })}
        />
        <SkinDetailView
          item={item}
          prices={prices}
          collections={collections}
          buffGoodsByHash={buffGoodsByHash}
          phaseSiblings={phaseSiblings}
        />
      </>
    );
  }

  const offers = buildCatalogBuyOffers(item, steamUsd, buffUsd, goodsMap);
  const pricedById =
    item.contains.length > 0 || item.containsRare.length > 0
      ? await pricedContainsById(steamUsd)
      : null;
  const contains = pricedById
    ? enrichContainsWithPrices(item.contains, pricedById)
    : item.contains;
  const containsRare = pricedById
    ? enrichContainsWithPrices(item.containsRare, pricedById)
    : item.containsRare;

  return (
    <>
      <JsonLd
        data={catalogProductJsonLd({
          name: item.name,
          description: item.description,
          image: item.image,
          marketHashName: item.marketHashName,
          path: `/database/${encodeURIComponent(item.id)}`,
        })}
      />
      <GenericCatalogItemView
        item={item}
        offers={offers}
        contains={contains}
        containsRare={containsRare}
      />
    </>
  );
}

function GenericCatalogItemView({
  item,
  offers,
  contains,
  containsRare,
}: {
  item: NonNullable<Awaited<ReturnType<typeof getItemById>>>;
  offers: ReturnType<typeof buildCatalogBuyOffers>;
  contains: Parameters<typeof CatalogContainsGrid>[0]["items"];
  containsRare: Parameters<typeof CatalogContainsGrid>[0]["items"];
}) {
  const metaBits = [
    CATALOG_KIND_LABELS[item.kind],
    item.weaponCategory,
    item.crateType,
  ].filter(Boolean);

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
          {item.name}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {metaBits.join(" · ")}
          {item.rarity ? (
            <>
              {" · "}
              <span style={{ color: item.rarity.color }}>{item.rarity.name}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/70 p-6">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className="max-h-64 w-full object-contain"
            />
          ) : (
            <span className="text-sm text-[var(--text-muted)]">No image</span>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/70 p-5 sm:p-6">
          {item.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
              {item.description.replace(/\\n/g, "\n").replace(/<\/?i>/g, "")}
            </p>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2">
            {item.marketHashName ? (
              <DetailField label="Market name" value={item.marketHashName} />
            ) : null}
            {item.crateType ? (
              <DetailField label="Type" value={item.crateType} />
            ) : null}
            {item.firstSaleDate ? (
              <DetailField
                label="Released"
                value={formatSaleDate(item.firstSaleDate)}
              />
            ) : null}
            {item.effect ? (
              <DetailField label="Effect" value={item.effect} />
            ) : null}
            {item.tournamentName ? (
              <DetailField label="Tournament" value={item.tournamentName} />
            ) : null}
          </dl>

          {item.collections.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                Collections
              </h2>
              <CatalogNamedRefList
                items={item.collections}
                hrefFor={(cid) => `/collections/${encodeURIComponent(cid)}`}
              />
            </div>
          ) : null}

          {item.crates.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Crates</h2>
              <CatalogNamedRefList
                items={item.crates}
                hrefFor={(cid) => `/database/${encodeURIComponent(cid)}`}
              />
            </div>
          ) : null}
        </div>
      </div>

      <BuyFromOffers steam={offers.steam} buff={offers.buff} />

      {contains.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">Contains</h2>
          <CatalogContainsGrid items={contains} />
        </section>
      ) : null}

      {containsRare.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Rare specials
          </h2>
          <CatalogContainsGrid items={containsRare} />
        </section>
      ) : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--text)]">{value}</dd>
    </div>
  );
}
