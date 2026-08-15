/**
 * Private / reserved IP detection for SSRF guards (image proxy, etc.).
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: number, prefix: number, bits: number): boolean {
  if (bits <= 0) return true;
  if (bits >= 32) return ip === prefix;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (ip & mask) === (prefix & mask);
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n == null) return true;
  return (
    ipv4InCidr(n, 0x00000000, 8) || // 0.0.0.0/8
    ipv4InCidr(n, 0x0a000000, 8) || // 10.0.0.0/8
    ipv4InCidr(n, 0x7f000000, 8) || // 127.0.0.0/8
    ipv4InCidr(n, 0xa9fe0000, 16) || // 169.254.0.0/16
    ipv4InCidr(n, 0xac100000, 12) || // 172.16.0.0/12
    ipv4InCidr(n, 0xc0a80000, 16) || // 192.168.0.0/16
    ipv4InCidr(n, 0x64400000, 10) || // 100.64.0.0/10 CGNAT
    ipv4InCidr(n, 0xc0000000, 24) || // 192.0.0.0/24
    ipv4InCidr(n, 0xc0000200, 24) || // 192.0.2.0/24 TEST-NET-1
    ipv4InCidr(n, 0xc6336400, 24) || // 198.51.100.0/24
    ipv4InCidr(n, 0xcb007100, 24) || // 203.0.113.0/24
    ipv4InCidr(n, 0xc6120000, 15) || // 198.18.0.0/15 benchmark
    ipv4InCidr(n, 0xe0000000, 4) || // 224.0.0.0/4 multicast
    ipv4InCidr(n, 0xf0000000, 4) // 240.0.0.0/4 reserved
  );
}

function expandIPv6(ip: string): number[] | null {
  const lower = ip.toLowerCase();
  if (lower.includes(".")) {
    const lastColon = lower.lastIndexOf(":");
    const v4 = ipv4ToInt(lower.slice(lastColon + 1));
    if (v4 == null) return null;
    const head = lower.slice(0, lastColon + 1);
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    return expandIPv6(`${head}${hi}:${lo}`);
  }

  const sides = lower.split("::");
  if (sides.length > 2) return null;
  const left = sides[0] ? sides[0].split(":") : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(":") : [];
  const groups = sides.length === 2 ? 8 - left.length - right.length : 0;
  if (groups < 0) return null;
  const hex = [
    ...left,
    ...Array.from({ length: groups }, () => "0"),
    ...right,
  ];
  if (hex.length !== 8) return null;
  const out: number[] = [];
  for (const part of hex) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    out.push(Number.parseInt(part, 16));
  }
  return out;
}

function isPrivateIPv6(ip: string): boolean {
  const groups = expandIPv6(ip);
  if (!groups) return true;
  // Unspecified and loopback
  const allZero = groups.every((g) => g === 0);
  if (allZero) return true;
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0 &&
    groups[6] === 0 &&
    groups[7] === 1
  ) {
    return true;
  }
  // IPv4-mapped ::ffff:x.x.x.x
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff
  ) {
    const v4 = ((groups[6] << 16) | groups[7]) >>> 0;
    const dotted = [
      (v4 >>> 24) & 255,
      (v4 >>> 16) & 255,
      (v4 >>> 8) & 255,
      v4 & 255,
    ].join(".");
    return isPrivateIPv4(dotted);
  }
  const first = groups[0];
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8
  return false;
}

/** True when the address is loopback, private, link-local, or otherwise non-public. */
export function isPrivateIp(address: string): boolean {
  const host = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (host.includes(":")) return isPrivateIPv6(host);
  // Hostnames (including four-label Steam CDN names) are not IP literals.
  if (ipv4ToInt(host) == null) return false;
  return isPrivateIPv4(host);
}
