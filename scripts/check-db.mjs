import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const total = await p.inventoryItem.count();
const withSteam = await p.inventoryItem.count({ where: { steamPrice: { not: null } } });
const withFloat = await p.inventoryItem.count({ where: { floatValue: { not: null } } });
const withStickers = await p.inventoryItem.count({ where: { stickers: { not: null } } });
const withInspect = await p.inventoryItem.count({
  where: { inspectLink: { not: null } },
});
const items = await p.inventoryItem.findMany({
  take: 8,
  orderBy: { updatedAt: "desc" },
});

console.log(
  JSON.stringify(
    {
      total,
      withSteam,
      withFloat,
      withStickers,
      withInspect,
      sample: items.map((i) => ({
        name: i.marketHashName,
        steam: i.steamPrice,
        buff: i.buffPrice,
        float: i.floatValue,
        seed: i.paintSeed,
        stickers: i.stickers?.slice(0, 80) ?? null,
        inspect: Boolean(i.inspectLink),
        type: i.type,
      })),
    },
    null,
    2,
  ),
);

await p.$disconnect();
