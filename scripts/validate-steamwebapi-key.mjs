import { readFileSync } from "fs";

const raw = readFileSync(".env", "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("STEAMWEBAPI_KEY="));
const key = line.slice("STEAMWEBAPI_KEY=".length).trim().replace(/^["']|["']$/g, "");

console.log({
  length: key.length,
  hasWhitespace: /\s/.test(key),
  looksHex: /^[a-f0-9]+$/i.test(key),
  looksUuid: /^[0-9a-f-]{36}$/i.test(key),
  prefix: key.slice(0, 4),
  suffix: key.slice(-4),
});

// Validate with a lightweight endpoint
const tests = [
  {
    name: "query-key-info-steamid",
    url: `https://www.steamwebapi.com/steam/api/info/steamid?key=${encodeURIComponent(key)}&steam_id=76561198053675227`,
    headers: {},
  },
  {
    name: "header-x-api-key",
    url: `https://www.steamwebapi.com/steam/api/info/steamid?steam_id=76561198053675227`,
    headers: { "X-API-Key": key },
  },
  {
    name: "header-authorization-bearer",
    url: `https://www.steamwebapi.com/steam/api/info/steamid?steam_id=76561198053675227`,
    headers: { Authorization: `Bearer ${key}` },
  },
];

for (const t of tests) {
  const res = await fetch(t.url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "InventoryTracker/1.0",
      ...t.headers,
    },
  });
  console.log(t.name, res.status, (await res.text()).slice(0, 220));
}
