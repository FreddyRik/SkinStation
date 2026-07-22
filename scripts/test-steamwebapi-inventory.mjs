import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

function loadKey() {
  const raw = readFileSync(".env", "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith("STEAMWEBAPI_KEY="));
  return line.slice("STEAMWEBAPI_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

const key = loadKey();
const p = new PrismaClient();
const profile = await p.profile.findFirst();
const item = await p.inventoryItem.findFirst({
  where: { profileId: profile.id, marketHashName: { contains: "AK-47" } },
});

console.log({ steamId: profile.steamId, assetId: item?.assetId, name: item?.marketHashName });

// 1) Inventory via steamwebapi — may include floats
const invUrl = `https://www.steamwebapi.com/steam/api/inventory?key=${encodeURIComponent(key)}&steam_id=${profile.steamId}&game=cs2`;
const invRes = await fetch(invUrl, {
  headers: { Accept: "application/json", "User-Agent": "InventoryTracker/1.0" },
});
const invText = await invRes.text();
console.log("inventory", invRes.status, invText.slice(0, 800));

// Parse one weapon-like entry if array/object
try {
  const data = JSON.parse(invText);
  const arr = Array.isArray(data) ? data : data.items || data.assets || data.data || [];
  const sample = (Array.isArray(arr) ? arr : []).find(
    (x) =>
      x.floatvalue != null ||
      x.float != null ||
      x.paintseed != null ||
      x.marketname?.includes("AK-47") ||
      x.markethashname?.includes("AK-47") ||
      x.market_hash_name?.includes("AK-47"),
  );
  console.log("sample keys", sample ? Object.keys(sample).slice(0, 40) : null);
  if (sample) {
    console.log({
      name: sample.markethashname || sample.market_hash_name || sample.marketname,
      float: sample.floatvalue ?? sample.float ?? sample.paintwear,
      seed: sample.paintseed ?? sample.paintSeed,
      assetid: sample.assetid || sample.assetId || sample.id,
      inspect: sample.inspectlink || sample.inspect_link || sample.inspect,
    });
  }
} catch (e) {
  console.log("parse fail", e.message);
}

// 2) create-inspectlink
if (item) {
  const res = await fetch(
    `https://www.steamwebapi.com/steam/api/float/create-inspectlink?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "InventoryTracker/1.0",
      },
      body: JSON.stringify({
        steamid: profile.steamId,
        steam_id: profile.steamId,
        assetid: item.assetId,
        asset_id: item.assetId,
        s: profile.steamId,
        a: item.assetId,
      }),
    },
  );
  console.log("create-inspectlink", res.status, (await res.text()).slice(0, 500));
}

await p.$disconnect();
