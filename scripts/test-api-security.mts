/**
 * Unit tests for API validation, secret compare, private-IP SSRF guards,
 * trusted rate-limit IPs, and public error sanitization.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { jsonErrorResponse } from "../src/lib/api/parse.ts";
import { clientIpFromRequest } from "../src/lib/api/rate-limit.ts";
import {
  imageProxyUrlSchema,
  profileIdSchema,
  steamInputSchema,
  syncRequestSchema,
} from "../src/lib/api/schemas.ts";
import { secretsEqual } from "../src/lib/api/secrets.ts";
import {
  sanitizePublicErrorMessage,
  sanitizeSyncClientError,
} from "../src/lib/api/errors.ts";
import { isPrivateIp } from "../src/lib/net/private-ip.ts";
import { parseUsdToEurRate } from "../src/lib/fx.ts";

test("profileIdSchema accepts cuid-like ids and rejects junk", () => {
  assert.equal(
    profileIdSchema.safeParse("clxyz0123456789abcdefgh").success,
    true,
  );
  assert.equal(profileIdSchema.safeParse("").success, false);
  assert.equal(profileIdSchema.safeParse("ab").success, false);
  assert.equal(profileIdSchema.safeParse("id with spaces").success, false);
  assert.equal(profileIdSchema.safeParse("../../../etc/passwd").success, false);
});

test("steamInputSchema bounds length", () => {
  assert.equal(steamInputSchema.safeParse("76561198000000000").success, true);
  assert.equal(steamInputSchema.safeParse("").success, false);
  assert.equal(steamInputSchema.safeParse("x".repeat(300)).success, false);
});

test("syncRequestSchema requires profileId or input and rejects extras", () => {
  assert.equal(
    syncRequestSchema.safeParse({ profileId: "clxyz0123456789abcdefgh" })
      .success,
    true,
  );
  assert.equal(syncRequestSchema.safeParse({ input: "gaben" }).success, true);
  assert.equal(syncRequestSchema.safeParse({}).success, false);
  assert.equal(
    syncRequestSchema.safeParse({
      profileId: "clxyz0123456789abcdefgh",
      extra: true,
    }).success,
    false,
  );
  assert.equal(
    syncRequestSchema.safeParse({ force: "yes" }).success,
    false,
  );
});

test("imageProxyUrlSchema requires an https URL", () => {
  assert.equal(
    imageProxyUrlSchema.safeParse(
      "https://community.cloudflare.steamstatic.com/economy/image/abc",
    ).success,
    true,
  );
  assert.equal(imageProxyUrlSchema.safeParse("not-a-url").success, false);
  assert.equal(imageProxyUrlSchema.safeParse("javascript:alert(1)").success, false);
});

test("secretsEqual is length-safe and matches equal values", () => {
  assert.equal(secretsEqual("alpha", "alpha"), true);
  assert.equal(secretsEqual("alpha", "alphb"), false);
  assert.equal(secretsEqual("alpha", "alph"), false);
  assert.equal(secretsEqual("", "x"), false);
});

test("isPrivateIp covers loopback, RFC1918, link-local, and IPv4-mapped IPv6", () => {
  assert.equal(isPrivateIp("127.0.0.1"), true);
  assert.equal(isPrivateIp("10.0.0.8"), true);
  assert.equal(isPrivateIp("192.168.1.1"), true);
  assert.equal(isPrivateIp("172.16.0.1"), true);
  assert.equal(isPrivateIp("169.254.169.254"), true);
  assert.equal(isPrivateIp("0.0.0.0"), true);
  assert.equal(isPrivateIp("::1"), true);
  assert.equal(isPrivateIp("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isPrivateIp("1.1.1.1"), false);
});

test("clientIpFromRequest prefers platform headers over spoofed XFF", () => {
  const spoofed = new Request("https://example.com/api/sync", {
    headers: {
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      "x-vercel-forwarded-for": "9.9.9.9",
      "cf-connecting-ip": "8.8.4.4",
    },
  });
  assert.equal(clientIpFromRequest(spoofed), "8.8.4.4");

  const vercel = new Request("https://example.com/api/sync", {
    headers: {
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      "x-vercel-forwarded-for": "9.9.9.9",
    },
  });
  assert.equal(clientIpFromRequest(vercel), "9.9.9.9");

  const xffOnly = new Request("https://example.com/api/sync", {
    headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
  });
  assert.equal(clientIpFromRequest(xffOnly), "10.0.0.1");
});

test("sanitizePublicErrorMessage strips secret names", () => {
  assert.equal(
    sanitizePublicErrorMessage(
      "Steam proxy unauthorized — check STEAM_PROXY_SECRET.",
    ),
    "Sync failed. Please try again later.",
  );
  assert.equal(
    sanitizePublicErrorMessage("Steam rate-limited this IP. Wait a few minutes."),
    "Steam rate-limited this IP. Wait a few minutes.",
  );
});

test("sanitizeSyncClientError does not leak env var names", () => {
  const mapped = sanitizeSyncClientError(
    new Error("Steam proxy is misconfigured (STEAM_PROXY_URL missing)."),
  );
  assert.equal(mapped.status, 502);
  assert.equal(mapped.error.includes("STEAM_PROXY"), false);
});

test("jsonErrorResponse maps Zod issues to 400", () => {
  try {
    syncRequestSchema.parse({});
  } catch (err) {
    const mapped = jsonErrorResponse(err);
    assert.equal(mapped.status, 400);
    assert.ok(mapped.error.length > 0);
    return;
  }
  throw new Error("expected ZodError");
});

test("parseUsdToEurRate rejects poisoned or non-finite values", () => {
  assert.equal(parseUsdToEurRate(0.92), 0.92);
  assert.equal(parseUsdToEurRate(0), null);
  assert.equal(parseUsdToEurRate(9.99), null);
  assert.equal(parseUsdToEurRate(Number.NaN), null);
  assert.equal(parseUsdToEurRate("0.92"), null);
});
