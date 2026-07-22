import { NextRequest, NextResponse } from "next/server";
import { isAllowedImageHost } from "@/lib/share-card";

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

  if (target.protocol !== "https:" || !isAllowedImageHost(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "InventoryTracker/1.0",
        Accept: "image/*,*/*;q=0.8",
      },
      next: { revalidate: 86400 },
    });

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

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image." },
      { status: 502 },
    );
  }
}
