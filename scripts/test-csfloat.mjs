import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const item =
  (await p.inventoryItem.findFirst({
    where: { inspectLink: { not: null }, type: "Rifle" },
  })) ??
  (await p.inventoryItem.findFirst({
    where: { inspectLink: { not: null } },
  }));

console.log("sample", {
  name: item?.marketHashName,
  link: item?.inspectLink,
});

if (item?.inspectLink) {
  const url =
    "https://api.csfloat.com/?url=" +
    encodeURIComponent(item.inspectLink) +
    "&minimal=true";
  console.log("url", url.slice(0, 160));
  const res = await fetch(url, {
    headers: {
      "User-Agent": "InventoryTracker/1.0",
      Accept: "application/json",
    },
  });
  console.log("status", res.status, res.headers.get("content-type"));
  const text = await res.text();
  console.log(text.slice(0, 1200));

  // Also try without minimal
  const url2 =
    "https://api.csfloat.com/?url=" + encodeURIComponent(item.inspectLink);
  const res2 = await fetch(url2, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      Origin: "https://csfloat.com",
      Referer: "https://csfloat.com/",
    },
  });
  console.log("status2", res2.status);
  console.log((await res2.text()).slice(0, 1200));
}

await p.$disconnect();
