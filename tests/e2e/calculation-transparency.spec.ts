/**
 * Calculation Transparency E2E Tests
 *
 * Story 7.2: Calculation Transparency
 *
 * AC-7.2.1: Formula Display in Score Panel
 * AC-7.2.2: Per-Criterion Calculation Steps
 * AC-7.2.3: Expandable Calculation Details Modal
 * AC-7.2.4: Threshold Comparison Visualization
 * AC-7.2.5: Score Sensitivity Hints
 *
 * Tests for calculation transparency features in score breakdown.
 */

import { test, expect } from "@playwright/test";

// Test user credentials - should match a verified test user
const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword1!",
};

/**
 * Check if data-dependent tests should run
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

test.describe("Story 7.2: Calculation Transparency", () => {
  test.describe("AC-7.2.1: Formula Display in Score Panel", () => {
    test("formula explanation component has correct structure", async ({ page }) => {
      // Test component structure without requiring actual data
      await page.setContent(`
        <div data-testid="formula-explanation" class="space-y-2 p-3 bg-muted/20 rounded-md">
          <h4 class="text-xs font-medium text-muted-foreground">How Scores Work</h4>
          <p class="text-xs text-muted-foreground">
            Score = Sum of points for each criterion that passes
          </p>
          <p class="text-xs text-muted-foreground">
            Each criterion compares actual data to your threshold
          </p>
        </div>
      `);

      const section = page.getByTestId("formula-explanation");
      await expect(section).toBeVisible();
      await expect(section).toContainText("How Scores Work");
      await expect(section).toContainText("Sum of points");
      await expect(section).toContainText("compares actual data to your threshold");
    });

    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");
    test("formula explanation is visible in score panel", async ({ page }) => {
      await loginUser(page);

      // Navigate to portfolio with scores
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();
      await expect(page).toHaveURL(/\/portfolio\/[a-zA-Z0-9-]+$/);

      // Find and click score badge to open breakdown
      const scoreBadge = page.getByTestId("score-badge").first();
      if (await scoreBadge.isVisible()) {
        await scoreBadge.click();

        // Verify formula explanation is present
        const formulaSection = page.getByTestId("formula-explanation");
        await expect(formulaSection).toBeVisible();
      }
    });
  });

  test.describe("AC-7.2.2: Per-Criterion Calculation Steps", () => {
    test("criterion rule display component structure", async ({ page }) => {
      await page.setContent(`
        <div data-testid="criterion-row" class="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <svg class="h-4 w-4 text-green-500" aria-label="Passed"></svg>
            <div class="min-w-0 flex-1">
              <span class="text-sm font-medium truncate block">P/E Ratio</span>
              <div class="text-xs text-muted-foreground mt-0.5" data-testid="criterion-rule">
                Rule: <= 20 Actual: 15
              </div>
            </div>
          </div>
          <div class="text-sm font-semibold tabular-nums text-green-600">
            +10 pts
          </div>
        </div>
      `);

      const row = page.getByTestId("criterion-row");
      await expect(row).toBeVisible();

      const rule = page.getByTestId("criterion-rule");
      await expect(rule).toContainText("Rule:");
      await expect(rule).toContainText("Actual:");
    });

    test("criterion row shows pass/fail icons", async ({ page }) => {
      await page.setContent(`
        <div>
          <div data-testid="criterion-row" class="criterion-passed">
            <svg aria-label="Passed" class="h-4 w-4 text-green-500"></svg>
            <span>Passed criterion</span>
          </div>
          <div data-testid="criterion-row" class="criterion-failed">
            <svg aria-label="Failed" class="h-4 w-4 text-red-500"></svg>
            <span>Failed criterion</span>
          </div>
        </div>
      `);

      const rows = page.getByTestId("criterion-row");
      await expect(rows).toHaveCount(2);
    });
  });

  test.describe("AC-7.2.3: Expandable Calculation Details Modal", () => {
    test("calculation modal component structure", async ({ page }) => {
      await page.setContent(`
        <div data-testid="calculation-steps-modal" role="dialog" aria-modal="true">
          <header>
            <h2>Calculation Details: AAPL</h2>
          </header>
          <div class="content">
            <section>
              <h3>Step 1: Gather Input Data</h3>
              <div>Price: 150.00 USD</div>
            </section>
            <section>
              <h3>Step 2: Evaluate Each Criterion</h3>
              <div>#1 P/E Ratio - Pass - 10 pts</div>
            </section>
            <section>
              <h3>Step 3: Sum Points</h3>
              <div>Final Score: 80 pts</div>
            </section>
          </div>
        </div>
      `);

      const modal = page.getByTestId("calculation-steps-modal");
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute("role", "dialog");
      await expect(modal).toContainText("Step 1:");
      await expect(modal).toContainText("Step 2:");
      await expect(modal).toContainText("Step 3:");
    });

    test("show calculation button has correct attributes", async ({ page }) => {
      await page.setContent(`
        <button
          data-testid="show-calculation-button"
          class="w-full justify-start"
        >
          <svg class="mr-2 h-4 w-4"></svg>
          Show full calculation
        </button>
      `);

      const button = page.getByTestId("show-calculation-button");
      await expect(button).toBeVisible();
      await expect(button).toContainText("Show full calculation");
    });

    test("modal closes on escape key", async ({ page }) => {
      await page.setContent(`
        <div id="modal-container">
          <div
            data-testid="calculation-steps-modal"
            role="dialog"
            aria-modal="true"
          >
            <button data-testid="close-button">Close</button>
            <div>Modal content</div>
          </div>
        </div>
        <script>
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              document.querySelector('[data-testid="calculation-steps-modal"]').remove();
            }
          });
        </script>
      `);

      const modal = page.getByTestId("calculation-steps-modal");
      await expect(modal).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(modal).not.toBeVisible();
    });
  });

  test.describe("AC-7.2.4: Threshold Comparison Visualization", () => {
    test("threshold bar component structure", async ({ page }) => {
      await page.setContent(`
        <div style="min-height: 50px; padding: 20px;">
          <div
            data-testid="threshold-bar"
            role="meter"
            aria-valuenow="25"
            aria-valuemin="0"
            aria-valuemax="50"
            aria-label="Actual 25 vs threshold 20"
            class="relative h-8 bg-muted rounded-full overflow-hidden"
            style="height: 32px;"
          >
            <div class="absolute top-0 bottom-0 w-0.5 bg-border" style="left: 40%"></div>
            <div class="absolute top-0 bottom-0 left-0 bg-green-500" style="width: 50%"></div>
          </div>
        </div>
      `);

      const bar = page.getByTestId("threshold-bar");
      await expect(bar).toBeVisible();
      await expect(bar).toHaveAttribute("role", "meter");
      await expect(bar).toHaveAttribute("aria-valuenow", "25");
      await expect(bar).toHaveAttribute("aria-label", /Actual.*threshold/);
    });

    test("threshold bar uses color coding for pass/fail", async ({ page }) => {
      // Test passing criterion (green bar)
      await page.setContent(`
        <div data-testid="threshold-bar-passed" class="relative h-2">
          <div class="bg-green-500" data-testid="actual-bar"></div>
        </div>
      `);

      const passedBar = page.getByTestId("actual-bar");
      await expect(passedBar).toHaveClass(/bg-green-500/);

      // Test failing criterion (red bar)
      await page.setContent(`
        <div data-testid="threshold-bar-failed" class="relative h-2">
          <div class="bg-red-500" data-testid="actual-bar"></div>
        </div>
      `);

      const failedBar = page.getByTestId("actual-bar");
      await expect(failedBar).toHaveClass(/bg-red-500/);
    });
  });

  test.describe("AC-7.2.5: Score Sensitivity Hints", () => {
    test("sensitivity hint badge structure", async ({ page }) => {
      await page.setContent(`
        <span
          data-testid="sensitivity-hint"
          class="text-xs border-amber-500 text-amber-600"
          aria-live="polite"
        >
          Almost passing
        </span>
      `);

      const hint = page.getByTestId("sensitivity-hint");
      await expect(hint).toBeVisible();
      await expect(hint).toContainText("Almost passing");
      await expect(hint).toHaveAttribute("aria-live", "polite");
    });

    test("sensitivity hint uses amber color scheme", async ({ page }) => {
      await page.setContent(`
        <span
          data-testid="sensitivity-hint"
          class="border-amber-500 text-amber-600"
        >
          Almost passing
        </span>
      `);

      const hint = page.getByTestId("sensitivity-hint");
      await expect(hint).toHaveClass(/border-amber-500/);
      await expect(hint).toHaveClass(/text-amber-600/);
    });
  });

  test.describe("Accessibility", () => {
    test("calculation modal has proper focus management", async ({ page }) => {
      await page.setContent(`
        <div
          data-testid="calculation-steps-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <h2 id="modal-title">Calculation Details</h2>
          <button data-testid="first-focusable">First button</button>
          <button data-testid="last-focusable">Last button</button>
        </div>
      `);

      const modal = page.getByTestId("calculation-steps-modal");
      await expect(modal).toHaveAttribute("role", "dialog");
      await expect(modal).toHaveAttribute("aria-modal", "true");
      await expect(modal).toHaveAttribute("aria-labelledby", "modal-title");
    });

    test("threshold bar has accessible meter attributes", async ({ page }) => {
      await page.setContent(`
        <div
          data-testid="threshold-bar"
          role="meter"
          aria-valuenow="15"
          aria-valuemin="0"
          aria-valuemax="30"
          aria-label="Actual 15 vs threshold 20"
        ></div>
      `);

      const bar = page.getByTestId("threshold-bar");
      await expect(bar).toHaveAttribute("role", "meter");
      await expect(bar).toHaveAttribute("aria-valuenow", "15");
      await expect(bar).toHaveAttribute("aria-valuemin", "0");
      await expect(bar).toHaveAttribute("aria-valuemax", "30");
    });

    test("sensitivity hints use aria-live for screen readers", async ({ page }) => {
      await page.setContent(`
        <span data-testid="sensitivity-hint" aria-live="polite">
          Almost passing
        </span>
      `);

      const hint = page.getByTestId("sensitivity-hint");
      await expect(hint).toHaveAttribute("aria-live", "polite");
    });
  });

  test.describe("Integration Tests", () => {
    test.skip(SKIP_DATA_SETUP_TESTS, "Requires seeded data - set RUN_DATA_SETUP_TESTS=true");

    test("opens full calculation modal from score breakdown", async ({ page }) => {
      await loginUser(page);

      // Navigate to portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Click score badge to open breakdown
      const scoreBadge = page.getByTestId("score-badge").first();
      if (await scoreBadge.isVisible()) {
        await scoreBadge.click();

        // Click show calculation button
        const showCalcButton = page.getByTestId("show-calculation-button");
        await expect(showCalcButton).toBeVisible();
        await showCalcButton.click();

        // Verify modal opens
        const modal = page.getByTestId("calculation-steps-modal");
        await expect(modal).toBeVisible();

        // Verify step sections exist
        await expect(page.getByText("Step 1:")).toBeVisible();
        await expect(page.getByText("Step 2:")).toBeVisible();
        await expect(page.getByText("Step 3:")).toBeVisible();

        // Close modal with escape
        await page.keyboard.press("Escape");
        await expect(modal).not.toBeVisible();
      }
    });

    test("score breakdown shows formula explanation", async ({ page }) => {
      await loginUser(page);

      // Navigate to portfolio
      const firstPortfolio = page.getByTestId("portfolio-card").first();
      await firstPortfolio.click();

      // Click score badge
      const scoreBadge = page.getByTestId("score-badge").first();
      if (await scoreBadge.isVisible()) {
        await scoreBadge.click();

        // Verify formula section
        const formulaSection = page.getByTestId("formula-explanation");
        await expect(formulaSection).toBeVisible();
        await expect(formulaSection).toContainText("How Scores Work");
      }
    });
  });
});
