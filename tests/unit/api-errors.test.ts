import { describe, expect, it } from "vitest";
import {
  isForceSyncAuthorized,
  jsonError,
  jsonErrorWithRetryAfter,
  publicApiError,
  sanitizeProfileCreateError,
  sanitizeSyncClientError,
} from "@/lib/api/errors";

describe("sanitizeSyncClientError", () => {
  it("maps known Steam and sync failures to stable status codes", () => {
    expect(sanitizeSyncClientError(new Error("already in progress"))).toEqual({
      status: 409,
      error: "A sync is already in progress for this profile.",
    });
    expect(
      sanitizeSyncClientError(new Error("Ensure the profile and CS2 inventory are public")),
    ).toMatchObject({ status: 403 });
    expect(sanitizeSyncClientError(new Error("rate-limited by Steam"))).toMatchObject({
      status: 429,
    });
    expect(
      sanitizeSyncClientError(new Error("Steam proxy unauthorized")),
    ).toMatchObject({ status: 502 });
    expect(
      sanitizeSyncClientError(new Error("Could not resolve vanity")),
    ).toMatchObject({ status: 400 });
    expect(sanitizeSyncClientError(new Error("Profile not found"))).toMatchObject({
      status: 404,
    });
    expect(
      sanitizeSyncClientError(new Error("Could not load inventory from Steam")),
    ).toMatchObject({ status: 502 });
    expect(
      sanitizeSyncClientError(new Error("Force sync is not authorized")),
    ).toMatchObject({ status: 403 });
  });

  it("hides unknown internals behind a generic 500", () => {
    expect(sanitizeSyncClientError(new Error("ECONNRESET prisma"))).toEqual({
      status: 500,
      error: "Sync failed. Please try again later.",
    });
    expect(sanitizeSyncClientError("not-an-error")).toMatchObject({ status: 500 });
  });
});

describe("sanitizeProfileCreateError", () => {
  it("maps resolve, rate-limit, and network failures", () => {
    expect(
      sanitizeProfileCreateError(new Error("Could not resolve vanity")),
    ).toMatchObject({ status: 400 });
    expect(
      sanitizeProfileCreateError(new Error("rate limited")),
    ).toMatchObject({ status: 429 });
    expect(
      sanitizeProfileCreateError(new Error("network timeout talking to Steam")),
    ).toMatchObject({ status: 502 });
    expect(sanitizeProfileCreateError(new Error("boom"))).toMatchObject({
      status: 500,
    });
  });
});

describe("publicApiError", () => {
  it("returns a safe client message while keeping the log text", () => {
    const result = publicApiError(new Error("secret db url"), "Failed.");
    expect(result.message).toBe("Failed.");
    expect(result.logMessage).toBe("secret db url");
  });
});

describe("jsonError", () => {
  it("returns a structured { error } JSON body", async () => {
    const res = jsonError("Nope.", 400);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Nope." });
  });

  it("sets Retry-After on rate-limit responses", () => {
    const res = jsonErrorWithRetryAfter("Slow down.", 12);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
  });
});
describe("isForceSyncAuthorized", () => {
  it("requires an explicit force flag and matching secret", () => {
    const prev = process.env.SYNC_FORCE_SECRET;
    process.env.SYNC_FORCE_SECRET = "shh";
    const req = new Request("http://localhost/api/sync", {
      headers: { "x-sync-force-secret": "shh" },
    });
    expect(isForceSyncAuthorized(req, false)).toBe(false);
    expect(isForceSyncAuthorized(req, true)).toBe(true);
    expect(
      isForceSyncAuthorized(
        new Request("http://localhost/api/sync", {
          headers: { authorization: "Bearer nope" },
        }),
        true,
      ),
    ).toBe(false);
    if (prev === undefined) delete process.env.SYNC_FORCE_SECRET;
    else process.env.SYNC_FORCE_SECRET = prev;
  });
});
