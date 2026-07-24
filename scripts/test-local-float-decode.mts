import { generateHex } from "@csfloat/cs2-inspect-serializer";
import { InspectLink } from "@vlydev/cs2-masked-inspect";
import {
  isHybridInspectPayload,
  isLocallyDecodableInspectLink,
  isRemoteInspectableLink,
  resolveInspectLinkForEnrichment,
} from "../src/lib/inspect/links.ts";
import { decodeInspectLocally } from "../src/lib/csfloat/inspect.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const hex = generateHex({
  defindex: 7,
  paintindex: 474,
  paintseed: 306,
  paintwear: 0.6336590647697449,
  rarity: 6,
  stickers: [],
  keychains: [],
  variations: [],
});

const pure = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20${hex}`;
const hybrid = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561199323320483A50075495125D${hex}`;
const classic =
  "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561199842063946A49749521570D2751293026650298712";
const nativeE3 =
  "E3F3367440334DE2FBE4C345E0CBE0D3E7DB6943400AE0A379E481ECEBE2F36FD9DE2BDB515EA6E30D74D981ECEBE3F37BCBDE640D475DA6E35EFCD881ECEBE3F359D5DE37E9D75DA6436DD3DD81ECEBE3F366DCDE3F8F9BDDA69B43B6DE81ECEBE3F33BC8DEBB1CA3DFA623F7DDDF8B71E293EBFD43382B";

const pureDecoded = InspectLink.deserialize(pure);
assert(
  Math.abs((pureDecoded.paintWear ?? 0) - 0.6336590647697449) < 1e-9,
  "pure float mismatch",
);
assert(pureDecoded.paintSeed === 306, "pure seed mismatch");

const hybridDecoded = InspectLink.deserialize(hybrid);
assert(
  Math.abs((hybridDecoded.paintWear ?? 0) - 0.6336590647697449) < 1e-9,
  "hybrid float mismatch",
);
assert(InspectLink.isMasked(hybrid) === true, "hybrid should be masked");
assert(InspectLink.isClassic(classic) === true, "classic detection");
assert(InspectLink.isMasked(classic) === false, "classic is not masked");

const native = InspectLink.deserialize(nativeE3);
assert(native.defIndex === 7, "native defIndex");
assert(native.paintIndex === 422, "native paintIndex");
assert(native.paintSeed === 922, "native paintSeed");
assert(
  Math.abs((native.paintWear ?? 0) - 0.041214026510715485) < 1e-9,
  "native float",
);

console.log("ok: vlydev pure/hybrid/native decode");

const hybridPayload = hybrid.match(/preview%20(.+)/i)?.[1];
assert(
  hybridPayload && isHybridInspectPayload(hybridPayload),
  "app hybrid detect",
);
assert(isLocallyDecodableInspectLink(hybrid), "app hybrid local");
assert(isLocallyDecodableInspectLink(pure), "app pure local");
assert(!isLocallyDecodableInspectLink(classic), "classic not local");
assert(isRemoteInspectableLink(classic), "classic remote");
assert(isRemoteInspectableLink(hybrid), "hybrid remote");

assert(
  resolveInspectLinkForEnrichment({
    steamId: "76561199323320483",
    assetId: "50075495125",
    inspectLink: hybrid,
  }) === hybrid,
  "hybrid must be preserved for enrichment",
);

const appHybrid = decodeInspectLocally(hybrid);
assert(appHybrid?.floatValue != null, "app hybrid float");
assert(
  Math.abs(appHybrid.floatValue - 0.6336590647697449) < 1e-9,
  "app hybrid float value",
);
assert(appHybrid.paintSeed === 306, "app hybrid seed");

const appPure = decodeInspectLocally(pure);
assert(appPure?.floatValue != null, "app pure float");

const appNative = decodeInspectLocally(
  `steam://run/730//+csgo_econ_action_preview%20${nativeE3}`,
);
assert(appNative?.paintSeed === 922, "app native seed");
assert(appNative?.floatValue != null, "app native float");
assert(decodeInspectLocally(classic) == null, "classic stays local-null");

console.log("ok: app decodeInspectLocally pure/hybrid/native");
