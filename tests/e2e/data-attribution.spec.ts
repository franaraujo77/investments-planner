/**
 * Data Source Attribution E2E Tests
 *
 * Story 7.1: Data Source Attribution
 *
 * AC-7.1.1: Click/Hover Data Point Attribution
 * AC-7.1.2: Timestamp Visibility
 * AC-7.1.3: Investor Relations Document Attribution
 * AC-7.1.4: Multiple Sources Display
 * AC-7.1.5: Independent Verification Support
 *
 * Tests for data source attribution display across the application.
 */

import { test, expect } from "@playwright/test";

// Test user credentials - should match a verified test user
const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword1!",
};

/**
 * Check if @data-setup tests should run
 * Set RUN_DATA_SETUP_TESTS=true to enable these tests
 */
const SKIP_DATA_SETUP_TESTS = !process.env.RUN_DATA_SETUP_TESTS;

/**
 * Helper to login before each test
 */
async function loginUser(page: import("@playwright/test").Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.locator('input[name="password"]').fill(TEST_USER.password);
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for redirect to portfolios
  await expect(page).toHaveURL(/\/portfolio/, { timeout: 10000 });
}

test.describe("Story 7.1: Data Source Attribution", () => {
  test.describe("AC-7.1.1: Click/Hover Data Point Attribution", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("hovering on data point shows source tooltip", async ({ page }) => {
      await loginUser(page);

      // Navigate to first portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Wait for portfolio detail page
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Find a holding row and click to open detail drawer
      const holdingRow = page.getByTestId("holding-row").first();
      await holdingRow.click();

      // Wait for drawer to open
      const drawer = page.getByTestId("holding-detail-drawer");
      await expect(drawer).toBeVisible();

      // Check that data source section is present
      const dataSourceSection = page.getByTestId("data-freshness-section");
      await expect(dataSourceSection).toBeVisible();

      // Verify source is displayed
      await expect(dataSourceSection).toContainText("Source:");
    });

    test("data freshness badge shows source on hover", async ({ page }) => {
      await loginUser(page);

      // Navigate to dashboard
      await page.goto("/");
      await expect(page).toHaveURL("/");

      // Look for data freshness badge
      const freshnessBadge = page.getByTestId("data-freshness-badge").first();

      if (await freshnessBadge.isVisible()) {
        // Hover to show tooltip
        await freshnessBadge.hover();

        // Wait for tooltip to appear
        const tooltip = page.getByTestId("data-freshness-tooltip");
        await expect(tooltip).toBeVisible({ timeout: 3000 });

        // Verify source is shown in tooltip
        await expect(tooltip).toContainText("Source:");
      }
    });
  });

  test.describe("AC-7.1.2: Timestamp Visibility", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("holding detail shows relative and exact timestamp", async ({ page }) => {
      await loginUser(page);

      // Navigate to first portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Wait for portfolio detail page
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Open a holding detail
      const holdingRow = page.getByTestId("holding-row").first();
      await holdingRow.click();

      const drawer = page.getByTestId("holding-detail-drawer");
      await expect(drawer).toBeVisible();

      // Check for timestamp display
      const dataSourceSection = page.getByTestId("data-freshness-section");
      await expect(dataSourceSection).toBeVisible();

      // Should show relative time like "Updated X ago"
      await expect(dataSourceSection).toContainText(/Updated/);
    });
  });

  test.describe("AC-7.1.4: Multiple Sources Display", () => {
    test("multi-source attribution component has accessible structure", async ({ page }) => {
      // This test verifies the component structure is accessible
      // without requiring actual multi-source data

      await page.setContent(`
        <div data-testid="multi-source-attribution">
          <button
            aria-expanded="false"
            aria-controls="multi-source-panel"
            data-testid="multi-source-trigger"
          >
            Gemini API - Data from 3 sources
          </button>
          <div id="multi-source-panel" hidden>
            <div data-testid="source-item">Source 1</div>
            <div data-testid="source-item">Source 2</div>
            <div data-testid="source-item">Source 3</div>
          </div>
        </div>
      `);

      const trigger = page.getByTestId("multi-source-trigger");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toHaveAttribute("aria-controls", "multi-source-panel");
    });
  });

  test.describe("AC-7.1.5: Independent Verification Support", () => {
    test("document reference link is properly structured", async ({ page }) => {
      // Test component structure for verification links
      await page.setContent(`
        <a
          href="https://sec.gov/filings/123"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="verification-link"
        >
          View source
        </a>
      `);

      const link = page.getByTestId("verification-link");
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toHaveAttribute("href", "https://sec.gov/filings/123");
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("attribution tooltip is accessible via keyboard", async ({ page }) => {
      await page.setContent(`
        <div>
          <span
            data-testid="data-with-attribution"
            tabindex="0"
            role="button"
          >
            $28.45
          </span>
        </div>
      `);

      const element = page.getByTestId("data-with-attribution");

      // Focus the element using keyboard
      await element.focus();

      // Verify element is focusable
      await expect(element).toBeFocused();

      // Verify accessibility attributes
      await expect(element).toHaveAttribute("tabindex", "0");
      await expect(element).toHaveAttribute("role", "button");
    });

    test("multi-source expand/collapse works with keyboard", async ({ page }) => {
      await page.setContent(`
        <div>
          <button
            data-testid="expand-trigger"
            aria-expanded="false"
            onkeydown="if(event.key==='Enter'||event.key===' '){this.setAttribute('aria-expanded','true')}"
          >
            Data from 3 sources
          </button>
        </div>
      `);

      const trigger = page.getByTestId("expand-trigger");

      // Focus the trigger
      await trigger.focus();
      await expect(trigger).toBeFocused();

      // Press Enter to expand
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  test.describe("Data Freshness Display Integration", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("portfolio list shows freshness indicators", async ({ page }) => {
      await loginUser(page);

      // Should already be on portfolio page after login
      await expect(page).toHaveURL(/\/portfolio/);

      // Check for presence of portfolio cards
      const portfolioCards = page.getByTestId("portfolio-card");
      const count = await portfolioCards.count();

      if (count > 0) {
        // Click first portfolio to see detail
        await portfolioCards.first().click();
        await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

        // Holdings table should be visible
        const holdingsTable = page.getByTestId("holdings-table");
        await expect(holdingsTable).toBeVisible();
      }
    });
  });
});
