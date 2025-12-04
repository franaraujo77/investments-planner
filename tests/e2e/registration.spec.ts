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
      await expect(page.getByLabel(/password/i)).toBeVisible();

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
      const passwordInput = page.getByLabel(/password/i);

      // Enter password without uppercase
      await passwordInput.fill("lowercase1@");
      await passwordInput.blur();

      // Should show uppercase error
      await expect(page.getByText(/uppercase/i)).toBeVisible();
    });

    test("should show error for password missing number", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter password without number
      await passwordInput.fill("NoNumbers@!");
      await passwordInput.blur();

      // Should show number error
      await expect(page.getByText(/number/i)).toBeVisible();
    });

    test("should show error for password missing special character", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter password without special char
      await passwordInput.fill("NoSpecial123");
      await passwordInput.blur();

      // Should show special character error
      await expect(page.getByText(/special character/i)).toBeVisible();
    });

    test("should show error for password too short", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter short password
      await passwordInput.fill("Sh0rt@");
      await passwordInput.blur();

      // Should show length error
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test("should accept valid complex password", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter valid password
      await passwordInput.fill("ValidP@ss123");
      await passwordInput.blur();

      // Should not show any password errors
      await expect(page.getByText(/uppercase/i)).not.toBeVisible();
      await expect(page.getByText(/lowercase/i)).not.toBeVisible();
      await expect(page.getByText(/number/i)).not.toBeVisible();
      await expect(page.getByText(/special character/i)).not.toBeVisible();
    });
  });

  test.describe("AC3: Password strength meter", () => {
    test("should show 'Weak' for short password", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter weak password (short)
      await passwordInput.fill("weak");

      // Should show weak indicator
      await expect(page.getByText(/^weak$/i)).toBeVisible();
    });

    test("should show 'Medium' for medium complexity password", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter medium password
      await passwordInput.fill("Medium@12");

      // Should show medium indicator
      await expect(page.getByText(/^medium$/i)).toBeVisible();
    });

    test("should show 'Strong' for complex password", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Enter strong password (16+ chars with all types)
      await passwordInput.fill("VeryStr0ngP@ssword!");

      // Should show strong indicator
      await expect(page.getByText(/^strong$/i)).toBeVisible();
    });

    test("should update strength in real-time as user types", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);

      // Start typing - should show weak
      await passwordInput.fill("a");
      await expect(page.getByText(/^weak$/i)).toBeVisible();

      // Add more characters
      await passwordInput.fill("aB1@");
      await expect(page.getByText(/^weak$/i)).toBeVisible();

      // Make it 8+ chars
      await passwordInput.fill("aB1@cdef");
      await expect(page.getByText(/^medium$/i)).toBeVisible();

      // Make it strong
      await passwordInput.fill("VeryStr0ngP@ss!");
      await expect(page.getByText(/^strong$/i)).toBeVisible();
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
      await page.getByLabel(/password/i).fill("ValidP@ss123");

      const submitButton = page.getByRole("button", { name: /create account/i });

      // Button should still be disabled
      await expect(submitButton).toBeDisabled();
    });

    test("should enable submit button with valid form and disclaimer", async ({ page }) => {
      // Fill in valid data
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.getByLabel(/password/i).fill("ValidP@ss123");

      // Check disclaimer
      await page.getByRole("checkbox").check();

      // Need to wait for form validation
      await page.waitForTimeout(100);

      const submitButton = page.getByRole("button", { name: /create account/i });

      // Button should be enabled
      await expect(submitButton).toBeEnabled();
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
    test("should toggle password visibility", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);
      const toggleButton = page.getByRole("button", { name: /show password|hide password/i });

      // Enter password
      await passwordInput.fill("TestPassword123!");

      // Initially password type
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click toggle
      await toggleButton.click();

      // Now text type
      await expect(passwordInput).toHaveAttribute("type", "text");

      // Click again
      await toggleButton.click();

      // Back to password
      await expect(passwordInput).toHaveAttribute("type", "password");
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
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("should display properly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/register");

      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    });
  });
});
