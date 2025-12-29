/**
 * Settings Page E2E Tests
 *
 * Story 2.6: Profile Settings & Base Currency
 * Story 1.5: Regional Preferences and i18n Infrastructure
 *
 * Tests for settings page and profile management flows.
 *
 * AC-2.6.1: Settings page shows name and base currency fields
 * AC-2.6.2: Currency dropdown with 8 options
 * AC-2.6.4: Auto-save with success indicator
 * AC-2.6.5: Name field max 100 characters
 * AC-1.5.1: Locale selection on settings page
 * AC-1.5.5: Supported locales dropdown
 *
 * NOTE: These tests run in the 'chromium-authenticated' project which uses
 * storageState from the auth setup. No API mocking is needed for authentication.
 */

import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("should render settings page with profile form (AC-2.6.1)", async ({ page }) => {
    await page.goto("/settings");

    // Check page heading
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Manage your account and preferences")).toBeVisible();

    // Check profile section
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

    // Check preferences section
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  });

  test("should show name input field (AC-2.6.1)", async ({ page }) => {
    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    await expect(nameInput).toBeVisible();
    // Name should be set from the authenticated user
    await expect(nameInput).not.toHaveValue("");
  });

  test("should show character count for name field", async ({ page }) => {
    await page.goto("/settings");

    // Update name and check count updates
    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();
    await nameInput.fill("New Name");

    await expect(page.getByText("8/100")).toBeVisible();
  });

  test("should show base currency dropdown (AC-2.6.1, AC-2.6.2)", async ({ page }) => {
    await page.goto("/settings");

    const currencyTrigger = page.getByRole("combobox", { name: "Base Currency" });
    await expect(currencyTrigger).toBeVisible();

    // Click to open dropdown
    await currencyTrigger.click();

    // Verify all 8 currency options are present (AC-2.6.2)
    const currencies = [
      "US Dollar (USD)",
      "Euro (EUR)",
      "British Pound (GBP)",
      "Brazilian Real (BRL)",
      "Canadian Dollar (CAD)",
      "Australian Dollar (AUD)",
      "Japanese Yen (JPY)",
      "Swiss Franc (CHF)",
    ];

    for (const currency of currencies) {
      await expect(page.getByRole("option", { name: currency })).toBeVisible();
    }
  });

  test("should have current currency pre-selected (AC-2.6.2)", async ({ page }) => {
    await page.goto("/settings");

    // EUR should be selected (default for test user set by seed script)
    const currencyTrigger = page.getByRole("combobox", { name: "Base Currency" });
    await expect(currencyTrigger).toContainText("Euro (EUR)");
  });
});

test.describe("Settings Auto-Save (AC-2.6.4)", () => {
  test("should show success indicator when name is updated", async ({ page }) => {
    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    const originalValue = await nameInput.inputValue();

    await nameInput.clear();
    await nameInput.fill("Updated Test Name");

    // Wait for debounced save to trigger
    await page.waitForTimeout(600); // 500ms debounce + buffer

    // Should show success indicator
    await expect(page.getByText("Saved")).toBeVisible();

    // Restore original value
    await nameInput.clear();
    await nameInput.fill(originalValue || "E2E Test User");
    await page.waitForTimeout(600);
  });

  test("should show success indicator when currency is changed", async ({ page }) => {
    await page.goto("/settings");

    const currencyTrigger = page.getByRole("combobox", { name: "Base Currency" });
    await currencyTrigger.click();

    // Select a different currency (USD since default is EUR)
    await page.getByRole("option", { name: "US Dollar (USD)" }).click();

    // Should show success indicator (immediate, no debounce for select)
    await expect(page.getByText("Saved")).toBeVisible();

    // Restore to EUR (test user default)
    await currencyTrigger.click();
    await page.getByRole("option", { name: "Euro (EUR)" }).click();
  });
});

test.describe("Settings Name Validation (AC-2.6.5)", () => {
  test("should enforce max 100 character limit on name field", async ({ page }) => {
    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();

    // Try to type more than 100 characters
    const longName = "a".repeat(110);
    await nameInput.fill(longName);

    // Input should be limited to 100 characters (via maxLength attribute)
    await expect(nameInput).toHaveValue("a".repeat(100));
    await expect(page.getByText("100/100")).toBeVisible();
  });

  test("should accept exactly 100 characters", async ({ page }) => {
    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();

    const exactName = "b".repeat(100);
    await nameInput.fill(exactName);

    await expect(nameInput).toHaveValue(exactName);
    await expect(page.getByText("100/100")).toBeVisible();
  });
});

test.describe("Settings Error Handling", () => {
  test("should show error toast on save failure", async ({ page }) => {
    await page.goto("/settings");

    // Mock failed save response for client-side API call - set up after page load
    await page.route("**/api/user/profile", async (route, request) => {
      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to save changes", code: "INTERNAL_ERROR" }),
        });
      } else {
        await route.continue();
      }
    });

    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();
    await nameInput.fill("Will Fail");

    // Wait for debounce
    await page.waitForTimeout(600);

    // Should show error toast
    await expect(page.getByText("Failed to save changes")).toBeVisible();
  });
});

