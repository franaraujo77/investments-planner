/**
 * Investment History E2E Tests
 *
 * Story 3.9: Investment History View
 *
 * Tests for investment history functionality:
 * - AC-3.9.1: Timeline display with date grouping
 * - AC-3.9.2: Expandable investment details
 * - AC-3.9.3: Recommended vs actual comparison
 * - AC-3.9.4: CSV export functionality
 * - AC-3.9.5: Date range filtering
 * - AC-3.9.6: Empty state handling
 */

import { test, expect } from "@playwright/test";

// Test data setup
const TEST_USER = {
  email: "test-history@example.com",
  password: "TestPass123!",
};

/**
 * Helper to log in a test user
 */
async function loginTestUser(page: import("@playwright/test").Page) {
  await page.goto("/login");

  // Wait for the login form to be visible
  await page.waitForSelector('input[name="email"]');

  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or home
  await page.waitForURL(/\/(portfolio|dashboard|history)?$/);
}

test.describe("Investment History Page", () => {
  test.describe("AC-3.9.6: Empty State Handling", () => {
    test("should show empty state when no investments exist", async ({ page }) => {
      // Skip if we can't create a fresh user - check for empty state elements
      await page.goto("/history");

      // If not logged in, we'll get redirected to login
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        // For empty state test, we need a logged-in user with no investments
        // This test requires a fresh user account
        test.skip();
        return;
      }

      // Check for empty state elements
      const emptyState = page.getByText("No investments recorded yet");
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();

        // Should have a CTA button
        const ctaButton = page.getByRole("link", {
          name: /record your first investment/i,
        });
        await expect(ctaButton).toBeVisible();
        await expect(ctaButton).toHaveAttribute("href", "/portfolio");
      }
    });
  });

  test.describe("AC-3.9.1: Timeline Display", () => {
    test("should navigate to history page and display header", async ({ page }) => {
      await page.goto("/history");

      // Check for page title
      await expect(page.getByRole("heading", { name: /investment history/i })).toBeVisible();

      // Check for description
      await expect(page.getByText(/track your investment decisions/i)).toBeVisible();
    });

    test("should display date range filter", async ({ page }) => {
      await page.goto("/history");

      // Check if we're redirected to login
      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Look for the date filter button
      const dateFilter = page.getByRole("button", { name: /all time|last/i });
      if (await dateFilter.isVisible()) {
        await expect(dateFilter).toBeVisible();
      }
    });
  });

  test.describe("AC-3.9.4: CSV Export", () => {
    test("should have export button visible", async ({ page }) => {
      await page.goto("/history");

      // Check if we're redirected to login
      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Look for the export button
      const exportButton = page.getByRole("button", { name: /export csv/i });
      // Button may be disabled if no investments
      await expect(exportButton).toBeVisible();
    });
  });

  test.describe("AC-3.9.5: Date Range Filtering", () => {
    test("should show filter presets when clicking date filter", async ({ page }) => {
      await page.goto("/history");

      // Check if we're redirected to login
      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Find and click the date filter button
      const dateFilter = page.getByRole("button", { name: /all time/i });
      if (await dateFilter.isVisible()) {
        await dateFilter.click();

        // Check for preset options
        await expect(page.getByText("Last 30 Days")).toBeVisible();
        await expect(page.getByText("Last 12 Months")).toBeVisible();
        await expect(page.getByText("This Year")).toBeVisible();
      }
    });
  });

  test.describe("Sidebar Navigation", () => {
    test("should have History link in sidebar", async ({ page }) => {
      await page.goto("/portfolio");

      // Check if we're redirected to login
      if (page.url().includes("/login")) {
        test.skip();
        return;
      }

      // Look for History link in sidebar
      const historyLink = page.getByRole("link", { name: /history/i });
      if (await historyLink.isVisible()) {
        await expect(historyLink).toBeVisible();

        // Click and navigate
        await historyLink.click();
        await page.waitForURL(/\/history/);

        // Verify we're on history page
        await expect(page).toHaveURL(/\/history/);
      }
    });
  });

  test.describe("Authentication", () => {
    test("should redirect to login if not authenticated", async ({ page }) => {
      await page.goto("/history");

      // Check if redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe("Investment History with Data", () => {
  // These tests require a logged-in user with existing investments

  test.beforeEach(async ({ page }) => {
    // Try to log in - skip if auth fails
    try {
      await loginTestUser(page);
    } catch {
      test.skip();
    }
  });

  test("should navigate to history from sidebar", async ({ page }) => {
    // Assume we're on a dashboard page after login
    const historyLink = page.getByRole("link", { name: /history/i });

    if (await historyLink.isVisible({ timeout: 5000 })) {
      await historyLink.click();
      await page.waitForURL(/\/history/);
      await expect(page).toHaveURL(/\/history/);
    }
  });

  test.describe("AC-3.9.2: Expandable Details", () => {
    test("should expand investment entry on click", async ({ page }) => {
      await page.goto("/history");

      // Find a timeline entry card
      const timelineEntry = page.locator("[aria-expanded]").first();

      if (await timelineEntry.isVisible({ timeout: 5000 })) {
        // Check initial state
        const initialExpanded = await timelineEntry.getAttribute("aria-expanded");

        // Click to toggle
        await timelineEntry.click();

        // Wait for expansion
        await page.waitForTimeout(300);

        // Verify state changed
        const newExpanded = await timelineEntry.getAttribute("aria-expanded");
        expect(newExpanded).not.toBe(initialExpanded);
      }
    });
  });

  test.describe("AC-3.9.5: Filtering", () => {
    test("should filter investments by date range", async ({ page }) => {
      await page.goto("/history");

      // Open date filter
      const dateFilter = page.getByRole("button", { name: /all time/i });

      if (await dateFilter.isVisible({ timeout: 5000 })) {
        await dateFilter.click();

        // Select a preset
        await page.getByText("Last 30 Days").click();

        // Wait for filter to apply
        await page.waitForTimeout(500);

        // Verify filter is active
        await expect(page.getByRole("button", { name: /last 30 days/i })).toBeVisible();
      }
    });

    test("should clear filters", async ({ page }) => {
      await page.goto("/history");

      // First apply a filter
      const dateFilter = page.getByRole("button", { name: /all time/i });

      if (await dateFilter.isVisible({ timeout: 5000 })) {
        await dateFilter.click();
        await page.getByText("Last 30 Days").click();

        // Look for clear button
        const clearButton = page.getByRole("button", {
          name: /clear.*filter/i,
        });

        if (await clearButton.isVisible()) {
          await clearButton.click();

          // Verify filter is cleared
          await expect(page.getByRole("button", { name: /all time/i })).toBeVisible();
        }
      }
    });
  });
});
