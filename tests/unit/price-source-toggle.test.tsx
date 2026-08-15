import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceSourceToggle } from "@/components/PriceSourceToggle";
import { PRICE_SOURCE_STORAGE_KEY } from "@/lib/price-source";

describe("PriceSourceToggle", () => {
  it("switches the selected market and persists it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PriceSourceToggle value="buff" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Buff" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Steam" }));
    expect(onChange).toHaveBeenCalledWith("steam");
    expect(window.localStorage.getItem(PRICE_SOURCE_STORAGE_KEY)).toBe("steam");
  });
});
