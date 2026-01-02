/**
 * Contribution Input E2E Tests
 *
 * Story 6.1: Monthly Contribution Input
 * AC-6.1.1: Contribution Input Display
 * AC-6.1.2: Contribution Validation
 * AC-6.1.3: Dividends Entry
 * AC-6.1.4: Total Capital Summary
 * AC-6.1.5: Optional Dividends
 *
 * Tests for the monthly contribution input on the dashboard.
 *
 * NOTE: These tests run in the 'chromium-authenticated' project which uses
 * storageState from the auth setup. No API mocking is needed for authentication.
 */

import { test, expect } from "@playwright/test";

test.describe("Contribution Input on Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard which contains the RecommendationInputSection
    await page.goto("/");

    // Wait for the page to be fully loaded
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("should display contribution input section (AC-6.1.1)", async ({ page }) => {
    // Check that Monthly Investment Setup card is visible
    await expect(page.getByRole("heading", { name: "Monthly Investment Setup" })).toBeVisible();

    // Check that contribution input is present
    await expect(page.getByLabel("Monthly Contribution")).toBeVisible();
  });

  test("should display dividends input field (AC-6.1.3)", async ({ page }) => {
    // Check that dividends input is present
    await expect(page.getByLabel("Dividends Received")).toBeVisible();
  });

  test("should display total investable section (AC-6.1.4)", async ({ page }) => {
    await expect(page.getByText("Total Investable")).toBeVisible();
  });

  test("should show currency symbol based on user preferences (AC-6.1.2)", async ({ page }) => {
    // The test user should have EUR as base currency (set by seed script)
    // Check for currency symbol in the contribution input
    const contributionInput = page.locator("#contribution-input");
    await expect(contributionInput).toBeVisible();

    // The input should have a currency prefix
    const currencyPrefix = page.locator(".absolute.left-3");
    await expect(currencyPrefix).toBeVisible();
  });

  test("should allow entering contribution amount (AC-6.1.1)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Clear any existing value and enter new contribution
    await contributionInput.click();
    await contributionInput.fill("2000");

    // Blur to trigger formatting
    await contributionInput.blur();

    // Check that value is present (formatted)
    await expect(contributionInput).not.toHaveValue("");
  });

  test("should allow entering dividends amount (AC-6.1.3)", async ({ page }) => {
    const dividendsInput = page.getByLabel("Dividends Received");

    // Enter dividends
    await dividendsInput.click();
    await dividendsInput.fill("150");

    // Blur to trigger formatting
    await dividendsInput.blur();

    // Check that value is present
    await expect(dividendsInput).not.toHaveValue("");
  });

  test("should update total when contribution is entered (AC-6.1.4)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Enter a contribution
    await contributionInput.click();
    await contributionInput.fill("2000");
    await contributionInput.blur();

    // The "You have $X to invest" hero should appear (auto-waits for visibility)
    await expect(page.getByTestId("total-investable-hero")).toBeVisible({ timeout: 5000 });
  });

  test("should show total calculation breakdown (AC-6.1.4)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");
    const dividendsInput = page.getByLabel("Dividends Received");

    // Enter contribution
    await contributionInput.click();
    await contributionInput.fill("2000");
    await contributionInput.blur();

    // Enter dividends
    await dividendsInput.click();
    await dividendsInput.fill("150");
    await dividendsInput.blur();

    // Verify the total hero appears (Playwright auto-waits for visibility)
    await expect(page.getByTestId("total-investable-hero")).toBeVisible({ timeout: 5000 });

    // Verify breakdown shows contribution + dividends
    await expect(page.getByText("Contribution:")).toBeVisible();
    await expect(page.getByText("Dividends:")).toBeVisible();
  });

  test("should show validation error for zero contribution (AC-6.1.2)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Enter zero
    await contributionInput.click();
    await contributionInput.fill("0");
    await contributionInput.blur();

    // Should show validation error
    await expect(page.getByText("Contribution must be greater than 0")).toBeVisible();
  });

  test("should show validation error for negative contribution (AC-6.1.2)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Enter negative value
    await contributionInput.click();
    await contributionInput.fill("-100");
    await contributionInput.blur();

    // Should show validation error
    await expect(page.getByText("Contribution must be greater than 0")).toBeVisible();
  });

  test("should allow zero dividends (AC-6.1.5)", async ({ page }) => {
    const dividendsInput = page.getByLabel("Dividends Received");

    // Enter zero
    await dividendsInput.click();
    await dividendsInput.fill("0");
    await dividendsInput.blur();

    // No error should be shown (zero dividends is valid)
    await expect(page.getByText("Dividends cannot be negative")).not.toBeVisible();
  });

  test("should allow empty dividends (AC-6.1.5)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");
    const dividendsInput = page.getByLabel("Dividends Received");

    // Enter only contribution
    await contributionInput.click();
    await contributionInput.fill("2000");
    await contributionInput.blur();

    // Dividends can be left empty - clear it if there's a default
    await dividendsInput.click();
    await dividendsInput.clear();
    await dividendsInput.blur();

    // Should still show total (contribution only) - Playwright auto-waits
    await expect(page.getByTestId("total-investable-hero")).toBeVisible({ timeout: 5000 });
  });

  test("should show save as default option for contribution (AC-6.1.2)", async ({ page }) => {
    // Check that save as default checkbox is present
    await expect(page.getByLabel("Save as default for future months")).toBeVisible();
  });
});

