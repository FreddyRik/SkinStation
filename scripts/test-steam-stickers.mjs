import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const profile = await p.profile.findFirst();
if (!profile) {
  console.log("no profile");
  process.exit(0);
}

const steamId = profile.steamId;
const inv = await fetch(
  `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=100`,
  {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
    },
  },
);
console.log("inv status", inv.status);
const data = await inv.json();
const descs = data.descriptions || [];
const withStickers = descs.filter((d) =>
  (d.descriptions || []).some(
    (x) =>
      (x.value || "").includes("sticker_info") ||
      (x.value || "").toLowerCase().includes("sticker"),
  ),
);
console.log("descs", descs.length, "with sticker mentions", withStickers.length);
if (withStickers[0]) {
  const vals = withStickers[0].descriptions.filter(
    (x) =>
      (x.value || "").toLowerCase().includes("sticker") ||
      (x.value || "").includes("sticker_info"),
  );
  console.log(
    withStickers[0].market_hash_name,
    JSON.stringify(vals, null, 2).slice(0, 2000),
  );
}

const sample = descs.find((d) => d.actions?.length);
console.log("sample action", sample?.market_hash_name, sample?.actions?.[0]?.link);

await p.$disconnect();
