const fs = require("fs");
const data = JSON.parse(fs.readFileSync("f:/cursor/Projects/InventoryTracker/cs2_marketplaceids.json", "utf8"));
console.log("topKeys:", Object.keys(data));
console.log("itemCount:", Object.keys(data.items).length);
const keys = Object.keys(data.items);
const redline = keys.filter((k) => k.includes("AK-47 | Redline"));
console.log("redlineKeys:", JSON.stringify(redline, null, 2));
for (const k of redline) {
  console.log(JSON.stringify({ [k]: data.items[k] }, null, 2));
}
console.log("sampleFields:", Object.keys(data.items[keys[0]]));
