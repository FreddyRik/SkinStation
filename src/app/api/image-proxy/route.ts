import { NextRequest, NextResponse } from "next/server";
import { isAllowedImageHost } from "@/lib/share-card";
import { SITE_USER_AGENT } from "@/lib/site";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

class ProxyHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function forbiddenHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  );
}

function isSafeImageUrl(target: URL): boolean {
  return (
    target.protocol === "https:" &&
    isAllowedImageHost(target.hostname) &&
    !forbiddenHost(target.hostname)
  );
}

async function fetchAllowlistedImage(startUrl: URL): Promise<Response> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isSafeImageUrl(current)) {
      throw new ProxyHttpError(403, "Host not allowed.");
    }

    const upstream = await fetch(current.toString(), {
      headers: {
        "User-Agent": SITE_USER_AGENT,
        Accept: "image/*,*/*;q=0.8",
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
  if (!raw) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
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

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
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

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        // Needed when <img crossOrigin="anonymous"> loads the proxy for canvas export.
        "Access-Control-Allow-Origin": "*",
      },
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
