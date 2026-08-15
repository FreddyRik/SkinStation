import { apiErrorSchema } from "@/lib/api/schemas";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse a fetch Response as JSON without throwing on empty / HTML bodies. */
export async function readResponseJson(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Safe client-facing `error` string from an API JSON body. */
export function jsonErrorMessage(data: unknown, fallback: string): string {
  const parsed = apiErrorSchema.safeParse(data);
  if (!parsed.success) return fallback;
  return parsed.data.error;
}

export function jsonRecord(data: unknown): Record<string, unknown> | null {
  return isRecord(data) ? data : null;
}

export function jsonStringField(data: unknown, key: string): string | null {
  const row = jsonRecord(data);
  if (!row) return null;
  const value = row[key];
  return typeof value === "string" ? value : null;
}

export function jsonNumberField(data: unknown, key: string): number | null {
  const row = jsonRecord(data);
  if (!row) return null;
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function jsonBooleanField(data: unknown, key: string): boolean {
  const row = jsonRecord(data);
  return row?.[key] === true;
}

export function jsonArrayField(data: unknown, key: string): unknown[] {
  const row = jsonRecord(data);
  if (!row) return [];
  const value = row[key];
  return Array.isArray(value) ? value : [];
}
