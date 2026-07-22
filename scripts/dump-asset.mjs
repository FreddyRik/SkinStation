import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const profile = await p.profile.findFirst();
const steamId = profile.steamId;

const inv = await fetch(
  `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=30`,
  {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
    },
  },
);
const data = await inv.json();
const asset = data.assets[0];
const desc = data.descriptions.find(
  (d) => d.classid === asset.classid && d.instanceid === asset.instanceid,
);

console.log("asset keys", Object.keys(asset));
console.log("asset", asset);
console.log("desc keys", Object.keys(desc));
console.log(
  JSON.stringify(
    {
      market_hash_name: desc.market_hash_name,
      actions: desc.actions,
      market_actions: desc.market_actions,
      owner_descriptions: desc.owner_descriptions,
      fraudwarnings: desc.fraudwarnings,
      descriptions: desc.descriptions?.slice(0, 6),
    },
    null,
    2,
  ).slice(0, 3000),
);

// Try trade inventory endpoint style
const tradeUrl = `https://steamcommunity.com/profiles/${steamId}/inventory/json/730/2`;
const inv2 = await fetch(tradeUrl, {
  headers: {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  },
});
console.log("old json status", inv2.status);
const t = await inv2.text();
console.log("old json start", t.slice(0, 200));

await p.$disconnect();
