import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const profile = await p.profile.findFirst();
const steamId = profile.steamId;
const inv = await fetch(
  `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=80`,
  {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
    },
  },
);
const data = await inv.json();
const weapons = (data.descriptions || []).filter((d) =>
  /Rifle|Pistol|SMG|Shotgun|Sniper|Knife|Machinegun|Gloves/i.test(d.type || ""),
);

let stickerHtmlSamples = 0;
for (const d of weapons.slice(0, 15)) {
  const blocks = (d.descriptions || []).filter(
    (b) =>
      /sticker/i.test(b.value || "") ||
      /sticker/i.test(b.name || "") ||
      (b.value || "").includes("title="),
  );
  if (!blocks.length) continue;
  stickerHtmlSamples += 1;
  console.log("---", d.market_hash_name);
  console.log("actions", d.actions?.[0]?.link?.slice(0, 80));
  for (const b of blocks.slice(0, 2)) {
    console.log("block name", b.name, "value sample:", (b.value || "").slice(0, 400));
  }
}
console.log("weapons", weapons.length, "with sticker html", stickerHtmlSamples);

const withHex = (data.descriptions || []).filter((d) =>
  (d.actions || []).some((a) => /preview%[20+ ]*[0-9A-Fa-f]{20,}/i.test(a.link || "")),
);
console.log("descs with hex inspect", withHex.length);
if (withHex[0]) {
  console.log("hex sample", withHex[0].market_hash_name, withHex[0].actions?.[0]?.link);
}

await p.$disconnect();
