-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "steamId" TEXT NOT NULL,
    "personaName" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "syncing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryItem" (
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
    "skinportPrice" REAL,
    "tradable" BOOLEAN NOT NULL DEFAULT true,
    "rarity" TEXT,
    "type" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketHashName" TEXT NOT NULL,
    "steamPrice" REAL,
    "skinportMin" REAL,
    "skinportSuggested" REAL,
    "steamFetchedAt" DATETIME,
    "skinportFetchedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "totalSteam" REAL NOT NULL,
    "totalSkinport" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogMeta" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'skinport',
    "fetchedAt" DATETIME NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_steamId_key" ON "Profile"("steamId");

-- CreateIndex
CREATE INDEX "InventoryItem_profileId_idx" ON "InventoryItem"("profileId");

-- CreateIndex
CREATE INDEX "InventoryItem_marketHashName_idx" ON "InventoryItem"("marketHashName");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_profileId_assetId_key" ON "InventoryItem"("profileId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_marketHashName_key" ON "PriceCache"("marketHashName");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_profileId_createdAt_idx" ON "PortfolioSnapshot"("profileId", "createdAt");
