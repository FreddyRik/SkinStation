-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "personaName" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "faceitId" TEXT,
    "faceitNickname" TEXT,
    "faceitUrl" TEXT,
    "faceitLevel" INTEGER,
    "faceitElo" INTEGER,
    "faceitFound" BOOLEAN NOT NULL DEFAULT false,
    "faceitFetchedAt" TIMESTAMP(3),
    "leetifyId" TEXT,
    "leetifyName" TEXT,
    "leetifyUrl" TEXT,
    "leetifyRating" DOUBLE PRECISION,
    "leetifyFound" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "syncing" BOOLEAN NOT NULL DEFAULT false,
    "syncLockToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "instanceId" TEXT,
    "marketHashName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "exterior" TEXT,
    "floatValue" DOUBLE PRECISION,
    "paintSeed" INTEGER,
    "paintIndex" INTEGER,
    "stickers" TEXT,
    "inspectLink" TEXT,
    "steamPrice" DOUBLE PRECISION,
    "buffPrice" DOUBLE PRECISION,
    "tradable" BOOLEAN NOT NULL DEFAULT true,
    "marketable" BOOLEAN NOT NULL DEFAULT true,
    "rarity" TEXT,
    "type" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL,
    "marketHashName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "steamPrice" DOUBLE PRECISION,
    "buffPrice" DOUBLE PRECISION,
    "steamFetchedAt" TIMESTAMP(3),
    "buffFetchedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemCount" INTEGER NOT NULL,
    "totalSteam" DOUBLE PRECISION NOT NULL,
    "totalBuff" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogMeta" (
    "id" TEXT NOT NULL DEFAULT 'csgotrader-steam',
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogMeta_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "PriceCache_currency_idx" ON "PriceCache"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_marketHashName_currency_key" ON "PriceCache"("marketHashName", "currency");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_profileId_createdAt_idx" ON "PortfolioSnapshot"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_profileId_currency_createdAt_idx" ON "PortfolioSnapshot"("profileId", "currency", "createdAt");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
