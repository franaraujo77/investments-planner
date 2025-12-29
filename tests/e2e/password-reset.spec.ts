/**
 * Password Reset E2E Tests
 *
 * Story 1.3: Password Reset Flow
 *
 * AC-1.3.1: Forgot password form shows email input and sends reset link
 * AC-1.3.2: Same message shown regardless of email existence (no enumeration)
 * AC-1.3.3: Valid reset link updates password and invalidates sessions
 * AC-1.3.4: Password requirements enforcement
 * AC-1.3.5: Expired/invalid reset link error handling
 * AC-1.3.6: Single-use token enforcement
 * AC-1.3.7: Session invalidation after reset
 */

import { test, expect } from "@playwright/test";

test.describe("Forgot Password Page (AC-1.3.1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("should render forgot password page correctly", async ({ page }) => {
    // Check branding
    await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();
    await expect(page.getByText("Your trusted investment portfolio advisor")).toBeVisible();

    // Check form elements
    await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();
    await expect(
      page.getByText("Enter your email address and we'll send you a link to reset your password.")
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  });

  test("should have email input field", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("placeholder", "name@example.com");
  });

  test("should have back to login link", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: "Back to login" });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("should navigate to login page when clicking back to login", async ({ page }) => {
    await page.getByRole("link", { name: "Back to login" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("should show validation error for empty email", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    const submitButton = page.getByRole("button", { name: "Send reset link" });

    // Focus and blur email without entering value
    await emailInput.focus();
    await submitButton.focus();

    await expect(page.getByText("Email is required")).toBeVisible();
  });

  test("should show validation error for invalid email format", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    const submitButton = page.getByRole("button", { name: "Send reset link" });

    await emailInput.fill("invalid-email");
    await submitButton.focus();

    await expect(page.getByText("Invalid email address")).toBeVisible();
  });
});

test.describe("Forgot Password Form Submission (AC-1.3.2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("should show loading state during submission", async ({ page }) => {
    // Mock a slow response
    await page.route("**/api/auth/forgot-password", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "If an account exists, a reset link has been sent" }),
      });
    });

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText("Sending...")).toBeVisible();
  });

  test("should show success message for existing email (AC-1.3.2)", async ({ page }) => {
    // Mock successful response
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "If an account exists, a reset link has been sent" }),
      });
    });

    await page.getByLabel("Email").fill("existing@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // Should show success state
    await expect(page.getByText("Check your email")).toBeVisible();
    await expect(
      page.getByText(/If an account exists.*you will receive a password reset link/i)
    ).toBeVisible();
    await expect(page.getByText("The link will expire in 1 hour.")).toBeVisible();
  });

  test("should show same success message for non-existing email (AC-1.3.2)", async ({ page }) => {
    // Mock same response for non-existing email
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "If an account exists, a reset link has been sent" }),
      });
    });

    await page.getByLabel("Email").fill("nonexistent@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // Should show same success state (no email enumeration)
    await expect(page.getByText("Check your email")).toBeVisible();
  });

  test("should allow sending another link after success", async ({ page }) => {
    // Mock successful response
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "If an account exists, a reset link has been sent" }),
      });
    });

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // Wait for success state
    await expect(page.getByText("Check your email")).toBeVisible();

    // Click "Send another link" button
    await page.getByRole("button", { name: "Send another link" }).click();

    // Should show form again
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  });
});

test.describe("Reset Password Page (AC-1.3.4)", () => {
  test("should show invalid token error when no token provided", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.getByText("Invalid Reset Link")).toBeVisible();
    await expect(page.getByText("This password reset link is invalid")).toBeVisible();
    await expect(page.getByRole("button", { name: "Request new link" })).toBeVisible();
  });

  test("should navigate to forgot-password when clicking request new link (no token)", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await page.getByRole("button", { name: "Request new link" }).click();
    await expect(page).toHaveURL("/forgot-password");
  });

  test("should render reset password form with valid token", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    // Check branding
    await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();

    // Check form elements
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByText("Enter your new password below.")).toBeVisible();
    await expect(page.getByLabel("New Password")).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset password" })).toBeVisible();
  });

  test("should show password requirements (AC-1.3.4)", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    // Check password requirements are displayed
    await expect(page.getByText("Password requirements:")).toBeVisible();
    await expect(page.getByText("At least 8 characters")).toBeVisible();
    await expect(page.getByText("At least one uppercase letter")).toBeVisible();
    await expect(page.getByText("At least one lowercase letter")).toBeVisible();
    await expect(page.getByText("At least one number")).toBeVisible();
    await expect(page.getByText(/At least one special character/)).toBeVisible();
  });

  test("should have password visibility toggle", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    const passwordInput = page.locator('input[name="newPassword"]');
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle
    const toggleButton = page.getByRole("button", { name: /toggle visibility/i }).first();
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("should show validation error for weak password", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    await page.locator('input[name="newPassword"]').fill("weak");
    await page.locator('input[name="confirmPassword"]').focus();

    await expect(
      page.locator('[data-slot="form-message"]').filter({ hasText: /at least 8 characters/i })
    ).toBeVisible();
  });

  test("should show validation error for password without uppercase", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    await page.locator('input[name="newPassword"]').fill("lowercase123@");
    await page.locator('input[name="confirmPassword"]').focus();

    await expect(
      page.locator('[data-slot="form-message"]').filter({ hasText: /uppercase/i })
    ).toBeVisible();
  });

  test("should show validation error for password mismatch", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await newPasswordInput.fill("ValidP@ss123");
    await newPasswordInput.blur();
    await confirmPasswordInput.fill("DifferentP@ss123");
    await confirmPasswordInput.blur();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("should show password strength meter when typing", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    await page.locator('input[name="newPassword"]').fill("ValidP@ss123");

    // Should show strength meter (look for progress indicator)
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
  });
});

