import { decodeLink } from "@csfloat/cs2-inspect-serializer";

const masked =
  "steam://run/730//+csgo_econ_action_preview%20AABAAAB213A38AAA82A99AAEC8AFA2AABA44E3C2AADABD6C0DE6AF";

try {
  const decoded = decodeLink(masked);
  console.log("local decode masked", JSON.stringify(decoded, null, 2).slice(0, 800));
} catch (e) {
  console.log("local decode failed", e);
}

const classic =
  "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198034202275A1234567890D0";

for (const host of ["https://api.csgofloat.com/", "https://csgofloat.com/api/v1/"]) {
  for (const link of [masked, classic]) {
    const url = `${host}?url=${encodeURIComponent(link)}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 InventoryTracker/1.0",
        },
      });
      const text = await res.text();
      console.log(host, link.slice(0, 40), res.status, text.slice(0, 200));
    } catch (e) {
      console.log(host, "err", e instanceof Error ? e.message : e);
    }
  }
}
