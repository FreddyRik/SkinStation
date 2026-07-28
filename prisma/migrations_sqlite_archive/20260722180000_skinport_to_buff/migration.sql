-- Replace Skinport price columns with Buff163 equivalents.

-- InventoryItem: skinportPrice → buffPrice
CREATE TABLE "InventoryItem_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "instanceId" TEXT,
    "marketHashName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "exterior" TEXT,
    "floatValue" REAL,
    "paintSeed" INTEGER,
    "paintIndex" INTEGER,
    "stickers" TEXT,
    "inspectLink" TEXT,
    "steamPrice" REAL,
    "buffPrice" REAL,
    "tradable" BOOLEAN NOT NULL DEFAULT true,
    "marketable" BOOLEAN NOT NULL DEFAULT true,
    "rarity" TEXT,
    "type" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_new_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "InventoryItem_new" (
  "id", "profileId", "assetId", "classId", "instanceId", "marketHashName", "name",
  "iconUrl", "exterior", "floatValue", "paintSeed", "paintIndex", "stickers",
  "inspectLink", "steamPrice", "buffPrice", "tradable", "marketable", "rarity",
  "type", "updatedAt", "createdAt"
)
SELECT
  "id", "profileId", "assetId", "classId", "instanceId", "marketHashName", "name",
  "iconUrl", "exterior", "floatValue", "paintSeed", "paintIndex", "stickers",
  "inspectLink", "steamPrice", "skinportPrice", "tradable", "marketable", "rarity",
  "type", "updatedAt", "createdAt"
FROM "InventoryItem";

DROP TABLE "InventoryItem";
ALTER TABLE "InventoryItem_new" RENAME TO "InventoryItem";
CREATE UNIQUE INDEX "InventoryItem_profileId_assetId_key" ON "InventoryItem"("profileId", "assetId");
CREATE INDEX "InventoryItem_profileId_idx" ON "InventoryItem"("profileId");
CREATE INDEX "InventoryItem_marketHashName_idx" ON "InventoryItem"("marketHashName");

-- PriceCache: skinport* → buff*
CREATE TABLE "PriceCache_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketHashName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "steamPrice" REAL,
    "buffPrice" REAL,
    "steamFetchedAt" DATETIME,
    "buffFetchedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "PriceCache_new" (
  "id", "marketHashName", "currency", "steamPrice", "buffPrice",
  "steamFetchedAt", "buffFetchedAt", "updatedAt", "createdAt"
)
SELECT
  "id", "marketHashName", "currency", "steamPrice",
  COALESCE("skinportMin", "skinportSuggested"),
  "steamFetchedAt", "skinportFetchedAt", "updatedAt", "createdAt"
FROM "PriceCache";

DROP TABLE "PriceCache";
ALTER TABLE "PriceCache_new" RENAME TO "PriceCache";
CREATE UNIQUE INDEX "PriceCache_marketHashName_currency_key" ON "PriceCache"("marketHashName", "currency");
CREATE INDEX "PriceCache_currency_idx" ON "PriceCache"("currency");

-- PortfolioSnapshot: totalSkinport → totalBuff
CREATE TABLE "PortfolioSnapshot_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemCount" INTEGER NOT NULL,
    "totalSteam" REAL NOT NULL,
    "totalBuff" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_new_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "PortfolioSnapshot_new" (
  "id", "profileId", "currency", "itemCount", "totalSteam", "totalBuff", "createdAt"
)
SELECT
  "id", "profileId", "currency", "itemCount", "totalSteam", "totalSkinport", "createdAt"
FROM "PortfolioSnapshot";

DROP TABLE "PortfolioSnapshot";
ALTER TABLE "PortfolioSnapshot_new" RENAME TO "PortfolioSnapshot";
CREATE INDEX "PortfolioSnapshot_profileId_createdAt_idx" ON "PortfolioSnapshot"("profileId", "createdAt");
CREATE INDEX "PortfolioSnapshot_profileId_currency_createdAt_idx" ON "PortfolioSnapshot"("profileId", "currency", "createdAt");
