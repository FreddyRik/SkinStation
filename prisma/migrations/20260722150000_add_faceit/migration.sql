-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "faceitId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "faceitNickname" TEXT;
ALTER TABLE "Profile" ADD COLUMN "faceitUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "faceitLevel" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "faceitElo" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "faceitFetchedAt" DATETIME;