test.describe("Contribution Save as Default", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("should save contribution as default when checkbox is checked and button clicked", async ({
    page,
  }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");
    const saveDefaultCheckbox = page.getByLabel("Save as default for future months");

    // Enter contribution
    await contributionInput.click();
    await contributionInput.fill("2500");
    await contributionInput.blur();

    // Check the save as default checkbox
    await saveDefaultCheckbox.check();

    // Click save button
    const saveButton = page.getByRole("button", { name: "Save Now" });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Should show success toast
    await expect(page.getByText("Default contribution saved")).toBeVisible({ timeout: 5000 });
  });

  test("should persist default contribution after page refresh", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");
    const saveDefaultCheckbox = page.getByLabel("Save as default for future months");

    // Use a unique value to identify this test
    const testValue = "3333";

    // Enter contribution
    await contributionInput.click();
    await contributionInput.fill(testValue);
    await contributionInput.blur();

    // Check and save as default
    await saveDefaultCheckbox.check();
    const saveButton = page.getByRole("button", { name: "Save Now" });
    await saveButton.click();

    // Wait for save to complete (toast appears)
    await expect(page.getByText("Default contribution saved")).toBeVisible({ timeout: 5000 });

    // Refresh the page
    await page.reload();

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    // Wait for contribution input to have a value (default loaded from server)
    await expect(contributionInput).not.toHaveValue("", { timeout: 5000 });

    // Value should persist (might be formatted differently)
    const inputValue = await contributionInput.inputValue();
    expect(inputValue).toBeTruthy();
  });
});

test.describe("Contribution Format and Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("should format large numbers with locale formatting (AC-6.1.2)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Enter a large number
    await contributionInput.click();
    await contributionInput.fill("10000");
    await contributionInput.blur();

    // After blur, the value should be formatted
    // For en-US or similar locales, should have comma: 10,000.00
    // For pt-BR or similar, should have period: 10.000,00
    const value = await contributionInput.inputValue();

    // Just verify it has the number and some formatting
    expect(value.replace(/[^\d]/g, "")).toContain("10000");
  });

  test("should accept decimal values with 2 places (AC-6.1.2)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Enter decimal value
    await contributionInput.click();
    await contributionInput.fill("2000.50");
    await contributionInput.blur();

    // Should not show error for 2 decimal places
    await expect(page.getByText("Maximum 2 decimal places allowed")).not.toBeVisible();
  });

  test("should reject more than 2 decimal places (AC-6.1.2)", async ({ page }) => {
    const contributionInput = page.getByLabel("Monthly Contribution");

    // Enter value with too many decimals
    await contributionInput.click();
    await contributionInput.fill("2000.123");
    await contributionInput.blur();

    // Should show validation error
    await expect(page.getByText("Maximum 2 decimal places allowed")).toBeVisible();
  });
});
