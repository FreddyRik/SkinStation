import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("node:dns/promises", () => {
  const lookup = vi.fn(
    async (_hostname: string, options?: { all?: boolean }) => {
      const row = { address: "8.8.8.8", family: 4 as const };
      return options?.all ? [row] : row;
    },
  );
  return { lookup, default: { lookup } };
});

import { GET } from "@/app/api/image-proxy/route";

function requestFor(url?: string): NextRequest {
  const href =
    url === undefined
      ? "http://localhost/api/image-proxy"
      : `http://localhost/api/image-proxy?url=${encodeURIComponent(url)}`;
  return new NextRequest(href);
}

describe("GET /api/image-proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when url is missing", async () => {
    const res = await GET(requestFor());
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid URL", async () => {
    const res = await GET(requestFor("not a url"));
    expect(res.status).toBe(400);
  });

  it("rejects non-https URLs", async () => {
    const res = await GET(
      requestFor("http://community.cloudflare.steamstatic.com/economy/image/abc"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects hosts outside the Steam CDN allow-list", async () => {
    const res = await GET(requestFor("https://evil.example/steal.png"));
    expect(res.status).toBe(403);
  });

  it("proxies an allowed Steam CDN image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            headers: { "content-type": "image/png" },
          }),
      ),
    );
    const res = await GET(
      requestFor(
        "https://community.cloudflare.steamstatic.com/economy/image/abc",
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/immutable/);
  });

  it("returns 502 when the upstream fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    const res = await GET(
      requestFor(
        "https://community.cloudflare.steamstatic.com/economy/image/abc",
      ),
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 when upstream is not an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html></html>", {
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    const res = await GET(
      requestFor(
        "https://community.cloudflare.steamstatic.com/economy/image/abc",
      ),
    );
    expect(res.status).toBe(502);
  });
});
