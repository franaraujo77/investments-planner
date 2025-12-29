import { test, expect } from "@playwright/test";

test.describe("Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test.describe("AC1: Registration page layout", () => {
    test("should display registration page with form", async ({ page }) => {
      // Branding
      await expect(page.getByRole("heading", { name: "Investments Planner" })).toBeVisible();

      // Form title
      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();

      // Email field
      await expect(page.getByLabel(/email/i)).toBeVisible();

      // Password field
      await expect(page.locator('input[name="password"]')).toBeVisible();

      // Confirm Password field (AC-1.1.5)
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

      // Name field
      await expect(page.getByLabel(/name/i)).toBeVisible();

      // Disclaimer checkbox
      await expect(page.getByText(/financial advice/i)).toBeVisible();

      // Submit button
      await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();

      // Login link
      await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    });
  });

  test.describe("AC1 & AC4: Email validation", () => {
    test("should show error for invalid email format", async ({ page }) => {
      const emailInput = page.getByLabel(/email/i);

      // Enter invalid email
      await emailInput.fill("invalid-email");
      await emailInput.blur();

      // Should show inline error
      await expect(page.getByText(/invalid email/i)).toBeVisible();
    });

    test("should accept valid email format", async ({ page }) => {
      const emailInput = page.getByLabel(/email/i);

      // Enter valid email
      await emailInput.fill("valid@example.com");
      await emailInput.blur();

      // Should not show email error
      await expect(page.getByText(/invalid email/i)).not.toBeVisible();
    });
  });

  test.describe("AC2 & AC4: Password complexity validation", () => {
    test("should show error for password missing uppercase", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter password without uppercase
      await passwordInput.fill("lowercase1@");
      await passwordInput.blur();

      // Should show uppercase error (target form message specifically)
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /uppercase/i })
      ).toBeVisible();
    });

    test("should show error for password missing number", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter password without number
      await passwordInput.fill("NoNumbers@!");
      await passwordInput.blur();

      // Should show number error (target form message specifically)
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /number/i })
      ).toBeVisible();
    });

    test("should show error for password missing special character", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter password without special char
      await passwordInput.fill("NoSpecial123");
      await passwordInput.blur();

      // Should show special character error (target form message specifically)
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /special character/i })
      ).toBeVisible();
    });

    test("should show error for password too short", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter short password
      await passwordInput.fill("Sh0rt@");
      await passwordInput.blur();

      // Should show length error (target form message specifically)
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /at least 8 characters/i })
      ).toBeVisible();
    });

    test("should accept valid complex password", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter valid password
      await passwordInput.fill("ValidP@ss123");
      await passwordInput.blur();

      // Should not show any password errors (check form messages are not present)
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /uppercase/i })
      ).not.toBeVisible();
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /lowercase/i })
      ).not.toBeVisible();
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /number/i })
      ).not.toBeVisible();
      await expect(
        page.locator('[data-slot="form-message"]').filter({ hasText: /special character/i })
      ).not.toBeVisible();
    });
  });

  test.describe("AC3: Password strength meter", () => {
    // Helper to get the strength label (excludes aria-labels by targeting <p> element)
    const getStrengthLabel = (page: import("@playwright/test").Page) =>
      page.locator("p.text-xs").filter({ hasText: /^(Weak|Medium|Strong)$/ });

    test("should show 'Weak' for short password", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter weak password (short)
      await passwordInput.fill("weak");

      // Should show weak indicator
      await expect(getStrengthLabel(page)).toHaveText("Weak");
    });

    test("should show 'Medium' for medium complexity password", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter medium password
      await passwordInput.fill("Medium@12");

      // Should show medium indicator
      await expect(getStrengthLabel(page)).toHaveText("Medium");
    });

    test("should show 'Strong' for complex password", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');

      // Enter strong password (16+ chars with all types)
      await passwordInput.fill("VeryStr0ngP@ssword!");

      // Should show strong indicator
      await expect(getStrengthLabel(page)).toHaveText("Strong");
    });

    test("should update strength in real-time as user types", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      const strengthLabel = getStrengthLabel(page);

      // Start typing - should show weak (score 1: only lowercase)
      await passwordInput.fill("a");
      await expect(strengthLabel).toHaveText("Weak");

      // Add variety - becomes medium (score 4: lowercase + uppercase + number + special)
      await passwordInput.fill("aB1@");
      await expect(strengthLabel).toHaveText("Medium");

      // Still medium with 8+ chars (score 5: 8+ length + variety)
      await passwordInput.fill("aB1@cdef");
      await expect(strengthLabel).toHaveText("Medium");

      // Make it strong (16+ chars or 12+ with variety = score 6+)
      await passwordInput.fill("VeryStr0ngP@ss!");
      await expect(strengthLabel).toHaveText("Strong");
    });
  });

  test.describe("AC5: Submit button disabled state", () => {
    test("should disable submit button with empty form", async ({ page }) => {
      const submitButton = page.getByRole("button", { name: /create account/i });

      // Button should be disabled initially
      await expect(submitButton).toBeDisabled();
    });

    test("should disable submit button without disclaimer checked", async ({ page }) => {
      // Fill in valid data but don't check disclaimer
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.locator('input[name="password"]').fill("ValidP@ss123");
      await page.locator('input[name="confirmPassword"]').fill("ValidP@ss123");

      const submitButton = page.getByRole("button", { name: /create account/i });

      // Button should still be disabled
      await expect(submitButton).toBeDisabled();
    });

    test("should disable submit button without confirmPassword", async ({ page }) => {
      // Fill in valid data but no confirmPassword
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.locator('input[name="password"]').fill("ValidP@ss123");
      await page.getByRole("checkbox").check();

      const submitButton = page.getByRole("button", { name: /create account/i });

      // Button should still be disabled (missing confirmPassword)
      // Playwright auto-waits for the assertion
      await expect(submitButton).toBeDisabled();
    });

    test("should enable submit button with valid form and disclaimer", async ({ page }) => {
      // Fill in valid data including confirmPassword
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.locator('input[name="password"]').fill("ValidP@ss123");
      await page.locator('input[name="confirmPassword"]').fill("ValidP@ss123");

      // Check disclaimer
      await page.getByRole("checkbox").check();

      const submitButton = page.getByRole("button", { name: /create account/i });

      // Button should be enabled - Playwright auto-waits for the assertion
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe("AC-1.1.5: Confirm Password validation", () => {
    test("should show error when passwords do not match", async ({ page }) => {
      // Fill password
      await page.locator('input[name="password"]').fill("ValidP@ss123");

      // Fill different confirmPassword
      const confirmInput = page.locator('input[name="confirmPassword"]');
      await confirmInput.fill("DifferentP@ss123");
      await confirmInput.blur();

      // Should show mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test("should not show error when passwords match", async ({ page }) => {
      // Fill password
      await page.locator('input[name="password"]').fill("ValidP@ss123");

      // Fill matching confirmPassword
      const confirmInput = page.locator('input[name="confirmPassword"]');
      await confirmInput.fill("ValidP@ss123");
      await confirmInput.blur();

      // Should not show mismatch error
      await expect(page.getByText(/passwords do not match/i)).not.toBeVisible();
    });

    test("should show error for empty confirm password", async ({ page }) => {
      // Fill password
      await page.locator('input[name="password"]').fill("ValidP@ss123");

      // Leave confirmPassword empty but trigger validation
      const confirmInput = page.locator('input[name="confirmPassword"]');
      await confirmInput.focus();
      await confirmInput.blur();

      // Should show required error
      await expect(page.getByText(/confirm your password/i)).toBeVisible();
    });
  });

  test.describe("AC7: Financial disclaimer", () => {
    test("should display financial disclaimer text", async ({ page }) => {
      await expect(page.getByText(/educational information only/i)).toBeVisible();
      await expect(page.getByText(/does not constitute financial advice/i)).toBeVisible();
    });

    test("should require disclaimer to be checked", async ({ page }) => {
      const checkbox = page.getByRole("checkbox");

      // Initially unchecked
      await expect(checkbox).not.toBeChecked();

      // Check it
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    });
  });

  test.describe("Password visibility toggle", () => {
    test("should toggle password visibility for both password fields", async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      // Get the first toggle button (associated with password field)
      const toggleButtons = page.getByRole("button", { name: /toggle visibility/i });

      // Enter passwords
      await passwordInput.fill("TestPassword123!");
      await confirmPasswordInput.fill("TestPassword123!");

      // Initially both are password type
      await expect(passwordInput).toHaveAttribute("type", "password");
      await expect(confirmPasswordInput).toHaveAttribute("type", "password");

      // Click first toggle - should toggle both fields (shared state)
      await toggleButtons.first().click();

      // Both should now be text type
      await expect(passwordInput).toHaveAttribute("type", "text");
      await expect(confirmPasswordInput).toHaveAttribute("type", "text");

      // Click again
      await toggleButtons.first().click();

      // Both back to password
      await expect(passwordInput).toHaveAttribute("type", "password");
      await expect(confirmPasswordInput).toHaveAttribute("type", "password");
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to login page via link", async ({ page }) => {
      await page.getByRole("link", { name: /log in/i }).click();

      // Should navigate to login (may not exist yet but URL should change)
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Responsive design", () => {
    test("should display properly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/register");

      // Form should be visible and centered
      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });

    test("should display properly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/register");

      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    });
  });
});
