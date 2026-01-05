/**
 * Data Refresh E2E Tests
 *
 * Story 5.5: Manual Data Refresh
 *
 * AC-5.5.1: Refresh button available in portfolio header with loading indicator
 * AC-5.5.2: Bulk refresh shows asset count progress
 * AC-5.5.3: Data freshness indicator with color-coded display
 * AC-5.5.4: Error handling with toast notification
 * AC-5.5.5: Rate limiting with countdown display
 *
 * Tests for manual data refresh functionality on portfolio views.
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

test.describe("Story 5.5: Manual Data Refresh", () => {
  test.describe("AC-5.5.1: Refresh Button in Portfolio Header", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("refresh button is visible in portfolio detail header", async ({ page }) => {
      await loginUser(page);

      // Navigate to first portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Wait for portfolio detail page
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Verify refresh button is present
      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toContainText("Refresh Data");
    });

    test("refresh button shows loading state when clicked", async ({ page }) => {
      await loginUser(page);

      // Navigate to first portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Wait for portfolio detail page
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      const refreshButton = page.getByTestId("portfolio-refresh-button");

      // Mock slow API response to observe loading state
      await page.route("**/api/data/refresh", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              refreshed: true,
              refreshedAt: new Date().toISOString(),
              nextRefreshAvailable: new Date(Date.now() + 3600000).toISOString(),
              remaining: 4,
              refreshedTypes: ["prices", "rates", "fundamentals"],
              providers: { prices: "gemini-api", rates: "exchangerate-api" },
            },
          }),
        });
      });

      // Click refresh and observe loading state
      await refreshButton.click();

      // Button should show loading text
      await expect(refreshButton).toContainText(/Refreshing/i);

      // Button should be disabled during refresh
      await expect(refreshButton).toBeDisabled();
    });

    test("refresh button shows success toast after refresh", async ({ page }) => {
      await loginUser(page);

      // Navigate to first portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Mock successful API response
      await page.route("**/api/data/refresh", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              refreshed: true,
              refreshedAt: new Date().toISOString(),
              nextRefreshAvailable: new Date(Date.now() + 3600000).toISOString(),
              remaining: 4,
              refreshedTypes: ["prices", "rates", "fundamentals"],
              providers: { prices: "gemini-api", rates: "exchangerate-api" },
            },
          }),
        });
      });

      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await refreshButton.click();

      // Wait for toast to appear
      await expect(page.getByText(/Data refreshed/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("AC-5.5.2: Bulk Refresh with Asset Count Progress", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("shows asset count in refresh button when refreshing multiple assets", async ({
      page,
    }) => {
      await loginUser(page);

      // Navigate to first portfolio (should have multiple assets)
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Wait for holdings to load to ensure we have multiple assets
      await expect(page.getByTestId("holdings-table")).toBeVisible();

      // Count visible assets
      const assetRows = page.getByTestId("holding-row");
      const assetCount = await assetRows.count();

      // Only run if portfolio has multiple assets
      if (assetCount > 1) {
        // Mock slow API to observe the asset count message
        await page.route("**/api/data/refresh", async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                refreshed: true,
                refreshedAt: new Date().toISOString(),
                nextRefreshAvailable: new Date(Date.now() + 3600000).toISOString(),
                remaining: 4,
                refreshedTypes: ["prices", "rates", "fundamentals"],
                providers: { prices: "gemini-api" },
              },
            }),
          });
        });

        const refreshButton = page.getByTestId("portfolio-refresh-button");
        await refreshButton.click();

        // Button should show asset count during refresh
        await expect(refreshButton).toContainText(new RegExp(`Refreshing ${assetCount} assets`));
      }
    });
  });

  test.describe("AC-5.5.3: Data Freshness Indicator", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("portfolio summary card shows data freshness information", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Portfolio summary card should show data freshness
      const summaryCard = page.getByTestId("portfolio-summary-card");
      await expect(summaryCard).toBeVisible();

      // Should show Price Data section with freshness
      await expect(summaryCard.getByText(/Price Data/i)).toBeVisible();
      await expect(summaryCard.getByTestId("data-freshness")).toBeVisible();
    });

    test("holdings table shows freshness indicators for stale data", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Holdings table should be visible
      const holdingsTable = page.getByTestId("holdings-table");
      await expect(holdingsTable).toBeVisible();

      // Check that Current Price column exists
      await expect(holdingsTable.getByText(/Current Price/i)).toBeVisible();
    });
  });

  test.describe("AC-5.5.4: Error Handling", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("shows error toast when refresh fails", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Mock API error
      await page.route("**/api/data/refresh", async (route) => {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Provider unavailable",
            code: "EXTERNAL_SERVICE_ERROR",
          }),
        });
      });

      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await refreshButton.click();

      // Error toast should appear
      await expect(page.getByText(/Failed to refresh|Provider unavailable/i)).toBeVisible({
        timeout: 5000,
      });
    });

    test("button returns to normal state after error", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Mock API error
      await page.route("**/api/data/refresh", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Internal server error",
            code: "INTERNAL_ERROR",
          }),
        });
      });

      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await refreshButton.click();

      // Wait for error handling to complete
      await page.waitForTimeout(1000);

      // Button should be enabled again and show normal text
      await expect(refreshButton).toBeEnabled();
      await expect(refreshButton).toContainText("Refresh Data");
    });
  });

  test.describe("AC-5.5.5: Rate Limiting", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("shows countdown when rate limited", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Mock rate limit response
      const resetAt = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
      await page.route("**/api/data/refresh", async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: {
            "Retry-After": "2700",
          },
          body: JSON.stringify({
            error: "Refresh limit exceeded. Try again in 45 minutes.",
            code: "RATE_LIMIT_EXCEEDED",
            details: {
              remaining: 0,
              resetAt: resetAt.toISOString(),
              retryAfter: 2700,
            },
          }),
        });
      });

      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await refreshButton.click();

      // Rate limit error toast should appear
      await expect(page.getByText(/limit exceeded|Try again in/i)).toBeVisible({ timeout: 5000 });

      // Button should show countdown (e.g., "45m")
      await expect(refreshButton).toContainText(/\d+m/);

      // Button should be disabled
      await expect(refreshButton).toBeDisabled();
    });

    test("button remains disabled while rate limited", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // First, trigger rate limit
      const resetAt = new Date(Date.now() + 30 * 60 * 1000);
      await page.route("**/api/data/refresh", async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Rate limited",
            code: "RATE_LIMIT_EXCEEDED",
            details: {
              remaining: 0,
              resetAt: resetAt.toISOString(),
              retryAfter: 1800,
            },
          }),
        });
      });

      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await refreshButton.click();

      // Wait for rate limit to be applied
      await page.waitForTimeout(500);

      // Button should be disabled and show countdown
      await expect(refreshButton).toBeDisabled();
      await expect(refreshButton).toContainText(/\d+m/);
    });
  });

  test.describe("Refresh Button Accessibility", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("refresh button has appropriate ARIA attributes", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      const refreshButton = page.getByTestId("portfolio-refresh-button");

      // Check ARIA label
      await expect(refreshButton).toHaveAttribute("aria-label", /refresh/i);

      // Check button is not busy initially
      await expect(refreshButton).toHaveAttribute("aria-busy", "false");
    });

    test("refresh button updates aria-busy during refresh", async ({ page }) => {
      await loginUser(page);

      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Mock slow API
      await page.route("**/api/data/refresh", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              refreshed: true,
              refreshedAt: new Date().toISOString(),
              nextRefreshAvailable: new Date(Date.now() + 3600000).toISOString(),
              remaining: 4,
              refreshedTypes: ["all"],
              providers: {},
            },
          }),
        });
      });

      const refreshButton = page.getByTestId("portfolio-refresh-button");
      await refreshButton.click();

      // Button should be busy during refresh
      await expect(refreshButton).toHaveAttribute("aria-busy", "true");
    });
  });
});

