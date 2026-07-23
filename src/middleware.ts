import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIpFromRequest, rateLimit } from "@/lib/api/rate-limit";

/** Expensive POST routes that fan out to Steam / pricing / enrichers. */
const RATE_LIMITED_POST = new Set(["/api/sync", "/api/profiles"]);

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

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

export function middleware(req: NextRequest) {
  if (
    req.method === "POST" &&
    RATE_LIMITED_POST.has(req.nextUrl.pathname)
  ) {
    const ip = clientIpFromRequest(req);
    const result = rateLimit(`${req.nextUrl.pathname}:${ip}`, RATE_LIMIT);
    if (!result.ok) {
      const res = NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(result.retryAfterSec));
      return applySecurityHeaders(res);
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
