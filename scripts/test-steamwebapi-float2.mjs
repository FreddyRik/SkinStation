import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

function loadKey() {
  const raw = readFileSync(".env", "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith("STEAMWEBAPI_KEY="));
  if (!line) return null;
  return line.slice("STEAMWEBAPI_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

const key = loadKey();
if (!key) {
  console.log(JSON.stringify({ ok: false, reason: "missing" }));
  process.exit(1);
}

console.log(
  JSON.stringify({
    length: key.length,
    prefix: key.slice(0, 3),
    looksPlaceholder: key.toLowerCase().startsWith("your"),
  }),
);

const check = await fetch(
  `https://www.steamwebapi.com/steam/api/info/steamid?key=${encodeURIComponent(key)}&steam_id=76561198053675227`,
  { headers: { Accept: "application/json", "User-Agent": "InventoryTracker/1.0" } },
);
const checkText = await check.text();
console.log("auth", check.status, checkText.slice(0, 180));

if (check.status === 401) {
  process.exit(2);
}

const p = new PrismaClient();
const item = await p.inventoryItem.findFirst({
  where: {
    OR: [{ type: { contains: "Rifle" } }, { marketHashName: { contains: "AK-47" } }],
  },
});
const profile = await p.profile.findFirst({
  where: item ? { id: item.profileId } : undefined,
});
console.log({
  profileId: profile?.id,
  name: item?.marketHashName,
  assetId: item?.assetId,
});

if (item && profile) {
  const params = new URLSearchParams({
    key,
    url: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S${profile.steamId}A${item.assetId}D0`,
  });
  const res = await fetch(`https://www.steamwebapi.com/steam/api/float?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "InventoryTracker/1.0" },
  });
  const text = await res.text();
  console.log("float_url", res.status, text.slice(0, 400));

  const params2 = new URLSearchParams({
    key,
    steam_id: profile.steamId,
    asset_id: item.assetId,
  });
  const res2 = await fetch(`https://www.steamwebapi.com/steam/api/float?${params2}`, {
    headers: { Accept: "application/json", "User-Agent": "InventoryTracker/1.0" },
  });
  console.log("float_asset", res2.status, (await res2.text()).slice(0, 400));
}

await p.$disconnect();
