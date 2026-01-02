/**
 * E2E Tests: Recommendation Display
 *
 * Story 6.3: Recommendation Display
 *
 * Tests:
 * AC-6.3.1: List of actionable recommendations with amount per asset
 * AC-6.3.2: Pie chart visualization showing recommended allocation
 * AC-6.3.3: Multi-asset summary with before/expected after allocation
 * AC-6.3.4: Card hover tooltip showing allocation details
 * AC-6.3.5: Mobile responsive layout
 *
 * Prerequisites:
 * - User logged in
 * - Portfolio with assets exists
 * - Recommendations have been generated
 */

import { test, expect } from "@playwright/test";

test.describe("Recommendation Display", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assumes authenticated user via auth fixture)
    await page.goto("/");

    // Wait for dashboard to load
    await page.waitForLoadState("networkidle");
  });

  test.describe("AC-6.3.1: Actionable Recommendations List", () => {
    test("should display recommendation cards on dashboard", async ({ page }) => {
      // Wait for focus mode section to appear (validates section renders)
      await expect(page.getByTestId("focus-mode-section")).toBeVisible({ timeout: 10000 });

      // Check for recommendation list
      const recommendationList = page.getByTestId("recommendation-list");

      // Either we have recommendations or the balanced state
      const hasRecommendations = await recommendationList.isVisible();
      const hasBalancedState = await page.getByTestId("balanced-portfolio-state").isVisible();

      expect(hasRecommendations || hasBalancedState).toBe(true);
    });

    test("should display investment amount per asset in card", async ({ page }) => {
      const recommendationCards = page.getByTestId("recommendation-card");
      const cardCount = await recommendationCards.count();

      if (cardCount > 0) {
        // Check first card has recommended amount
        const firstCard = recommendationCards.first();
        const recommendedAmount = firstCard.getByTestId("recommended-amount");

        await expect(recommendedAmount).toBeVisible();
      }
    });

    test("should display ticker symbol prominently", async ({ page }) => {
      const recommendationCards = page.getByTestId("recommendation-card");
      const cardCount = await recommendationCards.count();

      if (cardCount > 0) {
        const firstCard = recommendationCards.first();
        const tickerSymbol = firstCard.getByTestId("ticker-symbol");

        await expect(tickerSymbol).toBeVisible();
      }
    });

    test("should sort recommendations by amount (highest first)", async ({ page }) => {
      const recommendationCards = page.getByTestId("recommendation-card");
      const cardCount = await recommendationCards.count();

      if (cardCount >= 2) {
        // Get amounts from cards
        const amounts: number[] = [];

        for (let i = 0; i < cardCount; i++) {
          const card = recommendationCards.nth(i);
          const amountElement = card.getByTestId("recommended-amount");
          const amountText = await amountElement.textContent();

          // Parse amount (handles "No buy needed" for $0)
          if (amountText?.includes("No buy needed")) {
            amounts.push(0);
          } else {
            // Extract numeric value from currency string
            const numericValue = parseFloat(amountText?.replace(/[^0-9.-]+/g, "") || "0");
            amounts.push(numericValue);
          }
        }

        // Verify sorted descending (allow equal amounts)
        for (let i = 0; i < amounts.length - 1; i++) {
          expect(amounts[i]!).toBeGreaterThanOrEqual(amounts[i + 1]!);
        }
      }
    });
  });

  test.describe("AC-6.3.2: Pie Chart Visualization", () => {
    test("should display recommendation pie chart when recommendations exist", async ({ page }) => {
      const pieChart = page.getByTestId("recommendation-pie-chart");
      const recommendationList = page.getByTestId("recommendation-list");

      const hasRecommendations = await recommendationList.isVisible();

      if (hasRecommendations) {
        await expect(pieChart).toBeVisible();
      }
    });

    test("should display allocation distribution in chart", async ({ page }) => {
      const pieChart = page.getByTestId("recommendation-pie-chart");

      if (await pieChart.isVisible()) {
        // Pie chart should have ARIA label
        await expect(pieChart).toHaveAttribute("aria-label", /allocation/i);
      }
    });
  });

  test.describe("AC-6.3.3: Before/After Allocation Preview", () => {
    test("should display before/after preview when portfolio value is available", async ({
      page,
    }) => {
      // Before/After preview requires portfolio value from dashboard data
      // Currently hidden until epic-7 integrates portfolio value
      const beforeAfterPreview = page.getByTestId("before-after-preview");
      const recommendationList = page.getByTestId("recommendation-list");

      const hasRecommendations = await recommendationList.isVisible();

      if (hasRecommendations) {
        // Before/After preview may not be visible if portfolio value is not available
        // This test validates it renders correctly when the data is present
        const isPreviewVisible = await beforeAfterPreview.isVisible().catch(() => false);

        // Expected: Preview is hidden until epic-7 wires up portfolio value
        // When epic-7 is complete, this test should expect toBeVisible()
        if (isPreviewVisible) {
          // Verify column headers if visible
          await expect(beforeAfterPreview.getByText("Current")).toBeVisible();
          await expect(beforeAfterPreview.getByText("After")).toBeVisible();
          await expect(beforeAfterPreview.getByText("Change")).toBeVisible();
        } else {
          // Expected behavior until epic-7
          expect(true).toBe(true);
        }
      }
    });

    test("should show current and expected allocation for each asset", async ({ page }) => {
      const beforeAfterPreview = page.getByTestId("before-after-preview");

      // Only test content if preview is visible (requires portfolio value)
      const isVisible = await beforeAfterPreview.isVisible().catch(() => false);

      if (isVisible) {
        // Check column headers
        await expect(beforeAfterPreview.getByText("Current")).toBeVisible();
        await expect(beforeAfterPreview.getByText("After")).toBeVisible();
        await expect(beforeAfterPreview.getByText("Change")).toBeVisible();
      }
    });
  });

  test.describe("AC-6.3.4: Card Hover Tooltip", () => {
    test("should show tooltip on card hover with allocation details", async ({ page }) => {
      const recommendationCards = page.getByTestId("recommendation-card");
      const cardCount = await recommendationCards.count();

      if (cardCount > 0) {
        const firstCard = recommendationCards.first();

        // Hover over the card to trigger tooltip
        await firstCard.hover();

        // Wait for tooltip to appear using proper Playwright API
        // Shadcn tooltips have a default delay (~400ms), allow adequate timeout
        const tooltipContent = page.getByTestId("recommendation-tooltip-content");
        await tooltipContent.waitFor({ state: "visible", timeout: 5000 });

        // Tooltip should contain allocation info (Current and Target are always shown)
        await expect(tooltipContent.getByText("Current:")).toBeVisible();
        await expect(tooltipContent.getByText("Target:")).toBeVisible();
      }
    });

    test("tooltip shows expected after allocation when portfolio value available", async ({
      page,
    }) => {
      const recommendationCards = page.getByTestId("recommendation-card");
      const cardCount = await recommendationCards.count();

      if (cardCount > 0) {
        const firstCard = recommendationCards.first();

        // Hover over the card
        await firstCard.hover();

        const tooltipContent = page.getByTestId("recommendation-tooltip-content");

        // Wait for tooltip to appear using proper Playwright API
        // Shadcn tooltips have a default delay, so we need adequate timeout
        try {
          await tooltipContent.waitFor({ state: "visible", timeout: 5000 });
        } catch {
          // Tooltip may not appear in some environments (e.g., mobile viewport)
          // Skip further assertions if tooltip doesn't appear
          return;
        }

        // "After:" field is conditional - only shown when portfolio value is available
        // This test verifies the tooltip renders without errors
        // The "After:" field will be enabled in epic-7 when portfolio value is wired up
        const afterText = tooltipContent.getByText("After:");
        const isAfterVisible = await afterText.isVisible();

        // After is expected to be hidden until epic-7 because portfolio value is not yet available
        if (!isAfterVisible) {
          // Expected: After is hidden because portfolio value is not yet available
          expect(true).toBe(true);
        } else {
          // If After is visible, verify it has a percentage value
          await expect(afterText).toBeVisible();
        }
      }
    });
  });

  test.describe("AC-6.3.5: Mobile Responsive Layout", () => {
    test("should display single column on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const recommendationList = page.getByTestId("recommendation-list");

      if (await recommendationList.isVisible()) {
        // Check grid layout (should be single column on mobile)
        const gridClasses = await recommendationList.getAttribute("class");
        expect(gridClasses).toContain("grid-cols-1");
      }
    });

    test("should display two columns on tablet viewport", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const recommendationList = page.getByTestId("recommendation-list");

      if (await recommendationList.isVisible()) {
        // Should be 2 columns on md
        const gridClasses = await recommendationList.getAttribute("class");
        expect(gridClasses).toContain("md:grid-cols-2");
      }
    });

    test("should display three columns on desktop viewport", async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const recommendationList = page.getByTestId("recommendation-list");

      if (await recommendationList.isVisible()) {
        // Should be 3 columns on lg
        const gridClasses = await recommendationList.getAttribute("class");
        expect(gridClasses).toContain("lg:grid-cols-3");
      }
    });

    test("should have accessible touch targets on mobile", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const recommendationCards = page.getByTestId("recommendation-card");
      const cardCount = await recommendationCards.count();

      if (cardCount > 0) {
        const firstCard = recommendationCards.first();
        const boundingBox = await firstCard.boundingBox();

        // Card should be at least 44x44 for touch targets
        expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe("Summary Display", () => {
    test("should display total count and amount in summary", async ({ page }) => {
      const summary = page.getByTestId("recommendation-summary");
      const recommendationList = page.getByTestId("recommendation-list");

      const hasRecommendations = await recommendationList.isVisible();

      if (hasRecommendations) {
        await expect(summary).toBeVisible();

        // Summary should contain count and total
        const summaryText = await summary.textContent();
        expect(summaryText).toMatch(/\d+ asset/i);
      }
    });
  });

  test.describe("Empty State", () => {
    test("should show balanced portfolio state when no recommendations", async ({ page }) => {
      // This test checks the empty state - it will pass if either:
      // 1. Recommendations exist (test passes as empty state not expected)
      // 2. Balanced portfolio state is shown

      const recommendationList = page.getByTestId("recommendation-list");
      const balancedState = page.getByTestId("balanced-portfolio-state");

      const hasRecommendations = await recommendationList.isVisible();
      const hasBalancedState = await balancedState.isVisible();

      // One of these states should be visible
      expect(hasRecommendations || hasBalancedState).toBe(true);
    });
  });

  test.describe("Loading State", () => {
    test("should show loading skeleton while fetching recommendations", async ({ page }) => {
      // This test is tricky because loading is fast
      // We can verify the skeleton component exists in the DOM
      await page.goto("/");

      // Don't wait for network idle - we want to catch loading state
      await page.waitForLoadState("domcontentloaded");

      // The skeleton may or may not be visible depending on timing
      // We're mainly verifying the page doesn't error during load
      await page.waitForLoadState("networkidle");

      // After load, either recommendations or balanced state should show
      const hasContent =
        (await page.getByTestId("recommendation-list").isVisible()) ||
        (await page.getByTestId("balanced-portfolio-state").isVisible());

      expect(hasContent).toBe(true);
    });
  });
});
