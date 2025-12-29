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

    // Filter out expected warnings and known third-party issues
    const unexpectedErrors = consoleErrors.filter(
      (error) =>
        !error.includes("Download the React DevTools") &&
        !error.includes("Warning:") &&
        // Vercel Speed Insights CSP error in local dev
        !error.includes("Content-Security-Policy") &&
        !error.includes("va.vercel-scripts.com")
    );

    expect(unexpectedErrors).toHaveLength(0);
  });

  test("should render main content area", async ({ page }) => {
    await page.goto("/");

    // Page may redirect to login (auth layout has no <main>)
    // Check for either main element or login page content
    const main = page.locator("main");
    const loginHeading = page.getByRole("heading", { name: "Investments Planner" });

    // Wait for either main content or login page
    await expect(main.or(loginHeading)).toBeVisible();
  });
});
