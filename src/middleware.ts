import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";

const RATE_LIMITED_POST = new Set(["/api/sync", "/api/profiles"]);
const RATE_LIMITED_GET = new Set(["/api/image-proxy"]);

const POST_LIMIT = { limit: 10, windowMs: 60_000, name: "post" };
const IMAGE_PROXY_LIMIT = { limit: 60, windowMs: 60_000, name: "image-proxy" };

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = clientIpFromRequest(req);

  if (req.method === "POST" && RATE_LIMITED_POST.has(path)) {
    const result = await rateLimit(`${path}:${ip}`, POST_LIMIT);
    if (!result.ok) {
      return applySecurityHeaders(
        jsonError("Too many requests. Please wait and try again.", 429, {
          retryAfterSec: result.retryAfterSec,
        }),
      );
    }
  }

  if (req.method === "GET" && RATE_LIMITED_GET.has(path)) {
    const result = await rateLimit(`${path}:${ip}`, IMAGE_PROXY_LIMIT);
    if (!result.ok) {
      return applySecurityHeaders(
        jsonError("Too many requests. Please wait and try again.", 429, {
          retryAfterSec: result.retryAfterSec,
        }),
      );
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
