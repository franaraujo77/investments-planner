import { test, expect } from "@playwright/test";

/**
 * Smoke Tests
 *
 * Basic E2E tests to verify the application loads correctly.
 * These tests run against localhost:3000.
 */

test.describe("Homepage", () => {
  test("should load successfully", async ({ page }) => {
    const response = await page.goto("/");

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);
  });

  test("should have correct title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Investments Planner/i);
  });

  test("should have no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out expected Next.js development warnings
    const unexpectedErrors = consoleErrors.filter(
      (error) =>
        !error.includes("Download the React DevTools") &&
        !error.includes("Warning:")
    );

    expect(unexpectedErrors).toHaveLength(0);
  });

  test("should render main content area", async ({ page }) => {
    await page.goto("/");

    // Verify page has loaded by checking for a main content area
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});
