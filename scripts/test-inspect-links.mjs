import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const profile = await p.profile.findFirst();
const steamId = profile.steamId;

const inv = await fetch(
  `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=200`,
  {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
    },
  },
);
const data = await inv.json();

const weapons = (data.descriptions || []).filter((d) => {
  const type = (d.type || "").toLowerCase();
  return (
    type.includes("rifle") ||
    type.includes("pistol") ||
    type.includes("smg") ||
    type.includes("shotgun") ||
    type.includes("sniper") ||
    type.includes("machinegun") ||
    type.includes("knife") ||
    (d.tags || []).some((t) => t.category === "Type" && /Weapon|Knife|Gloves/i.test(t.localized_tag_name || ""))
  );
});

console.log("weapon-like descs", weapons.length);
for (const d of weapons.slice(0, 5)) {
  console.log("---", d.market_hash_name);
  console.log("actions", d.actions);
  console.log("market_actions", d.market_actions);
  const stickerBlocks = (d.descriptions || []).filter(
    (x) =>
      (x.value || "").includes("sticker_info") ||
      (x.value || "").includes('class="sticker"') ||
      ((x.name || "") === "sticker_info"),
  );
  console.log("sticker blocks", stickerBlocks.map((b) => b.value?.slice(0, 300)));
}

// Check how many stored inspect links look broken
const broken = await p.inventoryItem.count({
  where: { inspectLink: { contains: "%propid" } },
});
const totalInspect = await p.inventoryItem.count({
  where: { inspectLink: { not: null } },
});
const encoded = await p.inventoryItem.count({
  where: { inspectLink: { contains: "AABA" } },
});
console.log({ broken, totalInspect, encodedSampleHint: encoded });

const samples = await p.inventoryItem.findMany({
  where: { inspectLink: { not: null } },
  take: 10,
  select: { marketHashName: true, inspectLink: true, type: true },
});
console.log(samples);

await p.$disconnect();
