import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonErrorWithRetryAfter } from "@/lib/api/errors";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";

const RATE_LIMITED_POST = new Set(["/api/sync", "/api/profiles"]);

const POST_LIMIT = { limit: 10, windowMs: 60_000, name: "post" };
const IMAGE_PROXY_LIMIT = { limit: 60, windowMs: 60_000, name: "image-proxy" };
const GET_API_LIMIT = { limit: 120, windowMs: 60_000, name: "get-api" };

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  return res;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = clientIpFromRequest(req);

  if (req.method === "POST" && RATE_LIMITED_POST.has(path)) {
    const result = await rateLimit(`${path}:${ip}`, POST_LIMIT);
    if (!result.ok) {
      return applySecurityHeaders(
        jsonErrorWithRetryAfter(
          "Too many requests. Please wait and try again.",
          result.retryAfterSec,
        ),
      );
    }
  }

  if (req.method === "GET" && path.startsWith("/api/")) {
    // Bucket by IP, not full path — otherwise /api/profiles/:id enumerates around limits.
    const global = await rateLimit(`get-api:${ip}`, GET_API_LIMIT);
    if (!global.ok) {
      return applySecurityHeaders(
        jsonErrorWithRetryAfter(
          "Too many requests. Please wait and try again.",
          global.retryAfterSec,
        ),
      );
    }
    if (path === "/api/image-proxy") {
      const img = await rateLimit(`image-proxy:${ip}`, IMAGE_PROXY_LIMIT);
      if (!img.ok) {
        return applySecurityHeaders(
          jsonErrorWithRetryAfter(
            "Too many requests. Please wait and try again.",
            img.retryAfterSec,
          ),
        );
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
