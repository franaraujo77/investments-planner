/**
 * Logout E2E Tests
 *
 * Story 2.4: User Logout
 *
 * Tests for logout button visibility, click behavior, and session termination.
 *
 * AC-2.4.1: Logout Action and Redirect
 * AC-2.4.2: JWT Cookie Cleared
 * AC-2.4.3: Refresh Token Invalidated
 * AC-2.4.4: No Confirmation Required
 */

import { test, expect } from "@playwright/test";

/**
 * Helper function to mock successful login and set auth state
 */
async function mockAuthenticatedState(page: import("@playwright/test").Page) {
  // Mock the middleware check for authenticated user
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

test.describe("Logout Button Visibility", () => {
  test("should display logout button in sidebar when logged in", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Navigate to dashboard
    await page.goto("/");

    // Look for logout button in sidebar
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await expect(logoutButton).toBeVisible();
  });

  test("should show LogOut icon in sidebar footer", async ({ page }) => {
    await mockAuthenticatedState(page);
    await page.goto("/");

    // The logout button should be visible in the sidebar
    // Note: The icon has aria-hidden, so we look for the button element
    const sidebarFooter = page.locator('[data-slot="sidebar-footer"]');
    await expect(sidebarFooter).toBeVisible();

    // Logout button should be inside the footer
    const logoutInFooter = sidebarFooter.getByRole("button");
    await expect(logoutInFooter.first()).toBeVisible();
  });
});

test.describe("Logout Flow (AC-2.4.1)", () => {
  test("should redirect to login page after clicking logout", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    // Find and click logout button
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Should redirect to login page
    await expect(page).toHaveURL("/login", { timeout: 5000 });
  });

  test("should show success toast after logout", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    // Click logout button
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Check for success toast
    await expect(page.getByText("You have been logged out")).toBeVisible({ timeout: 3000 });
  });

  test("should show loading state while logging out", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock slow logout API
    await page.route("**/api/auth/logout", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    // Click logout button
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Should show loading spinner (the button should be disabled during loading)
    // The Loader2 icon with animate-spin class indicates loading
    await expect(page.locator("svg.animate-spin")).toBeVisible({ timeout: 1000 });
  });
});

test.describe("No Confirmation Required (AC-2.4.4)", () => {
  test("should logout immediately without confirmation dialog", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    // Click logout button
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Should NOT show any confirmation dialog
    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).not.toBeVisible();

    // Should redirect directly
    await expect(page).toHaveURL("/login", { timeout: 5000 });
  });

  test("should not show 'Are you sure?' modal", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    // Click logout button
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Verify no confirmation text appears
    await expect(page.getByText("Are you sure")).not.toBeVisible();
    await expect(page.getByText("Confirm")).not.toBeVisible();
    await expect(page.getByText("Cancel")).not.toBeVisible();
  });
});

test.describe("Session Termination (AC-2.4.2, AC-2.4.3)", () => {
  test("should call logout API endpoint", async ({ page }) => {
    await mockAuthenticatedState(page);

    let logoutCalled = false;

    // Track logout API call
    await page.route("**/api/auth/logout", async (route) => {
      logoutCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Wait for redirect to complete
    await expect(page).toHaveURL("/login", { timeout: 5000 });

    // Verify logout API was called
    expect(logoutCalled).toBe(true);
  });

  test("should not be able to access dashboard after logout", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    // Click logout
    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Wait for redirect to login
    await expect(page).toHaveURL("/login", { timeout: 5000 });

    // Now remove the auth mock so middleware blocks access
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not authenticated" }),
      });
    });

    // Try to access dashboard directly
    await page.goto("/");

    // Should be redirected to login (middleware protection)
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Error Handling", () => {
  test("should still redirect to login on API error", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API error
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/");

    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Should still redirect to login even on error
    await expect(page).toHaveURL("/login", { timeout: 5000 });
  });

  test("should show error toast on API failure", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock logout API error
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/");

    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Should show error toast
    await expect(
      page.getByText(/logout encountered an error|you have been signed out/i)
    ).toBeVisible({ timeout: 3000 });
  });

  test("should handle network failure gracefully", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock network failure
    await page.route("**/api/auth/logout", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/");

    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Should still redirect to login
    await expect(page).toHaveURL("/login", { timeout: 5000 });
  });
});

test.describe("Button State During Logout", () => {
  test("should disable logout button during API call", async ({ page }) => {
    await mockAuthenticatedState(page);

    // Mock slow logout API
    await page.route("**/api/auth/logout", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    const logoutButton = page.getByRole("button", { name: /logout/i });
    await logoutButton.click();

    // Button should be disabled during loading
    await expect(logoutButton).toBeDisabled();
  });

  test("should prevent double-click during logout", async ({ page }) => {
    await mockAuthenticatedState(page);

    let logoutCallCount = 0;

    // Track logout API calls
    await page.route("**/api/auth/logout", async (route) => {
      logoutCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");

    const logoutButton = page.getByRole("button", { name: /logout/i });

    // Try to click twice quickly
    await logoutButton.click();
    await logoutButton.click();

    // Wait for redirect
    await expect(page).toHaveURL("/login", { timeout: 5000 });

    // Should only have made one API call
    expect(logoutCallCount).toBe(1);
  });
});
