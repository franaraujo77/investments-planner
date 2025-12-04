/**
 * Login E2E Tests
 *
 * Story 2.3: User Login
 *
 * Tests for login page and user flows.
 */

import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should render login page correctly (AC-2.3.2)", async ({ page }) => {
    // Check branding
    await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();
    await expect(page.getByText("Your trusted investment portfolio advisor")).toBeVisible();

    // Check form elements
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Remember me")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("should have email input field", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("placeholder", "name@example.com");
  });

  test("should have password input with show/hide toggle", async ({ page }) => {
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Find and click the show password button
    const toggleButton = page.getByRole("button", { name: /show password|hide password/i });
    await expect(toggleButton).toBeVisible();

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should have remember me checkbox (default unchecked)", async ({ page }) => {
    const checkbox = page.getByLabel("Remember me");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    // Should be toggleable
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test("should show validation error for empty email", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");

    // Focus and blur email without entering value
    await emailInput.focus();
    await passwordInput.focus();

    await expect(page.getByText("Email is required")).toBeVisible();
  });

  test("should show validation error for invalid email format", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");

    await emailInput.fill("invalid-email");
    await passwordInput.focus();

    await expect(page.getByText("Invalid email address")).toBeVisible();
  });

  test("should show validation error for empty password", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");
    const loginButton = page.getByRole("button", { name: "Login" });

    await emailInput.fill("test@example.com");
    await passwordInput.focus();
    await loginButton.focus();

    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("should have resend verification link (AC-2.2.5)", async ({ page }) => {
    const resendLink = page.getByRole("link", { name: "Resend verification" });
    await expect(resendLink).toBeVisible();
    await expect(resendLink).toHaveAttribute("href", "/verify-pending");
  });

  test("should have forgot password link (AC-2.5.1)", async ({ page }) => {
    const forgotLink = page.getByRole("link", { name: "Forgot password?" });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });

  test("should have create account link", async ({ page }) => {
    const createLink = page.getByRole("link", { name: "Create account" });
    await expect(createLink).toBeVisible();
    await expect(createLink).toHaveAttribute("href", "/register");
  });

  test("should navigate to register page when clicking create account", async ({ page }) => {
    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL("/register");
  });

  test("should navigate to verify-pending page when clicking resend verification", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Resend verification" }).click();
    await expect(page).toHaveURL("/verify-pending");
  });
});

test.describe("Login Form Submission", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should show loading state during submission", async ({ page }) => {
    // Fill form with valid data
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("TestPass123!");

    // Mock a slow response
    await page.route("**/api/auth/login", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" }),
      });
    });

    // Click login and check loading state
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Logging in...")).toBeVisible();
  });

  test("should show error message for invalid credentials (AC-2.3.3)", async ({ page }) => {
    // Mock invalid credentials response
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" }),
      });
    });

    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("should show error for unverified email", async ({ page }) => {
    // Mock unverified user response
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Please verify your email before logging in",
          code: "EMAIL_NOT_VERIFIED",
        }),
      });
    });

    await page.getByLabel("Email").fill("unverified@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Please verify your email before logging in")).toBeVisible();
  });

  test("should redirect to dashboard on successful login (AC-2.3.1)", async ({ page }) => {
    // Mock successful login response
    await page.route("**/api/auth/login", async (route) => {
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
          accessToken: "mock-access-token",
        }),
      });
    });

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: "Login" }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 5000 });
  });
});

test.describe("Login Rate Limiting (AC-2.3.4)", () => {
  test("should show lockout countdown when rate limited", async ({ page }) => {
    await page.goto("/login");

    // Mock rate limited response
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "Retry-After": "900" },
        body: JSON.stringify({
          error: "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: 900,
        }),
      });
    });

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();

    // Should show lockout message with countdown
    await expect(page.getByText("Account temporarily locked")).toBeVisible();
    await expect(page.getByText(/\d+:\d{2}/)).toBeVisible(); // Format: MM:SS
  });

  test("should disable form inputs during lockout", async ({ page }) => {
    await page.goto("/login");

    // Mock rate limited response
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: 900,
        }),
      });
    });

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();

    // Wait for lockout state
    await expect(page.getByText("Account temporarily locked")).toBeVisible();

    // Check inputs are disabled
    await expect(page.getByLabel("Email")).toBeDisabled();
    await expect(page.getByLabel("Password")).toBeDisabled();
    await expect(page.getByLabel("Remember me")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Please wait..." })).toBeDisabled();
  });
});
