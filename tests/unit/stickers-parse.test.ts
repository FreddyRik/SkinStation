import { describe, expect, it } from "vitest";
import { parseStickersJson } from "@/lib/stickers/parse";

describe("parseStickersJson", () => {
  it("returns an empty array for missing or invalid JSON", () => {
    expect(parseStickersJson(null)).toEqual([]);
    expect(parseStickersJson("")).toEqual([]);
    expect(parseStickersJson("{")).toEqual([]);
    expect(parseStickersJson("{}")).toEqual([]);
  });

  it("keeps typed sticker fields and maps legacy skinportPrice", () => {
    const parsed = parseStickersJson(
      JSON.stringify([
        {
          slot: 1,
          name: "titov",
          wear: 0.1,
          iconUrl: "https://example.com/t.png",
          steamPrice: 1.5,
          skinportPrice: 2,
        },
        "skip-me",
        { name: 12 },
      ]),
    );
    expect(parsed[0]).toMatchObject({
      slot: 1,
      name: "titov",
      wear: 0.1,
      steamPrice: 1.5,
      buffPrice: 2,
    });
    expect(parsed[1]).toEqual({});
    expect(parsed[2]?.name).toBeUndefined();
  });
});