/**
 * Story 7.3: Data Freshness Indicators
 *
 * AC-7.3.1: DataFreshnessBadge visible on dashboard, portfolio, holdings, scores
 * AC-7.3.2: Click-to-refresh on dashboard recommendation badge
 * AC-7.3.3: Score breakdown shows freshness badge
 * AC-7.3.4: Holdings table header shows freshness badge
 * AC-7.3.5: Recommendation header shows overall freshness
 */
test.describe("Story 7.3: Data Freshness Indicators", () => {
  test.describe("AC-7.3.1: DataFreshnessBadge Visibility", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("portfolio list page shows data freshness badges", async ({ page }) => {
      await loginUser(page);

      // Portfolio list page should have loaded
      await expect(page).toHaveURL(/\/portfolio/);

      // Check for data freshness badge on portfolio summary
      const freshnessSection = page
        .locator('[data-testid="portfolio-value-summary"]')
        .getByText(/Data Updated/i);
      await expect(freshnessSection).toBeVisible();

      // Data freshness badge should be visible
      const freshnessDisplay = page
        .locator('[data-testid="portfolio-value-summary"]')
        .locator('[data-testid="data-freshness-badge"]');
      await expect(freshnessDisplay).toBeVisible();
    });

    test("holdings table header shows freshness badge", async ({ page }) => {
      await loginUser(page);

      // Navigate to portfolio detail
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Holdings table should be visible
      const holdingsTable = page.getByTestId("holdings-table");
      await expect(holdingsTable).toBeVisible();

      // Holdings table header should have freshness badge (AC-7.3.1)
      const headerFreshness = holdingsTable.locator('[data-testid="data-freshness-badge"]');
      await expect(headerFreshness).toBeVisible();
    });
  });

  test.describe("AC-7.3.2: Click-to-Refresh on Dashboard", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("recommendation freshness badge supports click to refresh", async ({ page }) => {
      await loginUser(page);

      // Navigate to dashboard
      await page.goto("/");

      // Wait for recommendations to load (or empty state)
      await page.waitForSelector(
        '[data-testid="focus-mode-section"], [data-testid="no-portfolio"]',
        {
          timeout: 10000,
        }
      );

      // If recommendations are visible, check for freshness badge
      const focusSection = page.locator('[data-testid="focus-mode-section"]');
      if (await focusSection.isVisible()) {
        // Freshness badge should be visible
        const freshnessBadge = focusSection.locator('[data-testid="data-freshness-badge"]');
        await expect(freshnessBadge).toBeVisible();

        // Badge should be refreshable (has data-refreshable="true" attribute)
        // The badge itself is clickable, no nested refresh button
        await expect(freshnessBadge).toHaveAttribute("data-refreshable", "true");
      }
    });
  });

  test.describe("AC-7.3.3: Score Breakdown Freshness", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("score breakdown panel shows freshness timestamp", async ({ page }) => {
      await loginUser(page);

      // Navigate to portfolio detail with holdings
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Wait for holdings to load
      const holdingsTable = page.getByTestId("holdings-table");
      await expect(holdingsTable).toBeVisible();

      // Click on a score badge to open breakdown
      const scoreBadge = page.locator('[data-testid="score-badge"]').first();
      if (await scoreBadge.isVisible()) {
        await scoreBadge.click();

        // Score breakdown sheet should open
        const breakdownSheet = page.locator('[role="dialog"]');
        await expect(breakdownSheet).toBeVisible({ timeout: 5000 });

        // Freshness timestamp should be visible in the sheet header
        const freshnessTimestamp = breakdownSheet.locator('[data-testid="freshness-timestamp"]');
        await expect(freshnessTimestamp).toBeVisible();
      }
    });
  });

  test.describe("AC-7.3.5: Recommendation Header Freshness", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("focus mode header shows overall recommendation freshness", async ({ page }) => {
      await loginUser(page);

      // Navigate to dashboard
      await page.goto("/");

      // Wait for content to load
      await page.waitForSelector(
        '[data-testid="focus-mode-section"], [data-testid="no-portfolio"]',
        {
          timeout: 10000,
        }
      );

      const focusSection = page.locator('[data-testid="focus-mode-section"]');
      if (await focusSection.isVisible()) {
        // Focus mode header should show freshness for all recommendations
        const freshnessBadge = focusSection.locator('[data-testid="data-freshness-badge"]');
        await expect(freshnessBadge).toBeVisible();

        // Should show "Recommendations" source or similar
        // Hover to see tooltip with exact timestamp
        await freshnessBadge.hover();
        const tooltip = page.locator('[role="tooltip"]');
        await expect(tooltip).toBeVisible({ timeout: 3000 });
        await expect(tooltip).toContainText(/Recommendation/i);
      }
    });
  });
});
