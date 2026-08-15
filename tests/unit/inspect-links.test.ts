import { describe, expect, it } from "vitest";
import {
  buildClassicInspectLink,
  extractInspectPayload,
  isClassicInspectPayload,
  isHybridInspectPayload,
  isLocallyDecodableInspectLink,
  isMaskedInspectPayload,
  isPropIdInspectLink,
  isWellFormedInspectLink,
} from "@/lib/inspect/links";

describe("inspect links", () => {
  it("builds a classic preview URL", () => {
    const link = buildClassicInspectLink("76561198000000000", "123", "9");
    expect(link).toContain("S76561198000000000A123D9");
  });

  it("extracts the payload from a steam:// preview URL", () => {
    const link =
      "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S1A2D3";
    expect(extractInspectPayload(link)).toBe("S1A2D3");
  });

  it("detects unresolved %propid placeholders", () => {
    expect(isPropIdInspectLink("preview %propid:2%")).toBe(true);
    expect(isPropIdInspectLink(null)).toBe(false);
  });

  it("classifies classic, hybrid, and masked payloads", () => {
    expect(isClassicInspectPayload("S1A2D3")).toBe(true);
    expect(isHybridInspectPayload("S1A2Dabcdef0123456789")).toBe(true);
    expect(isHybridInspectPayload("S1A2D12345")).toBe(false);
    expect(isMaskedInspectPayload("aabbccddeeff001122334455")).toBe(true);
    expect(isMaskedInspectPayload("S1A2D3")).toBe(false);
  });

  it("only treats masked/hybrid links as locally decodable", () => {
    const masked =
      "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20aabbccddeeff001122334455";
    expect(isLocallyDecodableInspectLink(masked)).toBe(true);
    expect(isLocallyDecodableInspectLink("preview %propid:1%")).toBe(false);
    expect(isLocallyDecodableInspectLink(null)).toBe(false);
  });

  it("accepts only steam:// CS2 inspect URIs", () => {
    const ok =
      "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A123D0";
    expect(isWellFormedInspectLink(ok)).toBe(true);
    expect(isWellFormedInspectLink("https://evil.example/inspect")).toBe(false);
    expect(isWellFormedInspectLink("javascript:alert(1)")).toBe(false);
  });
});
