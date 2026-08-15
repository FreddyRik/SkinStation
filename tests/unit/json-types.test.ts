import { describe, expect, it } from "vitest";
import {
  isJsonObject,
  jsonObject,
  jsonObjectField,
  jsonRowsFromUnknown,
  jsonUnknownArray,
  parseJsonObject,
  parseJsonUnknownSafe,
} from "@/types/json";

describe("json type guards", () => {
  it("accepts plain objects and rejects arrays/null", () => {
    expect(isJsonObject({ a: 1 })).toBe(true);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject(null)).toBe(false);
    expect(jsonObject("nope")).toBeNull();
  });

  it("reads nested object and array fields", () => {
    const row = { iteminfo: { floatvalue: 0.12 }, items: [{ id: "1" }] };
    expect(jsonObjectField(row, "iteminfo")).toEqual({ floatvalue: 0.12 });
    expect(jsonUnknownArray(row.items)).toHaveLength(1);
    expect(jsonRowsFromUnknown(row, ["items"])).toEqual([{ id: "1" }]);
    expect(jsonRowsFromUnknown([{ id: "2" }], ["items"])).toEqual([{ id: "2" }]);
  });

  it("parses JSON text without throwing", () => {
    expect(parseJsonObject(`{"ok":true}`)).toEqual({ ok: true });
    expect(parseJsonObject("not-json")).toBeNull();
    expect(parseJsonUnknownSafe("[1]")).toEqual([1]);
    expect(parseJsonUnknownSafe("")).toBeNull();
  });
});
