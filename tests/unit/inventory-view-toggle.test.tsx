import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InventoryViewToggle } from "@/components/InventoryViewToggle";
import { INVENTORY_VIEW_STORAGE_KEY } from "@/lib/inventory-view";

describe("InventoryViewToggle", () => {
  it("switches layout and persists the choice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InventoryViewToggle value="grid" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "List" }));
    expect(onChange).toHaveBeenCalledWith("list");
    expect(window.localStorage.getItem(INVENTORY_VIEW_STORAGE_KEY)).toBe("list");
  });
});
