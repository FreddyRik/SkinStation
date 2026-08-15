/** JSON object (non-array) after `JSON.parse` / `res.json()`. */
export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function jsonObject(value: unknown): JsonObject | null {
  return isJsonObject(value) ? value : null;
}

export function jsonUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function jsonObjectField(
  row: JsonObject,
  key: string,
): JsonObject | null {
  return jsonObject(row[key]);
}

export function jsonUnknownArrayField(
  row: JsonObject,
  key: string,
): unknown[] {
  return jsonUnknownArray(row[key]);
}

/** Prefer the first non-empty array field, or the value itself when it is an array. */
export function jsonRowsFromUnknown(
  data: unknown,
  keys: readonly string[],
): unknown[] {
  if (Array.isArray(data)) return data;
  const row = jsonObject(data);
  if (!row) return [];
  for (const key of keys) {
    const list = jsonUnknownArrayField(row, key);
    if (list.length > 0) return list;
  }
  return [];
}

export function parseJsonUnknown(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function parseJsonObject(text: string): JsonObject | null {
  try {
    return jsonObject(parseJsonUnknown(text));
  } catch {
    return null;
  }
}

export function parseJsonUnknownSafe(text: string): unknown | null {
  try {
    return parseJsonUnknown(text);
  } catch {
    return null;
  }
}
