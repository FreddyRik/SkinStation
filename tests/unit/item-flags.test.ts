import { describe, expect, it } from "vitest";
import {
  hasStickers,
  isKnifeOrGlove,
  isKnownUnlistableItem,
  isNonWeaponConsumable,
  isSouvenir,
  isStatTrak,
  itemCanListOnMarket,
  itemSupportsFloat,
  itemSupportsStickers,
} from "@/lib/item-flags";

describe("itemSupportsFloat", () => {
  it("supports rifles, pistols, knives, and wear-suffixed skins", () => {
    expect(itemSupportsFloat("Rifle", "AK-47 | Redline (Field-Tested)")).toBe(
      true,
    );
    expect(itemSupportsFloat("Knife", "★ Karambit | Fade (Factory New)")).toBe(
      true,
    );
    expect(
      itemSupportsFloat(null, "AWP | Asiimov (Battle-Scarred)"),
    ).toBe(true);
  });

  it("rejects stickers, cases, agents, and music kits", () => {
    expect(itemSupportsFloat("Sticker", "Sticker | titov")).toBe(false);
    expect(itemSupportsFloat("Container", "Kilowatt Case")).toBe(false);
    expect(itemSupportsFloat("Agent", "Sir Bloody Miami Darryl")).toBe(false);
  });
});

describe("isKnifeOrGlove", () => {
  it("detects ★ prefix and type tags", () => {
    expect(isKnifeOrGlove(null, "★ Butterfly Knife | Doppler")).toBe(true);
    expect(isKnifeOrGlove("Gloves", "Sport Gloves | Hedge Maze")).toBe(true);
  });

  it("does not treat stickers as knives", () => {
    expect(isKnifeOrGlove("Sticker", "Sticker | titov")).toBe(false);
  });
});

describe("market listing rules", () => {
  it("marks medals, coins, used graffiti, and default music kits unlistable", () => {
    expect(isKnownUnlistableItem("Collectible", "Service Medal")).toBe(true);
    expect(isKnownUnlistableItem(null, "5 Year Veteran Coin")).toBe(true);
    expect(isKnownUnlistableItem("Graffiti", "Graffiti | titov")).toBe(true);
    expect(isKnownUnlistableItem("Music Kit", "Music Kit")).toBe(true);
    expect(isKnownUnlistableItem(null, "C4 Explosive")).toBe(true);
  });

  it("keeps sealed graffiti and real music kits listable", () => {
    expect(
      isKnownUnlistableItem(null, "Sealed Graffiti | titov"),
    ).toBe(false);
    expect(
      isKnownUnlistableItem("Music Kit", "Music Kit | AWOLNATION, I Am"),
    ).toBe(false);
  });

  it("honors the Steam marketable flag after heuristics", () => {
    expect(
      itemCanListOnMarket({
        marketable: false,
        type: "Rifle",
        marketHashName: "AK-47 | Redline (Field-Tested)",
      }),
    ).toBe(false);
    expect(
      itemCanListOnMarket({
        marketable: true,
        type: "Rifle",
        marketHashName: "AK-47 | Redline (Field-Tested)",
      }),
    ).toBe(true);
  });
});

describe("name flags", () => {
  it("detects StatTrak and Souvenir skins but not packages", () => {
    expect(isStatTrak("StatTrak™ AK-47 | Redline (Field-Tested)")).toBe(true);
    expect(isSouvenir("Souvenir AWP | Pit Viper (Field-Tested)")).toBe(true);
    expect(isSouvenir("Berlin 2019 Dust II Souvenir Package")).toBe(false);
  });

  it("detects applied stickers and blocks them on knives", () => {
    expect(hasStickers([{ name: "titov" }])).toBe(true);
    expect(hasStickers([])).toBe(false);
    expect(
      itemSupportsStickers("Rifle", "AK-47 | Redline (Field-Tested)"),
    ).toBe(true);
    expect(
      itemSupportsStickers("Knife", "★ Karambit | Fade (Factory New)"),
    ).toBe(false);
  });

  it("treats agents as non-weapon consumables", () => {
    expect(isNonWeaponConsumable("Agent", "Cmdr. Mae")).toBe(true);
  });
});