test.describe("Reset Password Form Submission", () => {
  test("should show loading state during submission", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token");

    // Mock a slow response
    await page.route("**/api/auth/reset-password", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await newPasswordInput.fill("ValidP@ss123");
    await newPasswordInput.blur();
    await confirmPasswordInput.fill("ValidP@ss123");
    await confirmPasswordInput.blur();

    // Wait for form to become valid
    await expect(page.getByRole("button", { name: "Reset password" })).toBeEnabled();
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("Resetting password...")).toBeVisible();
  });

  test("should show error for invalid token", async ({ page }) => {
    await page.goto("/reset-password?token=invalid-token");

    // Mock invalid token response
    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid or expired reset link",
          code: "INVALID_TOKEN",
        }),
      });
    });

    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await newPasswordInput.fill("ValidP@ss123");
    await newPasswordInput.blur();
    await confirmPasswordInput.fill("ValidP@ss123");
    await confirmPasswordInput.blur();

    // Wait for form to become valid
    await expect(page.getByRole("button", { name: "Reset password" })).toBeEnabled();
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("Invalid or expired reset link")).toBeVisible();
  });

  test("should show error for expired token with request new link button", async ({ page }) => {
    await page.goto("/reset-password?token=expired-token");

    // Mock expired token response
    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "This reset link has expired. Please request a new one.",
          code: "TOKEN_EXPIRED",
        }),
      });
    });

    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await newPasswordInput.fill("ValidP@ss123");
    await newPasswordInput.blur();
    await confirmPasswordInput.fill("ValidP@ss123");
    await confirmPasswordInput.blur();

    // Wait for form to become valid
    await expect(page.getByRole("button", { name: "Reset password" })).toBeEnabled();
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("This reset link has expired")).toBeVisible();
    await expect(page.getByRole("button", { name: "Request new link" })).toBeVisible();
  });

  test("should show error for already used token", async ({ page }) => {
    await page.goto("/reset-password?token=used-token");

    // Mock used token response
    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "This reset link has already been used",
          code: "TOKEN_USED",
        }),
      });
    });

    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await newPasswordInput.fill("ValidP@ss123");
    await newPasswordInput.blur();
    await confirmPasswordInput.fill("ValidP@ss123");
    await confirmPasswordInput.blur();

    // Wait for form to become valid
    await expect(page.getByRole("button", { name: "Reset password" })).toBeEnabled();
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("This reset link has already been used")).toBeVisible();
  });

  test("should redirect to login on successful reset (AC-1.3.3)", async ({ page }) => {
    await page.goto("/reset-password?token=valid-token");

    // Mock successful reset response
    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await newPasswordInput.fill("ValidP@ss123");
    await newPasswordInput.blur();
    await confirmPasswordInput.fill("ValidP@ss123");
    await confirmPasswordInput.blur();

    // Wait for form to become valid
    await expect(page.getByRole("button", { name: "Reset password" })).toBeEnabled();
    await page.getByRole("button", { name: "Reset password" }).click();

    // Should redirect to login
    await expect(page).toHaveURL("/login", { timeout: 5000 });
  });
});

test.describe("Login Page Integration", () => {
  test("should have forgot password link pointing to /forgot-password (AC-1.3.1)", async ({
    page,
  }) => {
    await page.goto("/login");

    const forgotLink = page.getByRole("link", { name: "Forgot password?" });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });

  test("should navigate to forgot-password page from login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL("/forgot-password");
  });
});
