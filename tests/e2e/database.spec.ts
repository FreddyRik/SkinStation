import { expect, test } from "@playwright/test";
import { mockFx, mockJson, slimCatalogItem } from "./helpers";

test.describe("skin database", () => {
  test("loads mocked catalog items and filters by search", async ({ page }) => {
    await mockFx(page);
    await mockJson(page, "**/api/cs-catalog", {
      items: [slimCatalogItem()],
      collections: [],
    });

    await page.goto("/database");
    await expect(
      page.getByRole("heading", { name: /skin database/i }),
    ).toBeVisible();

    await page.getByPlaceholder(/search by name/i).fill("Redline");
    await expect(page.getByText("AK-47 | Redline")).toBeVisible();
  });

  test("surfaces a catalog load failure", async ({ page }) => {
    await mockFx(page);
    await mockJson(
      page,
      "**/api/cs-catalog",
      { error: "Failed to load CS item catalog." },
      502,
    );

    await page.goto("/database");
    await expect(page.getByText(/failed to load cs item catalog/i)).toBeVisible();
  });
});
