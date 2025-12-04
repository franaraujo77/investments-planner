/**
 * Settings Page E2E Tests
 *
 * Story 2.6: Profile Settings & Base Currency
 *
 * Tests for settings page and profile management flows.
 *
 * AC-2.6.1: Settings page shows name and base currency fields
 * AC-2.6.2: Currency dropdown with 8 options
 * AC-2.6.4: Auto-save with success indicator
 * AC-2.6.5: Name field max 100 characters
 */

import { test, expect } from "@playwright/test";

/**
 * Helper to mock authenticated state
 */
async function mockAuthenticatedUser(page: ReturnType<typeof test.extend>) {
  // Mock the profile API to return test user data
  await page.route("**/api/user/profile", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            baseCurrency: "USD",
            emailVerified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    } else if (request.method() === "PATCH") {
      const body = await request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: body.name ?? "Test User",
            baseCurrency: body.baseCurrency ?? "USD",
            emailVerified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }
  });

  // Mock auth/me endpoint for verification gate
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          baseCurrency: "USD",
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });
}

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

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
    await expect(nameInput).toHaveValue("Test User");
  });

  test("should show character count for name field", async ({ page }) => {
    await page.goto("/settings");

    // Initial character count
    await expect(page.getByText("9/100")).toBeVisible(); // "Test User" = 9 chars

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

    // USD should be selected (default from mock)
    const currencyTrigger = page.getByRole("combobox", { name: "Base Currency" });
    await expect(currencyTrigger).toContainText("US Dollar (USD)");
  });
});

test.describe("Settings Auto-Save (AC-2.6.4)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("should show success indicator when name is updated", async ({ page }) => {
    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();
    await nameInput.fill("Updated Name");

    // Wait for debounced save to trigger
    await page.waitForTimeout(600); // 500ms debounce + buffer

    // Should show success indicator
    await expect(page.getByText("Saved")).toBeVisible();

    // Success indicator should fade after 2 seconds
    await page.waitForTimeout(2500);
    await expect(page.getByText("Saved")).not.toBeVisible();
  });

  test("should show saving indicator during API call", async ({ page }) => {
    // Mock slow API response
    await page.route("**/api/user/profile", async (route, request) => {
      if (request.method() === "PATCH") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "test-user-id",
              email: "test@example.com",
              name: "Updated Name",
              baseCurrency: "USD",
              emailVerified: true,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "test-user-id",
              email: "test@example.com",
              name: "Test User",
              baseCurrency: "USD",
              emailVerified: true,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    // Also mock auth endpoint
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            baseCurrency: "USD",
            emailVerified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();
    await nameInput.fill("Updated Name");

    // Should show "Saving..." indicator
    await expect(page.getByText("Saving...")).toBeVisible();

    // Wait for save to complete
    await expect(page.getByText("Saved")).toBeVisible();
  });

  test("should show success indicator when currency is changed", async ({ page }) => {
    await page.goto("/settings");

    const currencyTrigger = page.getByRole("combobox", { name: "Base Currency" });
    await currencyTrigger.click();

    // Select a different currency
    await page.getByRole("option", { name: "Euro (EUR)" }).click();

    // Should show success indicator (immediate, no debounce for select)
    await expect(page.getByText("Saved")).toBeVisible();
  });
});

test.describe("Settings Name Validation (AC-2.6.5)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

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
    // Mock failed save response
    await page.route("**/api/user/profile", async (route, request) => {
      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to save changes", code: "INTERNAL_ERROR" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "test-user-id",
              email: "test@example.com",
              name: "Test User",
              baseCurrency: "USD",
              emailVerified: true,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            baseCurrency: "USD",
            emailVerified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/settings");

    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();
    await nameInput.fill("Will Fail");

    // Wait for debounce
    await page.waitForTimeout(600);

    // Should show error toast
    await expect(page.getByText("Failed to save changes")).toBeVisible();
  });
});

test.describe("Settings Persistence", () => {
  test("should persist changes after page refresh", async ({ page }) => {
    let savedName = "Test User";
    let savedCurrency = "USD";

    // Mock API that tracks state
    await page.route("**/api/user/profile", async (route, request) => {
      if (request.method() === "PATCH") {
        const body = await request.postDataJSON();
        if (body.name !== undefined) savedName = body.name;
        if (body.baseCurrency !== undefined) savedCurrency = body.baseCurrency;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "test-user-id",
              email: "test@example.com",
              name: savedName,
              baseCurrency: savedCurrency,
              emailVerified: true,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "test-user-id",
              email: "test@example.com",
              name: savedName,
              baseCurrency: savedCurrency,
              emailVerified: true,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: savedName,
            baseCurrency: savedCurrency,
            emailVerified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/settings");

    // Update name
    const nameInput = page.getByLabel("Display Name");
    await nameInput.clear();
    await nameInput.fill("Persistent Name");

    // Wait for save
    await page.waitForTimeout(600);
    await expect(page.getByText("Saved")).toBeVisible();

    // Refresh page
    await page.reload();

    // Name should persist
    await expect(page.getByLabel("Display Name")).toHaveValue("Persistent Name");
  });
});

test.describe("Settings Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("should be accessible from sidebar", async ({ page }) => {
    await page.goto("/");

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
