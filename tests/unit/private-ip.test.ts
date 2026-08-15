import { describe, expect, it } from "vitest";
import { isPrivateIp } from "@/lib/net/private-ip";

describe("isPrivateIp", () => {
  it("flags loopback, RFC1918, and link-local addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.8")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("allows public IPv4", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("does not treat four-label hostnames as IPv4", () => {
    expect(isPrivateIp("community.cloudflare.steamstatic.com")).toBe(false);
  });
});
