import { z, type ZodType } from "zod";

export const MAX_JSON_BODY_BYTES = 16 * 1024;

export class ApiParseError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiParseError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function jsonErrorResponse(err: unknown): {
  status: number;
  error: string;
} {
  if (err instanceof ApiParseError) {
    return { status: err.status, error: err.message };
  }
  if (err instanceof z.ZodError) {
    const first = err.issues[0]?.message ?? "Invalid request.";
    return { status: 400, error: first };
  }
  return { status: 400, error: "Invalid request." };
}

/**
 * Read a JSON body with a hard size cap. Does not trust Content-Length alone.
 */
export async function parseJsonBody(
  req: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiParseError(415, "Content-Type must be application/json.");
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new ApiParseError(413, "Request body is too large.");
    }
  }

  const buffer = await req.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new ApiParseError(413, "Request body is too large.");
  }
  if (buffer.byteLength === 0) {
    throw new ApiParseError(400, "Request body is required.");
  }

  try {
    return JSON.parse(new TextDecoder("utf-8").decode(buffer)) as unknown;
  } catch {
    throw new ApiParseError(400, "Invalid JSON body.");
  }
}

export async function parseJsonSchema<T>(
  req: Request,
  schema: ZodType<T>,
  maxBytes?: number,
): Promise<T> {
  const raw = await parseJsonBody(req, maxBytes);
  return schema.parse(raw);
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}
