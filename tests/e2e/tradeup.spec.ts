import { expect, test } from "@playwright/test";
import { emptyTradeUpCatalog, mockFx, mockJson } from "./helpers";

test.describe("trade-up calculator", () => {
  test("renders empty contract slots from a mocked catalog", async ({ page }) => {
    await mockFx(page);
    await mockJson(page, "**/api/tradeup/catalog**", emptyTradeUpCatalog());

    await page.goto("/tradeup");
    await expect(
      page.getByRole("heading", { name: /trade-up/i }),
    ).toBeVisible();
    await expect(page.getByText(/contract \(0\/10\)/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /\+ add skin/i })).toHaveCount(10);
  });

  test("shows a catalog error instead of slots", async ({ page }) => {
    await mockFx(page);
    await mockJson(
      page,
      "**/api/tradeup/catalog**",
      { error: "Failed to load trade-up catalog." },
      502,
    );

    await page.goto("/tradeup");
    await expect(
      page.getByText(/failed to load trade-up catalog/i),
    ).toBeVisible();
    await expect(page.getByText(/contract \(0\/10\)/i)).toHaveCount(0);
  });
});
