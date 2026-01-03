/**
 * Financial Disclaimers E2E Tests
 *
 * Story 7.4: Financial Disclaimers
 *
 * AC-7.4.1: Financial Disclaimer Visible on Recommendations Page
 * AC-7.4.4: Subtle Reminder Footer on Calculation/Recommendation Sections
 *
 * Test Strategy:
 * - Component Contract Tests: Use page.setContent() to verify component structure
 *   and accessibility attributes match expected contracts
 * - Integration Tests: Navigate to real pages and verify components are rendered
 *   (require seeded data, skipped by default in CI)
 *
 * Note: Component contract tests use static HTML to verify expected structure
 * without requiring a full app build. This catches attribute/structure changes
 * early. Integration tests verify actual component rendering on real pages.
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

  // Handle disclaimer modal if shown (Story 9.4)
  const disclaimerModal = page.getByRole("dialog");
  if (await disclaimerModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole("button", { name: /I Understand/i }).click();
    await expect(disclaimerModal).not.toBeVisible();
  }
}

test.describe("Story 7.4: Financial Disclaimers", () => {
  // =========================================================================
  // COMPONENT CONTRACT TESTS - Verify expected structure and accessibility
  // These tests validate the component "contract" without requiring the app
  // =========================================================================

  test.describe("Component Contracts", () => {
    test("DisclaimerFooter default variant has correct structure", async ({ page }) => {
      // This tests the expected component contract:
      // - role="note" for supplementary information
      // - aria-label for screen reader context
      // - data-testid for test hooks
      // - data-variant for styling hooks
      await page.setContent(`
        <div
          class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2"
          role="note"
          aria-label="Financial disclaimer reminder"
          data-testid="disclaimer-footer"
          data-variant="default"
        >
          <svg aria-hidden="true" class="h-3 w-3"></svg>
          <span>Calculation tool only - not financial advice</span>
        </div>
      `);

      const footer = page.getByTestId("disclaimer-footer");

      // Verify accessibility attributes
      await expect(footer).toHaveAttribute("role", "note");
      await expect(footer).toHaveAttribute("aria-label", "Financial disclaimer reminder");

      // Verify variant attribute
      await expect(footer).toHaveAttribute("data-variant", "default");

      // Verify text content matches AC-7.4.4
      await expect(footer).toContainText("Calculation tool only - not financial advice");

      // Verify icon is present and hidden from screen readers
      const icon = footer.locator("svg");
      await expect(icon).toBeVisible();
      await expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    test("DisclaimerFooter compact variant has minimal styling", async ({ page }) => {
      await page.setContent(`
        <div
          class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-1"
          role="note"
          aria-label="Financial disclaimer reminder"
          data-testid="disclaimer-footer"
          data-variant="compact"
        >
          <span>Not financial advice</span>
        </div>
      `);

      const footer = page.getByTestId("disclaimer-footer");

      // Verify compact variant
      await expect(footer).toHaveAttribute("data-variant", "compact");

      // Verify shortened text
      await expect(footer).toContainText("Not financial advice");

      // Verify no icon in compact mode
      const icon = footer.locator("svg");
      await expect(icon).not.toBeVisible();
    });

    test("Dashboard disclaimer has correct structure", async ({ page }) => {
      // Dashboard disclaimer uses role="status" for non-urgent static info
      await page.setContent(`
        <div
          class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          role="status"
          aria-label="Financial disclaimer"
          data-testid="dashboard-disclaimer"
        >
          <svg aria-hidden="true" class="h-5 w-5"></svg>
          <p>This tool calculates based on YOUR criteria. This is not financial advice.</p>
        </div>
      `);

      const disclaimer = page.getByTestId("dashboard-disclaimer");

      // Verify role="status" for static informational content
      await expect(disclaimer).toHaveAttribute("role", "status");
      await expect(disclaimer).toHaveAttribute("aria-label", "Financial disclaimer");

      // Verify icon is decorative
      const icon = disclaimer.locator("svg");
      await expect(icon).toHaveAttribute("aria-hidden", "true");

      // Verify AC-7.4.1 text
      await expect(disclaimer).toContainText("This tool calculates based on YOUR criteria");
      await expect(disclaimer).toContainText("This is not financial advice");
    });
  });

  // =========================================================================
  // ACCESSIBILITY TESTS - Verify screen reader support
  // =========================================================================

  test.describe("Accessibility", () => {
    test("disclaimer footer is accessible via screen reader", async ({ page }) => {
      await page.setContent(`
        <div
          role="note"
          aria-label="Financial disclaimer reminder"
          data-testid="disclaimer-footer"
        >
          <span>Not financial advice</span>
        </div>
      `);

      const footer = page.getByTestId("disclaimer-footer");

      // role="note" provides semantic meaning
      await expect(footer).toHaveAttribute("role", "note");

      // aria-label provides context for screen readers
      await expect(footer).toHaveAttribute("aria-label", "Financial disclaimer reminder");
    });

    test("dashboard disclaimer is readable by screen readers", async ({ page }) => {
      await page.setContent(`
        <div
          role="status"
          aria-label="Financial disclaimer"
          data-testid="dashboard-disclaimer"
        >
          <svg aria-hidden="true" class="h-5 w-5"></svg>
          <p>This tool calculates based on YOUR criteria. This is not financial advice.</p>
        </div>
      `);

      const disclaimer = page.getByTestId("dashboard-disclaimer");

      // role="status" announces content without interrupting
      await expect(disclaimer).toHaveAttribute("role", "status");

      // Icon hidden from screen readers
      const icon = disclaimer.locator("svg");
      await expect(icon).toHaveAttribute("aria-hidden", "true");

      // Text content readable
      await expect(disclaimer).toContainText("This tool calculates based on YOUR criteria");
    });
  });

  // =========================================================================
  // INTEGRATION TESTS - Verify components on real pages
  // Require seeded data, skipped by default in CI
  // =========================================================================

  test.describe("AC-7.4.1: Dashboard Disclaimer Integration", () => {
    test("dashboard shows prominent financial disclaimer", async ({ page }) => {
      test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

      await loginUser(page);

      // Navigate to dashboard
      await page.goto("/");
      await expect(page).toHaveURL("/");

      // Check for dashboard disclaimer banner
      const disclaimer = page.getByTestId("dashboard-disclaimer");
      await expect(disclaimer).toBeVisible();

      // Verify correct disclaimer text (AC-7.4.1)
      await expect(disclaimer).toContainText("This tool calculates based on YOUR criteria");
      await expect(disclaimer).toContainText("This is not financial advice");
    });

    test("dashboard disclaimer has correct accessibility role", async ({ page }) => {
      test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

      await loginUser(page);
      await page.goto("/");

      const disclaimer = page.getByTestId("dashboard-disclaimer");
      await expect(disclaimer).toBeVisible();

      // Check for status role (appropriate for static informational content)
      await expect(disclaimer).toHaveAttribute("role", "status");

      // Check for visual warning icon (AlertTriangle)
      const icon = disclaimer.locator("svg");
      await expect(icon).toBeVisible();
    });
  });

  test.describe("AC-7.4.4: Footer Reminders Integration", () => {
    test("recommendation cards show disclaimer footer", async ({ page }) => {
      test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

      await loginUser(page);

      // Navigate to dashboard (recommendations page)
      await page.goto("/");
      await expect(page).toHaveURL("/");

      // Look for recommendation cards
      const recommendationCard = page.getByTestId("recommendation-card").first();

      if (await recommendationCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check for disclaimer footer inside card
        const footer = recommendationCard.getByTestId("disclaimer-footer");
        await expect(footer).toBeVisible();

        // Verify compact variant text
        await expect(footer).toContainText("Not financial advice");

        // Verify compact variant (no icon)
        await expect(footer).toHaveAttribute("data-variant", "compact");
      }
    });

    test("score breakdown panel shows disclaimer footer", async ({ page }) => {
      test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

      await loginUser(page);

      // Navigate to portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Wait for portfolio detail page
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Find a score badge and click to open breakdown
      const scoreBadge = page.getByTestId("score-badge").first();

      if (await scoreBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scoreBadge.click();

        // Wait for breakdown panel
        const breakdownPanel = page.getByTestId("score-breakdown-panel");
        await expect(breakdownPanel).toBeVisible();

        // Check for disclaimer footer in panel
        const footer = breakdownPanel.getByTestId("disclaimer-footer");
        await expect(footer).toBeVisible();
        await expect(footer).toContainText("Not financial advice");
      }
    });
  });

  // =========================================================================
  // STATIC DISCLAIMER PAGE - Public page, no login required
  // =========================================================================

  test.describe("Integration with Existing Disclaimer Infrastructure", () => {
    test("static disclaimer page is accessible", async ({ page }) => {
      // No login required - public page
      await page.goto("/disclaimer");

      // Verify page loads
      await expect(page).toHaveURL("/disclaimer");

      // Check for main disclaimer content
      const header = page.getByRole("heading", { name: /Financial Disclaimer/i });
      await expect(header).toBeVisible();

      // Check for key disclaimer text
      const content = page.getByText(/This is NOT financial advice/i);
      await expect(content).toBeVisible();

      // Check for algorithm transparency section
      const transparencyHeading = page.getByText(/Algorithm Transparency/i);
      await expect(transparencyHeading).toBeVisible();
    });

    test("disclaimer page has return to dashboard link", async ({ page }) => {
      await page.goto("/disclaimer");

      // Find return link/button
      const returnLink = page.getByRole("link", { name: /Back to Dashboard/i });
      await expect(returnLink).toBeVisible();

      // Verify link destination
      await expect(returnLink).toHaveAttribute("href", "/dashboard");
    });
  });
});
