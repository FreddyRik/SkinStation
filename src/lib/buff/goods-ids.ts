import { prisma } from "@/lib/db";
import { SITE_USER_AGENT } from "@/lib/site";

const GOODS_ID_URL =
  "https://raw.githubusercontent.com/ModestSerhat/cs2-marketplace-ids/main/cs2_marketplaceids.json";
const META_ID = "buff163-goods-ids";
/** ID maps change slowly; keep warm for a day. */
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

type MarketplaceIdsFile = {
  items?: Record<
    string,
    {
      buff163_goods_id?: number | null;
    }
  >;
};

type GoodsIdCache = {
  fetchedAt: number;
  byName: Map<string, number>;
};

let memoryCatalog: GoodsIdCache | null = null;
let inflight: Promise<Map<string, number>> | null = null;

function parseGoodsIdMap(data: MarketplaceIdsFile): Map<string, number> {
  const byName = new Map<string, number>();
  const items = data.items ?? {};
  for (const [name, row] of Object.entries(items)) {
    const id = row?.buff163_goods_id;
    if (typeof id === "number" && Number.isFinite(id) && id > 0) {
      byName.set(name, id);
    }
  }
  return byName;
}

async function fetchGoodsIdMap(): Promise<Map<string, number>> {
  const res = await fetch(GOODS_ID_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": SITE_USER_AGENT,
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Buff goods id map failed (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as MarketplaceIdsFile;
  const byName = parseGoodsIdMap(data);

  memoryCatalog = { fetchedAt: Date.now(), byName };

  await prisma.catalogMeta.upsert({
    where: { id: META_ID },
    create: {
      id: META_ID,
      fetchedAt: new Date(),
      itemCount: byName.size,
    },
    update: {
      fetchedAt: new Date(),
      itemCount: byName.size,
    },
  });

  return byName;
}

/** Cached market_hash_name → Buff163 goods_id map. */
export async function getBuffGoodsIdMap(
  force = false,
): Promise<Map<string, number>> {
  if (
    !force &&
    memoryCatalog &&
    Date.now() - memoryCatalog.fetchedAt < CATALOG_TTL_MS
  ) {
    return memoryCatalog.byName;
  }

  if (!force) {
    const meta = await prisma.catalogMeta.findUnique({ where: { id: META_ID } });
    if (
      meta &&
      Date.now() - meta.fetchedAt.getTime() < CATALOG_TTL_MS &&
      memoryCatalog
    ) {
      return memoryCatalog.byName;
    }
  }

  if (!force && inflight) {
    return inflight;
  }

  const promise = fetchGoodsIdMap()
    .catch((err) => {
      if (memoryCatalog) return memoryCatalog.byName;
      throw err;
    })
    .finally(() => {
      if (inflight === promise) inflight = null;
    });

  inflight = promise;
  return promise;
}

export function buffGoodsIdFor(
  catalog: Map<string, number>,
  marketHashName: string,
): number | null {
  return catalog.get(marketHashName) ?? null;
}
