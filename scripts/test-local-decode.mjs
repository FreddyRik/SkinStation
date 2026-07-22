import { decodeLink } from "@csfloat/cs2-inspect-serializer";

const masked =
  "steam://run/730//+csgo_econ_action_preview%20AABAAAB213A38AAA82A99AAEC8AFA2AABA44E3C2AADABD6C0DE6AF";

const decoded = decodeLink(masked);
const plain = JSON.parse(
  JSON.stringify(decoded, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
);
console.log(plain);
