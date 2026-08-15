import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { CURRENCY_CHANGE_EVENT, CURRENCY_STORAGE_KEY } from "@/lib/currency";

describe("useDisplayCurrency", () => {
  it("hydrates from localStorage then follows currency change events", async () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, "EUR");
    const { result } = renderHook(() => useDisplayCurrency());
    await waitFor(() => {
      expect(result.current).toBe("EUR");
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: "USD" }),
      );
    });
    expect(result.current).toBe("USD");
    window.localStorage.removeItem(CURRENCY_STORAGE_KEY);
  });
});
