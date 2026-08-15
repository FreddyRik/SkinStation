import { expect, test } from "@playwright/test";

test.describe("legal, status, and not-found", () => {
  test("privacy policy", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { name: /privacy policy/i }),
    ).toBeVisible();
  });

  test("terms of service", async ({ page }) => {
    await page.goto("/terms");
    await expect(
      page.getByRole("heading", { name: /terms of service/i }),
    ).toBeVisible();
  });

  test("roadmap and limitations", async ({ page }) => {
    await page.goto("/status");
    await expect(
      page.getByRole("heading", { name: /roadmap & limitations/i }),
    ).toBeVisible();
  });

  test("unknown routes use the not-found profile card", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(
      page.getByRole("heading", { name: /profile not found/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /back home/i })).toBeVisible();
  });
});
