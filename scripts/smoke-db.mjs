/**
 * Smoke-check Postgres connectivity + schema for Supabase / local Postgres.
 * Requires DATABASE_URL pointing at a migrated Postgres DB. Does not call Steam.
 *
 * Usage: npm run smoke:db
 */

import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("smoke:db failed — DATABASE_URL is not set");
  process.exit(1);
}
if (url.startsWith("file:")) {
  console.error(
    "smoke:db failed — DATABASE_URL still points at SQLite (file:). Use Supabase Postgres URLs from .env.example.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const SMOKE_STEAM_ID = "76561198000000000";

async function main() {
  await prisma.$queryRaw`SELECT 1 AS ok`;

  await prisma.profile.deleteMany({ where: { steamId: SMOKE_STEAM_ID } });

  const created = await prisma.profile.create({
    data: {
      steamId: SMOKE_STEAM_ID,
      personaName: "smoke-db",
      currency: "USD",
    },
  });

  const found = await prisma.profile.findUnique({
    where: { id: created.id },
  });
  if (!found || found.steamId !== SMOKE_STEAM_ID) {
    throw new Error("profile create/read mismatch");
  }

  await prisma.inventoryItem.create({
    data: {
      profileId: created.id,
      assetId: "smoke-asset-1",
      classId: "smoke-class-1",
      marketHashName: "Smoke Test Item",
      name: "Smoke Test Item",
      steamPrice: 1.23,
      buffPrice: 1.1,
    },
  });

  const itemCount = await prisma.inventoryItem.count({
    where: { profileId: created.id },
  });
  if (itemCount !== 1) {
    throw new Error(`expected 1 inventory item, got ${itemCount}`);
  }

  await prisma.profile.delete({ where: { id: created.id } });
  const leftover = await prisma.inventoryItem.count({
    where: { profileId: created.id },
  });
  if (leftover !== 0) {
    throw new Error("cascade delete did not remove inventory items");
  }

  const profiles = await prisma.profile.count();
  const items = await prisma.inventoryItem.count();
  const caches = await prisma.priceCache.count();
  const snapshots = await prisma.portfolioSnapshot.count();
  const catalogMeta = await prisma.catalogMeta.count();

  console.log("smoke:db ok — Postgres connect + profile/item CRUD + cascade");
  console.log(
    JSON.stringify(
      { profiles, items, priceCache: caches, snapshots, catalogMeta },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error("smoke:db failed");
    console.error(err instanceof Error ? err.message : err);
    console.error(
      "\nSet DATABASE_URL + DIRECT_URL to your Supabase project, then run:\n  npm run db:deploy\n  npm run smoke:db\n",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
