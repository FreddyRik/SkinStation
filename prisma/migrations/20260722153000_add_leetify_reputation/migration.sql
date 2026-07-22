-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "faceitFound" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "leetifyId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "leetifyName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "leetifyUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "leetifyRating" REAL;
ALTER TABLE "Profile" ADD COLUMN "leetifyFound" BOOLEAN NOT NULL DEFAULT false;
