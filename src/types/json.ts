/** Runtime narrowing helpers for unknown JSON and loosely typed payloads. */

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asRecordArray(value: unknown): JsonRecord[] {
  return asUnknownArray(value).filter(isRecord);
}

export function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function readStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function readNumberOrNull(value: unknown): number | null {
  return readNumber(value) ?? null;
}

export function readInt(value: unknown): number | undefined {
  const n = readNumber(value);
  return n == null ? undefined : Math.trunc(n);
}

export function readIntOrNull(value: unknown): number | null {
  return readInt(value) ?? null;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function stringField(
  record: JsonRecord,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

export function nestedRecord(
  record: JsonRecord,
  key: string,
): JsonRecord | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}
