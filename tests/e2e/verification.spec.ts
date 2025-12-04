/**
 * Email Verification E2E Tests
 *
 * Story 2.2: Email Verification
 * End-to-end tests for verification pages and flows.
 *
 * AC-2.2.1: Clicking valid link activates account and redirects to login with toast
 * AC-2.2.2: Verification link expires after 24 hours with error message
 * AC-2.2.3: Link is single-use; reuse returns error
 * AC-2.2.4: Unverified users redirect to verify-pending
 * AC-2.2.5: Resend verification available on login page
 */

import { test, expect } from "@playwright/test";

test.describe("Verification Page (/verify)", () => {
  test.describe("AC-2.2.1: Verification page layout", () => {
    test("should display verification page with loading state", async ({ page }) => {
      // Visit without token - should show error eventually
      await page.goto("/verify");

      // Should show branding
      await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();

      // Should show some form of verification UI
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    });

    test("should show invalid link error without token", async ({ page }) => {
      await page.goto("/verify");

      // Wait for verification to complete
      await page.waitForTimeout(1000);

      // Should show invalid error
      await expect(page.getByText(/invalid|no verification token/i)).toBeVisible();

      // Should have link to login
      await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
    });

    test("should show invalid link error with empty token", async ({ page }) => {
      await page.goto("/verify?token=");

      // Wait for verification to complete
      await page.waitForTimeout(1000);

      // Should show invalid error
      await expect(page.getByText(/invalid|no verification token/i)).toBeVisible();
    });
  });

  test.describe("AC-2.2.2 & AC-2.2.3: Error states", () => {
    test("should show expired link error UI elements", async ({ page }) => {
      // This tests the UI - actual API testing would need mock
      await page.goto("/verify?token=expired-test-token");

      // Wait for API call
      await page.waitForTimeout(1000);

      // The page should show some error state
      // (Exact message depends on API response)
      const errorOrInvalid = page.getByText(/expired|invalid|error/i);
      await expect(errorOrInvalid.first()).toBeVisible();

      // Should have resend option
      await expect(page.getByRole("link").filter({ hasText: /verification|login/i })).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to login from verify page", async ({ page }) => {
      await page.goto("/verify");

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Find and click login link
      const loginLink = page.getByRole("link", { name: /login/i }).first();
      await loginLink.click();

      await expect(page).toHaveURL(/login/);
    });
  });
});

test.describe("Verification Pending Page (/verify-pending)", () => {
  test.describe("AC-2.2.4 & AC-2.2.5: Page layout", () => {
    test("should display verify pending page with form", async ({ page }) => {
      await page.goto("/verify-pending");

      // Branding
      await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();

      // Page title
      await expect(page.getByRole("heading", { name: /verify.*email/i })).toBeVisible();

      // Email input (if no email in params)
      await expect(page.getByLabel(/email/i)).toBeVisible();

      // Resend button
      await expect(page.getByRole("button", { name: /send.*verification/i })).toBeVisible();
    });

    test("should display masked email from query params", async ({ page }) => {
      await page.goto("/verify-pending?email=test@example.com");

      // Should show masked email
      await expect(page.getByText(/t\*+@example\.com/)).toBeVisible();
    });

    test("should show helpful tips", async ({ page }) => {
      await page.goto("/verify-pending");

      // Should show tips about checking spam
      await expect(page.getByText(/spam|junk/i)).toBeVisible();
    });
  });

  test.describe("AC-2.2.5: Resend functionality", () => {
    test("should have resend button", async ({ page }) => {
      await page.goto("/verify-pending");

      const resendButton = page.getByRole("button", { name: /send.*verification/i });
      await expect(resendButton).toBeVisible();
    });

    test("should allow entering email address", async ({ page }) => {
      await page.goto("/verify-pending");

      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill("user@example.com");

      await expect(emailInput).toHaveValue("user@example.com");
    });

    test("should show loading state when submitting", async ({ page }) => {
      await page.goto("/verify-pending");

      // Fill in email
      await page.getByLabel(/email/i).fill("test@example.com");

      // Click resend (mock will handle response)
      const resendButton = page.getByRole("button", { name: /send.*verification/i });

      // Intercept the API call
      await page.route("/api/auth/resend-verification", async (route) => {
        // Delay response to show loading state
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "If an unverified account exists, a new verification link has been sent",
          }),
        });
      });

      await resendButton.click();

      // Should show loading or success state
      await expect(page.getByText(/sending|sent/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to login from verify pending page", async ({ page }) => {
      await page.goto("/verify-pending");

      await page.getByRole("link", { name: /login/i }).click();

      await expect(page).toHaveURL(/login/);
    });

    test("should navigate to register from verify pending page", async ({ page }) => {
      await page.goto("/verify-pending");

      await page.getByRole("link", { name: /create.*account|register/i }).click();

      await expect(page).toHaveURL(/register/);
    });
  });
});

test.describe("Login Page - Verification Links", () => {
  test.describe("AC-2.2.5: Resend link on login page", () => {
    test("should display resend verification link", async ({ page }) => {
      await page.goto("/login");

      // Should have resend verification link
      await expect(
        page.getByRole("link", { name: /resend.*verification|didn't receive/i })
      ).toBeVisible();
    });

    test("should navigate to verify pending from resend link", async ({ page }) => {
      await page.goto("/login");

      // Click resend link
      await page.getByRole("link", { name: /resend.*verification|didn't receive/i }).click();

      await expect(page).toHaveURL(/verify-pending/);
    });

    test("should display page with proper login placeholder", async ({ page }) => {
      await page.goto("/login");

      // Branding
      await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();

      // Page title
      await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

      // Form elements (placeholder for Story 2.3)
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("should have link to create account", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByRole("link", { name: /create account/i })).toBeVisible();
    });

    test("should have link to forgot password", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
    });
  });
});

test.describe("Responsive Design", () => {
  test("verify page should display properly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/verify-pending");

    // Page should be visible and centered
    await expect(page.getByRole("heading", { name: /verify/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /send/i })).toBeVisible();
  });

  test("login page should display properly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
