import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { CURRENCY_STORAGE_KEY } from "@/lib/currency";

describe("CurrencyToggle", () => {
  it("marks the active currency and writes storage on change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CurrencyToggle value="USD" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "USD" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "EUR" }));
    expect(onChange).toHaveBeenCalledWith("EUR");
    expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("EUR");
  });

  it("does not change currency when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CurrencyToggle value="USD" onChange={onChange} disabled />);
    await user.click(screen.getByRole("button", { name: "EUR" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
