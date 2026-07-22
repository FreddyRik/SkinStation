import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

function loadEnvKey() {
  const raw = readFileSync(".env", "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith("STEAMWEBAPI_KEY="));
  if (!line) return null;
  return line.slice("STEAMWEBAPI_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

const key = loadEnvKey();
if (!key) {
  console.log("NO_KEY");
  process.exit(1);
}
console.log("KEY_LEN", key.length);

const p = new PrismaClient();
const item = await p.inventoryItem.findFirst({
  where: {
    OR: [
      { type: { contains: "Rifle" } },
      { type: { contains: "Pistol" } },
      { marketHashName: { contains: "AK-47" } },
    ],
  },
});
const profile = await p.profile.findFirst({
  where: item ? { id: item.profileId } : undefined,
});

console.log({
  name: item?.marketHashName,
  assetId: item?.assetId,
  steamId: profile?.steamId,
});

if (!item || !profile) {
  await p.$disconnect();
  process.exit(1);
}

const attempts = [
  { steam_id: profile.steamId, asset_id: item.assetId },
  { steamid: profile.steamId, assetid: item.assetId },
  {
    url: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S${profile.steamId}A${item.assetId}D0`,
  },
  { s: profile.steamId, a: item.assetId, d: "0" },
];

for (const extra of attempts) {
  const params = new URLSearchParams({ key, ...extra });
  const url = `https://www.steamwebapi.com/steam/api/float?${params}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "InventoryTracker/1.0" },
  });
  const text = await res.text();
  console.log("---", Object.keys(extra).join(","), "status", res.status);
  console.log(text.slice(0, 500));
}

await p.$disconnect();
