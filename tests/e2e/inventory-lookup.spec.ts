import { expect, test } from "@playwright/test";
import { mockFx } from "./helpers";

test.describe("inventory lookup page", () => {
  test("uses the card layout rather than the cinematic vault", async ({
    page,
  }) => {
    await mockFx(page);
    await page.goto("/inventory");

    await expect(
      page.getByRole("heading", { name: /your one-stop for cs2 skins/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /load inventory/i })).toBeVisible();
    await expect(page.locator("form.et-command")).toBeVisible();
  });
});
