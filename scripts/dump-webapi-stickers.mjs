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
const res = await fetch(
  `https://www.steamwebapi.com/steam/api/inventory?key=${encodeURIComponent(key)}&steam_id=${profile.steamId}&game=cs2`,
);
const data = await res.json();
const withStickers = data.filter((x) => x.float?.stickers?.length);
console.log("with stickers", withStickers.length);
if (withStickers[0]) {
  console.log(withStickers[0].markethashname);
  console.log(JSON.stringify(withStickers[0].float.stickers, null, 2));
  console.log("inspect", withStickers[0].inspect?.slice(0, 100));
}
await p.$disconnect();
