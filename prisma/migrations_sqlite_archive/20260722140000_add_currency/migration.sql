-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PriceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketHashName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "steamPrice" REAL,
    "skinportMin" REAL,
    "skinportSuggested" REAL,
    "steamFetchedAt" DATETIME,
    "skinportFetchedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_PriceCache" (
    "id",
    "marketHashName",
    "currency",
    "steamPrice",
    "skinportMin",
    "skinportSuggested",
    "steamFetchedAt",
    "skinportFetchedAt",
    "updatedAt",
    "createdAt"
)
SELECT
    "id",
    "marketHashName",
    'USD',
    "steamPrice",
    "skinportMin",
    "skinportSuggested",
    "steamFetchedAt",
    "skinportFetchedAt",
    "updatedAt",
    "createdAt"
FROM "PriceCache";

DROP TABLE "PriceCache";
ALTER TABLE "new_PriceCache" RENAME TO "PriceCache";
CREATE UNIQUE INDEX "PriceCache_marketHashName_currency_key" ON "PriceCache"("marketHashName", "currency");
CREATE INDEX "PriceCache_currency_idx" ON "PriceCache"("currency");

CREATE TABLE "new_PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemCount" INTEGER NOT NULL,
    "totalSteam" REAL NOT NULL,
    "totalSkinport" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_PortfolioSnapshot" (
    "id",
    "profileId",
    "currency",
    "itemCount",
    "totalSteam",
    "totalSkinport",
    "createdAt"
)
SELECT
    "id",
    "profileId",
    'USD',
    "itemCount",
    "totalSteam",
    "totalSkinport",
    "createdAt"
FROM "PortfolioSnapshot";

DROP TABLE "PortfolioSnapshot";
ALTER TABLE "new_PortfolioSnapshot" RENAME TO "PortfolioSnapshot";
CREATE INDEX "PortfolioSnapshot_profileId_createdAt_idx" ON "PortfolioSnapshot"("profileId", "createdAt");
CREATE INDEX "PortfolioSnapshot_profileId_currency_createdAt_idx" ON "PortfolioSnapshot"("profileId", "currency", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
