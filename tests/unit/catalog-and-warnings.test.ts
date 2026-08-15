import { describe, expect, it } from "vitest";
import { resolveRarityColor } from "@/lib/rarity-accent";
import {
  floatUnavailableHint,
  isFloatProviderSoftWarning,
} from "@/lib/inspect/warnings";
import {
  isSteamwebapiLimitMessage,
  isSteamwebapiLimitResponse,
} from "@/lib/steamwebapi/errors";
import { isAllowedImageHost, proxiedImageUrl } from "@/lib/share-card";
import { parseInventoryView } from "@/lib/inventory-view";
import { parsePageTheme } from "@/lib/page-theme";
import { parseShareCardTheme } from "@/lib/share-card-theme";
import {
  faceitLevelColor,
  faceitLevelImageSrc,
} from "@/lib/faceit/levels";
import {
  formatFloatShort,
  finishStyleFromPatternId,
  wearRangeForSkin,
  WEAR_BANDS,
} from "@/lib/cs-catalog/wears";
import {
  formatPhaseShort,
  phaseAccent,
  resolveSkinPhase,
} from "@/lib/cs-catalog/phase";
import {
  effectiveWeaponCategory,
  isGloveSkin,
  isKnifeSkin,
  isZeusWeapon,
} from "@/lib/cs-catalog/flags";

describe("resolveRarityColor", () => {
  it("maps names, substrings, and hex codes", () => {
    expect(resolveRarityColor("Covert")).toBe("#eb4b4b");
    expect(resolveRarityColor("StatTrak Covert Rifle")).toBe("#eb4b4b");
    expect(resolveRarityColor("#abc")).toBe("#abc");
    expect(resolveRarityColor("112233")).toBe("#112233");
    expect(resolveRarityColor("")).toBeNull();
    expect(resolveRarityColor("not-a-rarity")).toBeNull();
  });
});

describe("float provider warnings", () => {
  it("treats inspect / missing-float copy as soft warnings", () => {
    expect(isFloatProviderSoftWarning("Inspect API rate-limited")).toBe(true);
    expect(isFloatProviderSoftWarning("no float after sync")).toBe(true);
    expect(
      isFloatProviderSoftWarning(
        "Steamwebapi request limit reached — float/pattern data may be incomplete.",
      ),
    ).toBe(false);
    expect(isFloatProviderSoftWarning(null)).toBe(false);
  });

  it("returns a specific hint for inspect vs generic missing floats", () => {
    expect(floatUnavailableHint("Inspect API down")).toMatch(/inspect API/i);
    expect(floatUnavailableHint(null)).toMatch(/not available/);
  });
});

describe("steamwebapi limits", () => {
  it("detects 429/402 and quota copy", () => {
    expect(isSteamwebapiLimitResponse(429, "")).toBe(true);
    expect(isSteamwebapiLimitResponse(200, "monthly limit exceeded")).toBe(true);
    expect(isSteamwebapiLimitResponse(200, "ok")).toBe(false);
    expect(isSteamwebapiLimitMessage("Steamwebapi request limit reached")).toBe(
      true,
    );
  });
});

describe("image proxy allowlist", () => {
  it("allows Steam CDN hosts and rejects others", () => {
    expect(isAllowedImageHost("community.cloudflare.steamstatic.com")).toBe(
      true,
    );
    expect(isAllowedImageHost("steamcdn-a.akamaihd.net")).toBe(true);
    expect(isAllowedImageHost("evil.example")).toBe(false);
  });

  it("rewrites allowed URLs through the image proxy", () => {
    const proxied = proxiedImageUrl(
      "https://community.cloudflare.steamstatic.com/economy/image/abc",
    );
    expect(proxied).toMatch(/^\/api\/image-proxy\?url=/);
    expect(proxiedImageUrl("https://evil.example/x.png")).toBe(
      "https://evil.example/x.png",
    );
    expect(proxiedImageUrl(null)).toBeNull();
  });
});

describe("stored view/theme parsers", () => {
  it("falls back for unknown inventory views and themes", () => {
    expect(parseInventoryView("list")).toBe("list");
    expect(parseInventoryView("cards")).toBe("grid");
    expect(parsePageTheme("midsummer")).toBe("midsummer");
    expect(parsePageTheme("neon")).toBe("classic");
    expect(parseShareCardTheme("dark")).toBe("dark");
  });
});

describe("catalog helpers", () => {
  it("maps FACEIT levels, Zeus category, knives/gloves, phases, and wear overlap", () => {
    expect(faceitLevelImageSrc(10)).toBe("/faceit/level-10.png");
    expect(faceitLevelImageSrc(0)).toBeNull();
    expect(faceitLevelColor(10)).toBe("#fe1f00");
    expect(isZeusWeapon("Zeus x27")).toBe(true);
    expect(effectiveWeaponCategory("Equipment", "Zeus x27")).toBe("Pistols");
    expect(
      isKnifeSkin({ kind: "skin", weaponCategoryId: "sfui_invpanel_filter_melee" }),
    ).toBe(true);
    expect(
      isGloveSkin({ kind: "skin", weaponCategoryId: "sfui_invpanel_filter_gloves" }),
    ).toBe(true);
    expect(formatPhaseShort("Phase 2")).toBe("P2");
    expect(resolveSkinPhase({ paintIndex: "416" })).toBe("Sapphire");
    expect(phaseAccent("Ruby")).toBe("#ef4444");
    expect(finishStyleFromPatternId("cu_ak47")).toBe("Custom Paint Job");
    expect(formatFloatShort(0.07)).toBe("0.07");
    expect(wearRangeForSkin(WEAR_BANDS[0]!, 0.15, 0.38)).toBeNull();
    expect(wearRangeForSkin(WEAR_BANDS[2]!, 0, 1)).toEqual({
      min: 0.15,
      max: 0.38,
    });
  });
});
