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
    await expect(page.getByText(/loading catalog/i)).toHaveCount(0);

    await page.getByPlaceholder(/search by name/i).fill("Redline");
    await expect(page.getByRole("link", { name: "Redline" })).toBeVisible();
    await expect(page.getByText(/1 result/)).toBeVisible();
  });

  test("sorts weapons and skins by price", async ({ page }) => {
    await mockFx(page);
    await mockJson(page, "**/api/cs-catalog", {
      items: [
        slimCatalogItem({
          id: "skin-ak-blue",
          name: "AK-47 | Blue",
          patternName: "Blue",
          priceMinUsd: 5,
          priceMaxUsd: 8,
          rarity: {
            id: "rarity_rare_weapon",
            name: "Mil-Spec Grade",
            color: "#4b69ff",
          },
        }),
        slimCatalogItem({
          id: "skin-ak-gold",
          name: "AK-47 | Gold",
          patternName: "Gold",
          priceMinUsd: 200,
          priceMaxUsd: 400,
          rarity: {
            id: "rarity_rare_weapon",
            name: "Mil-Spec Grade",
            color: "#4b69ff",
          },
        }),
        slimCatalogItem({
          id: "skin-ak-fade",
          name: "AK-47 | Fade",
          patternName: "Fade",
          priceMinUsd: null,
          priceMaxUsd: null,
          rarity: {
            id: "rarity_rare_weapon",
            name: "Mil-Spec Grade",
            color: "#4b69ff",
          },
        }),
      ],
      collections: [],
    });

    await page.goto("/database?section=rifles");
    await expect(page.getByText(/loading catalog/i)).toHaveCount(0);

    const sort = page.getByLabel("Sort weapons and skins");
    await expect(sort).toBeVisible();
    await expect(sort).toHaveValue("rarity");

    const titles = page.locator("article .type-card-title");
    await expect(titles).toHaveText(["Blue", "Fade", "Gold"]);

    await sort.selectOption("price_desc");
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(titles).toHaveText(["Gold", "Blue", "Fade"]);

    await sort.selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(titles).toHaveText(["Blue", "Gold", "Fade"]);
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
