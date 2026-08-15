import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

describe("useUsdToEurRate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("starts at the 0.92 fallback then adopts /api/fx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ usdToEur: 0.88 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { useUsdToEurRate } = await import("@/hooks/useUsdToEurRate");
    const { result } = renderHook(() => useUsdToEurRate());
    expect(result.current).toBe(0.92);
    await waitFor(() => {
      expect(result.current).toBe(0.88);
    });
  });

  it("keeps the fallback when /api/fx fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 502 })),
    );
    const { useUsdToEurRate } = await import("@/hooks/useUsdToEurRate");
    const { result } = renderHook(() => useUsdToEurRate());
    expect(result.current).toBe(0.92);
    await waitFor(() => {
      expect(result.current).toBe(0.92);
    });
  });
});