test.describe.serial("Settings Persistence", () => {
  test("should persist changes after page refresh", async ({ page }) => {
    await page.goto("/settings");

    // Get original name to restore later
    const nameInput = page.getByLabel("Display Name");
    const originalName = await nameInput.inputValue();

    // Use a unique name with timestamp to avoid conflicts with parallel tests
    const uniqueName = `Test User ${Date.now()}`;

    // Update name
    await nameInput.clear();
    await nameInput.fill(uniqueName);

    // Wait for debounce (500ms) + API call
    await page.waitForTimeout(600);

    // Check for "Saved" indicator with timeout (it might already be showing or appear shortly)
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });

    // Allow extra time for database operation to complete
    await page.waitForTimeout(500);

    // Refresh page
    await page.reload();

    // Name should persist
    await expect(page.getByLabel("Display Name")).toHaveValue(uniqueName, { timeout: 5000 });

    // Restore original name
    const restoredInput = page.getByLabel("Display Name");
    await restoredInput.clear();
    await restoredInput.fill(originalName || "E2E Test User");
    await page.waitForTimeout(600);
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Settings Navigation", () => {
  test("should be accessible from sidebar", async ({ page }) => {
    // Navigate to root (dashboard)
    await page.goto("/");

    // Wait for sidebar to be visible
    await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();

    // Click settings link in sidebar
    const settingsLink = page.getByRole("link", { name: "Settings" });
    await expect(settingsLink).toBeVisible();

    await settingsLink.click();
    await expect(page).toHaveURL("/settings");
  });

  test("should highlight settings link when on settings page", async ({ page }) => {
    await page.goto("/settings");

    // Check that Settings link has active styling
    const settingsLink = page.getByRole("link", { name: "Settings" });
    await expect(settingsLink).toHaveAttribute("aria-current", "page");
  });
});

/**
 * Story 1.5: Regional Preferences and i18n Infrastructure
 *
 * Tests for locale selection and number formatting.
 * Serial execution to avoid race conditions with shared user state.
 */
test.describe.serial("Settings Locale Selection (AC-1.5.1, AC-1.5.5)", () => {
  test("should show locale dropdown in preferences section (AC-1.5.1)", async ({ page }) => {
    await page.goto("/settings");

    const localeTrigger = page.getByRole("combobox", { name: "Language & Region" });
    await expect(localeTrigger).toBeVisible();
  });

  test("should show all 5 supported locales (AC-1.5.5)", async ({ page }) => {
    await page.goto("/settings");

    const localeTrigger = page.getByRole("combobox", { name: "Language & Region" });
    await localeTrigger.click();

    // Verify all 5 locale options are present (AC-1.5.5)
    const locales = [
      "English (US)",
      "Português (Brasil)",
      "Deutsch (Deutschland)",
      "Français (France)",
      "Español (España)",
    ];

    for (const locale of locales) {
      await expect(page.getByRole("option", { name: locale })).toBeVisible();
    }
  });

  test("should show success indicator when locale is changed", async ({ page }) => {
    await page.goto("/settings");

    const localeTrigger = page.getByRole("combobox", { name: "Language & Region" });

    // Get current locale to restore
    const currentLocale = await localeTrigger.textContent();

    await localeTrigger.click();

    // Select a different locale
    await page.getByRole("option", { name: "Português (Brasil)" }).click();

    // Should show success indicator (immediate, no debounce for select)
    await expect(page.getByText("Saved")).toBeVisible();

    // Restore original locale
    await localeTrigger.click();
    if (currentLocale?.includes("English")) {
      await page.getByRole("option", { name: "English (US)" }).click();
    }
  });

  test("should persist locale after page refresh", async ({ page }) => {
    await page.goto("/settings");

    const localeTrigger = page.getByRole("combobox", { name: "Language & Region" });

    // Use a unique locale that won't conflict with other parallel tests
    // Change to Français which is less likely to be used by other tests
    await localeTrigger.click();
    await page.getByRole("option", { name: "Français (France)" }).click();

    // Wait for save indicator to appear AND disappear (confirms save completed)
    await expect(page.getByText("Saved")).toBeVisible();
    // Allow extra time for database operation to fully complete
    await page.waitForTimeout(1000);

    // Refresh page
    await page.reload();

    // Wait for page to fully load
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Locale should persist (allow time for component to render)
    await expect(page.getByRole("combobox", { name: "Language & Region" })).toContainText(
      "Français (France)",
      { timeout: 5000 }
    );

    // Restore to English for seed script consistency
    const restoreTrigger = page.getByRole("combobox", { name: "Language & Region" });
    await restoreTrigger.click();
    await page.getByRole("option", { name: "English (US)" }).click();
    // Wait for restore to complete
    await expect(page.getByText("Saved")).toBeVisible();
  });
});
