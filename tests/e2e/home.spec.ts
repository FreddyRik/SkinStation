import { expect, test } from "@playwright/test";
import { mockFx, mockJson, TEST_PROFILE } from "./helpers";

test.describe("home lookup", () => {
  test("renders the cinematic vault hero and site chrome", async ({ page }) => {
    await mockFx(page);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /your one-stop for cs2 skins/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /load inventory/i }),
    ).toBeDisabled();
    await expect(page.getByRole("link", { name: "Inventory" }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Skin Database" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Trade-up" }).first()).toBeVisible();
  });

  test("keeps the user on home when the profile cannot be resolved", async ({
    page,
  }) => {
    await mockFx(page);
    await mockJson(
      page,
      "**/api/profiles",
      { error: "Could not resolve that Steam profile. Check the URL or SteamID64." },
      400,
    );
    await page.goto("/");

    await page
      .getByPlaceholder(/steamcommunity.com/i)
      .fill("not-a-real-profile");
    await page.getByRole("button", { name: /load inventory/i }).click();

    await expect(
      page.getByText(/could not resolve that steam profile/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("shows a Steam rate-limit error from profile create", async ({ page }) => {
    await mockFx(page);
    await mockJson(
      page,
      "**/api/profiles",
      { error: "Steam rate-limited this request. Try again shortly." },
      429,
    );
    await page.goto("/");

    await page.getByPlaceholder(/steamcommunity.com/i).fill("76561198000000000");
    await page.getByRole("button", { name: /load inventory/i }).click();

    await expect(page.getByText(/rate-limited/i)).toBeVisible();
  });

  test("navigates to inventory after a successful create + sync", async ({
    page,
  }) => {
    await mockFx(page);
    await page.route("**/api/profiles", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ profile: TEST_PROFILE }),
        });
        return;
      }
      await route.continue();
    });
    await mockJson(page, "**/api/sync", {
      itemCount: 4,
      profileId: TEST_PROFILE.id,
    });

    await page.goto("/");
    await page.getByPlaceholder(/steamcommunity.com/i).fill("76561198000000000");
    await page.getByRole("button", { name: /load inventory/i }).click();

    await page.waitForURL(/\/inventory\/prof-1/, { waitUntil: "commit" });
  });
});
