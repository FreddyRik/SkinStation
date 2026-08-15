-- CreateTable
CREATE TABLE "KvCache" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KvCache_pkey" PRIMARY KEY ("key")
);
