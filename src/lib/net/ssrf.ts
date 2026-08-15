/**
 * Outbound URL guards for inspect proxies, Steam workers, and other server fetches.
 * Callers must never fetch a user-controlled absolute URL without this check.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateIp } from "@/lib/net/private-ip";

export class UnsafeOutboundUrlError extends Error {
  constructor(message = "Outbound URL is not allowed.") {
    super(message);
    this.name = "UnsafeOutboundUrlError";
  }
}

function stripBrackets(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

export function isForbiddenHostname(hostname: string): boolean {
  const host = stripBrackets(hostname);
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".arpa") ||
    host === "metadata.google.internal" ||
    isPrivateIp(host)
  );
}

export function parseHttpsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    if (!url.hostname) return null;
    if (isIP(url.hostname)) return null;
    if (isForbiddenHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function hostnameResolvesPublic(hostname: string): Promise<boolean> {
  const host = stripBrackets(hostname);
  if (!host) return false;
  if (isIP(host)) return !isPrivateIp(host);
  try {
    const records = await lookup(host, { all: true });
    if (records.length === 0) return false;
    return records.every((row) => !isPrivateIp(row.address));
  } catch {
    return false;
  }
}

export type OutboundUrlPolicy = {
  /** Exact hostnames allowed (lowercase, no port). Empty → any public HTTPS host. */
  allowedHosts?: readonly string[];
};

function hostAllowed(hostname: string, allowedHosts: readonly string[] | undefined): boolean {
  if (!allowedHosts || allowedHosts.length === 0) return true;
  const host = stripBrackets(hostname);
  return allowedHosts.some((allowed) => allowed.trim().toLowerCase() === host);
}

/**
 * Parse and reject non-HTTPS, credentialed, private, or off-allowlist URLs.
 * DNS is resolved so a public hostname cannot point at RFC1918 / link-local.
 */
export async function assertSafeOutboundUrl(
  raw: string,
  policy: OutboundUrlPolicy = {},
): Promise<URL> {
  const url = parseHttpsUrl(raw);
  if (!url) {
    throw new UnsafeOutboundUrlError("Outbound URL must be public HTTPS without credentials.");
  }
  if (!hostAllowed(url.hostname, policy.allowedHosts)) {
    throw new UnsafeOutboundUrlError("Outbound host is not on the allowlist.");
  }
  if (!(await hostnameResolvesPublic(url.hostname))) {
    throw new UnsafeOutboundUrlError("Outbound host resolves to a private or invalid address.");
  }
  return url;
}

/** Hosts listed in `INSPECT_API_ALLOWED_HOSTS` (comma-separated), else the URL's own host. */
export function inspectApiAllowedHosts(baseUrl: string): string[] {
  const extra = process.env.INSPECT_API_ALLOWED_HOSTS?.split(",") ?? [];
  const fromEnv = extra.map((h) => h.trim().toLowerCase()).filter(Boolean);
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return [...new Set([host, ...fromEnv])];
  } catch {
    return fromEnv;
  }
}

export function steamProxyAllowedHosts(baseUrl: string): string[] {
  try {
    return [new URL(baseUrl).hostname.toLowerCase()];
  } catch {
    return [];
  }
}
