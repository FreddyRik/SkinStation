import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogSortSelect } from "@/components/database/CatalogSortSelect";

describe("CatalogSortSelect", () => {
  it("exposes a labeled sort control and reports price order changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalogSortSelect value="rarity" onChange={onChange} />);

    const select = screen.getByLabelText("Sort weapons and skins");
    expect(select).toHaveValue("rarity");
    await user.selectOptions(select, "price_desc");
    expect(onChange).toHaveBeenCalledWith("price_desc");
  });
});
