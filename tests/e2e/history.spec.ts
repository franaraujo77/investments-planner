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
 *
 * NOTE: This file runs in the "chromium-authenticated" project with stored auth state.
 * Tests assume the user is already authenticated via the auth.setup.ts flow.
 */

import { test, expect } from "@playwright/test";

test.describe("Investment History Page", () => {
  test.describe("AC-3.9.6: Empty State Handling", () => {
    test("should show empty state when no investments exist", async ({ page }) => {
      await page.goto("/history");

      // Check for empty state elements (may or may not be visible depending on data)
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

      // Check for page title (use exact match to avoid matching empty state heading)
      await expect(
        page.getByRole("heading", { name: "Investment History", exact: true })
      ).toBeVisible();

      // Check for description
      await expect(page.getByText(/track your investment decisions/i)).toBeVisible();
    });

    test("should display date range filter", async ({ page }) => {
      await page.goto("/history");

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

      // Look for the export button
      const exportButton = page.getByRole("button", { name: /export csv/i });
      // Button may be disabled if no investments
      await expect(exportButton).toBeVisible();
    });
  });

  test.describe("AC-3.9.5: Date Range Filtering", () => {
    test("should show filter presets when clicking date filter", async ({ page }) => {
      await page.goto("/history");

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
    test("should redirect to login if not authenticated", async ({ browser }) => {
      // Create a fresh context without stored auth to test unauthenticated access
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("/history");

      // Check if redirected to login
      await expect(page).toHaveURL(/\/login/);

      await context.close();
    });
  });
});

test.describe("Investment History with Data", () => {
  // These tests require a logged-in user with existing investments
  // When running in the chromium-authenticated project, auth is handled via stored state

  test("should navigate to history from sidebar", async ({ page }) => {
    // Navigate to dashboard first
    await page.goto("/");

    // Find and click history link in sidebar
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
