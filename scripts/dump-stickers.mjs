import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const items = await p.inventoryItem.findMany({
  where: { stickers: { not: null } },
  take: 20,
});

for (const i of items.filter((x) => !x.marketHashName.startsWith("Sticker |")).slice(0, 6)) {
  console.log("---", i.marketHashName);
  console.log(i.stickers);
}

await p.$disconnect();
