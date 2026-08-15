import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { imageProxyUrlSchema } from "@/lib/api/schemas";
import { isPrivateIp } from "@/lib/net/private-ip";
import { isAllowedImageHost } from "@/lib/share-card";
import { SITE_USER_AGENT } from "@/lib/site";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
]);

class ProxyHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function corsOriginFor(req: NextRequest): string | null {
  const requestOrigin = req.nextUrl.origin;
  const origin = req.headers.get("origin");
  if (!origin || origin === requestOrigin) return requestOrigin;
  return null;
}

function forbiddenHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".arpa") ||
    isPrivateIp(host)
  );
}

function isSafeImageUrl(target: URL): boolean {
  if (target.protocol !== "https:") return false;
  if (target.username || target.password) return false;
  if (target.port && target.port !== "443") return false;
  if (!isAllowedImageHost(target.hostname)) return false;
  if (forbiddenHost(target.hostname)) return false;
  if (isIP(target.hostname)) return false;
  return true;
}

async function hostnameIsPublic(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isPrivateIp(hostname);
  try {
    const records = await lookup(hostname, { all: true });
    if (records.length === 0) return false;
    return records.every((row) => !isPrivateIp(row.address));
  } catch {
    return false;
  }
}

async function fetchAllowlistedImage(startUrl: URL): Promise<Response> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isSafeImageUrl(current)) {
      throw new ProxyHttpError(403, "Host not allowed.");
    }
    if (!(await hostnameIsPublic(current.hostname))) {
      throw new ProxyHttpError(403, "Host not allowed.");
    }

    const upstream = await fetch(current.toString(), {
      headers: {
        "User-Agent": SITE_USER_AGENT,
        Accept: "image/png,image/jpeg,image/webp,image/gif,image/avif,*/*;q=0.1",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 86400 },
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (!location) {
        throw new ProxyHttpError(502, "Upstream redirect missing Location.");
      }
      current = new URL(location, current);
      continue;
    }

    return upstream;
  }

  throw new ProxyHttpError(502, "Too many redirects.");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  const parsedUrl = imageProxyUrlSchema.safeParse(raw);
  if (!parsedUrl.success) {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(parsedUrl.data);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  if (!isSafeImageUrl(target)) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 403 });
  }

  try {
    const upstream = await fetchAllowlistedImage(target);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream failed (${upstream.status}).` },
        { status: 502 },
      );
    }

    const contentTypeRaw =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentType = contentTypeRaw.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Upstream did not return an image." },
        { status: 502 },
      );
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds size limit." },
        { status: 502 },
      );
    }

    const reader = upstream.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: "Upstream returned an empty body." },
        { status: 502 },
      );
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Image exceeds size limit." },
          { status: 502 },
        );
      }
      chunks.push(value);
    }

    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const allowOrigin = corsOriginFor(req);
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    };
    if (allowOrigin) {
      headers["Access-Control-Allow-Origin"] = allowOrigin;
      headers.Vary = "Origin";
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    if (err instanceof ProxyHttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch image." },
      { status: 502 },
    );
  }
}
