import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const item = await p.inventoryItem.findFirst({
  where: {
    type: { contains: "Rifle" },
    stickers: { not: null },
  },
});
const profile = await p.profile.findFirst({ where: { id: item?.profileId } });
console.log({
  name: item?.marketHashName,
  assetId: item?.assetId,
  steamId: profile?.steamId,
  stickers: item?.stickers?.slice(0, 200),
});

if (item && profile) {
  const links = [
    `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S${profile.steamId}A${item.assetId}D0`,
    `S${profile.steamId}A${item.assetId}D0`,
  ];
  for (const link of links) {
    const url = `https://api.csgofloat.com/?url=${encodeURIComponent(link)}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      console.log(link.slice(0, 60), res.status, (await res.text()).slice(0, 180));
    } catch (e) {
      console.log("err", e.message);
    }
  }
}

// Count sticker JSON that looks like applied stickers on weapons
const all = await p.inventoryItem.findMany({
  where: { stickers: { not: null } },
  select: { marketHashName: true, type: true, stickers: true, floatValue: true },
});
const weaponsWithStickers = all.filter(
  (i) => !i.marketHashName.startsWith("Sticker |") && !i.marketHashName.startsWith("Patch |"),
);
console.log("sticker-field items", all.length, "weapon-like", weaponsWithStickers.length);
console.log(
  "sample weapon stickers",
  weaponsWithStickers.slice(0, 3).map((i) => ({
    name: i.marketHashName,
    stickers: i.stickers?.slice(0, 180),
  })),
);

await p.$disconnect();
