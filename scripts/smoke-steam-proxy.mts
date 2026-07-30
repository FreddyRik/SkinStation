/**
 * Smoke checks for Steam proxy helper + API error mapping.
 * Does not call Cloudflare or Steam — pure logic / local classification.
 *
 * Usage: npm run smoke:steam-proxy
 */

import assert from "node:assert/strict";
import {
  isSteamProxyConfigured,
  isSteamProxyConfigError,
  isSteamProxyTransientError,
} from "../src/lib/steam/steam-proxy.ts";
import { sanitizeSyncClientError } from "../src/lib/api/errors.ts";

function section(title: string) {
  console.log(`\n== ${title}`);
}

const savedUrl = process.env.STEAM_PROXY_URL;
const savedSecret = process.env.STEAM_PROXY_SECRET;

try {
  section("isSteamProxyConfigured (unset → direct Steam)");
  delete process.env.STEAM_PROXY_URL;
  delete process.env.STEAM_PROXY_SECRET;
  assert.equal(isSteamProxyConfigured(), false);

  section("isSteamProxyConfigured (both set)");
  process.env.STEAM_PROXY_URL = "https://example.workers.dev";
  process.env.STEAM_PROXY_SECRET = "test-secret";
  assert.equal(isSteamProxyConfigured(), true);

  section("isSteamProxyConfigured (URL only → not configured)");
  delete process.env.STEAM_PROXY_SECRET;
  assert.equal(isSteamProxyConfigured(), false);

  section("config vs transient error classification");
  assert.equal(
    isSteamProxyConfigError(
      "Steam proxy unauthorized — check STEAM_PROXY_SECRET.",
    ),
    true,
  );
  assert.equal(
    isSteamProxyConfigError("Steam proxy is misconfigured (STEAM_PROXY_URL missing)."),
    true,
  );
  assert.equal(
    isSteamProxyTransientError(
      "Steam proxy unauthorized — check STEAM_PROXY_SECRET.",
    ),
    false,
  );
  assert.equal(
    isSteamProxyTransientError(
      "Steam proxy timed out waiting for Steam Community.",
    ),
    true,
  );
  assert.equal(
    isSteamProxyTransientError("Could not reach Steam proxy. Try again shortly."),
    true,
  );
  assert.equal(
    isSteamProxyTransientError(
      "Steam proxy rate limit exceeded. Try again shortly.",
    ),
    true,
  );

  section("sanitizeSyncClientError — private inventory still 403");
  {
    const mapped = sanitizeSyncClientError(
      new Error(
        "Inventory is private or hidden. Set CS2 inventory to Public on Steam.",
      ),
    );
    assert.equal(mapped.status, 403);
  }

  section("sanitizeSyncClientError — bad secret → 502 proxy message (not private)");
  {
    const mapped = sanitizeSyncClientError(
      new Error("Steam proxy unauthorized — check STEAM_PROXY_SECRET."),
    );
    assert.equal(mapped.status, 502);
    assert.match(mapped.error, /proxy is misconfigured/i);
    assert.doesNotMatch(mapped.error, /private/i);
  }

  section("sanitizeSyncClientError — Steam rate limit still 429");
  {
    const mapped = sanitizeSyncClientError(
      new Error("Steam rate-limited this IP. Wait a few minutes and try again."),
    );
    assert.equal(mapped.status, 429);
  }

  console.log("\nAll steam-proxy smoke checks passed.\n");
} finally {
  if (savedUrl === undefined) delete process.env.STEAM_PROXY_URL;
  else process.env.STEAM_PROXY_URL = savedUrl;
  if (savedSecret === undefined) delete process.env.STEAM_PROXY_SECRET;
  else process.env.STEAM_PROXY_SECRET = savedSecret;
}
