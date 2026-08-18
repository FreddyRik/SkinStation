import type { Page } from "@playwright/test";

export async function mockJson(
  page: Page,
  urlGlob: string,
  body: unknown,
  status = 200,
): Promise<void> {
  await page.route(urlGlob, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

export async function mockFx(page: Page): Promise<void> {
  await mockJson(page, "**/api/fx", { usdToEur: 0.92, eurToUsd: 1.087 });
}

export const TEST_PROFILE = {
  id: "prof-1",
  steamId: "76561198000000000",
  personaName: "Tester",
  avatarUrl: null,
  profileUrl: "https://steamcommunity.com/profiles/76561198000000000",
  currency: "USD",
  faceitUrl: null,
  faceitLevel: null,
  faceitElo: null,
  faceitNickname: null,
  faceitFound: false,
  faceitFetchedAt: null,
  leetifyUrl: null,
  leetifyName: null,
  leetifyRating: null,
  leetifyFound: false,
  lastSyncedAt: null,
  syncing: false,
  itemCount: 2,
};

export function slimCatalogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "skin-ak-redline",
    name: "AK-47 | Redline",
    image: null,
    kind: "skin",
    rarity: { id: "rarity_legendary_weapon", name: "Classified", color: "#d32ce6" },
    marketHashName: "AK-47 | Redline",
    weaponCategory: "Rifles",
    weaponCategoryId: "sfui_invpanel_filter_rifles",
    weaponName: "AK-47",
    patternName: "Redline",
    isKnife: false,
    isGlove: false,
    crateType: null,
    crateIds: [],
    firstSaleDate: null,
    tournamentName: null,
    stickerType: null,
    stattrak: true,
    souvenir: false,
    sourceName: "The Phoenix Collection",
    sourceImage: null,
    sourceId: "collection-phoenix",
    sourceKind: "collection",
    collectionCount: 1,
    minFloat: 0.06,
    maxFloat: 0.8,
    wearNames: ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"],
    phase: null,
    priceMinUsd: 12.5,
    priceMaxUsd: 40,
    stattrakPriceMinUsd: 20,
    stattrakPriceMaxUsd: 80,
    ...overrides,
  };
}

export function emptyTradeUpCatalog() {
  return {
    skins: [],
    collections: [],
    crates: [],
    prices: {},
    goodsIds: {},
    currency: "USD",
  };
}
