/**
 * Account Deletion E2E Tests
 *
 * Story 2.8: Account Deletion
 *
 * Tests for account deletion button, confirmation dialog, and deletion flow.
 *
 * AC-2.8.1: Delete Account Button in Settings
 * AC-2.8.2: Confirmation Dialog with Consequences
 * AC-2.8.5: Logout and Redirect After Deletion
 *
 * NOTE: These tests run in the 'chromium-authenticated' project which uses
 * storageState from the auth setup. No API mocking is needed for authentication.
 *
 * IMPORTANT: These tests don't actually delete the test user. They mock the
 * deletion API to verify UI behavior without affecting the test database.
 */

import { test, expect } from "@playwright/test";

test.describe("Delete Account Button (AC-2.8.1)", () => {
  test("should display delete account button on settings page", async ({ page }) => {
    await page.goto("/settings");

    // Look for delete account button with red/destructive styling
    const deleteButton = page.getByTestId("delete-account-button");
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toContainText("Delete Account");
  });

  test("should display delete button with destructive styling (red)", async ({ page }) => {
    await page.goto("/settings");

    const deleteButton = page.getByTestId("delete-account-button");
    await expect(deleteButton).toBeVisible();

    // Check for destructive variant (red styling)
    // The button should have the destructive variant class
    await expect(deleteButton).toHaveClass(/destructive/);
  });

  test("should display danger zone section with warning", async ({ page }) => {
    await page.goto("/settings");

    // Look for "Danger Zone" heading
    const dangerZone = page.getByText("Danger Zone");
    await expect(dangerZone).toBeVisible();

    // Look for warning icon
    const warningIcon = page.locator("svg.text-destructive").first();
    await expect(warningIcon).toBeVisible();
  });
});

test.describe("Confirmation Dialog (AC-2.8.2)", () => {
  test("should open confirmation dialog when clicking delete button", async ({ page }) => {
    await page.goto("/settings");

    // Click delete button
    const deleteButton = page.getByTestId("delete-account-button");
    await deleteButton.click();

    // Dialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
  });

  test("should display consequences in confirmation dialog", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTestId("delete-account-button").click();

    // Wait for dialog to open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Check for consequence list items within the dialog (use listitem role to avoid matching export section)
    await expect(
      dialog.getByRole("listitem").filter({ hasText: /account and profile/i })
    ).toBeVisible();
    await expect(dialog.getByRole("listitem").filter({ hasText: /portfolios/i })).toBeVisible();
    await expect(
      dialog.getByRole("listitem").filter({ hasText: /scoring criteria/i })
    ).toBeVisible();
    await expect(
      dialog.getByRole("listitem").filter({ hasText: /investment history/i })
    ).toBeVisible();
  });

  test("should display 30-day grace period warning", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTestId("delete-account-button").click();

    // Check for 30-day warning
    await expect(page.getByText("30-Day Grace Period")).toBeVisible();
    await expect(page.getByText(/retained for 30 days/)).toBeVisible();
  });

  test("should show input field for typing DELETE", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTestId("delete-account-button").click();

    // Check for confirmation input
    const confirmInput = page.getByTestId("delete-confirmation-input");
    await expect(confirmInput).toBeVisible();
    await expect(confirmInput).toHaveAttribute("placeholder", /DELETE/);
  });

  test("should have confirm button disabled until DELETE typed", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTestId("delete-account-button").click();

    const confirmButton = page.getByTestId("confirm-delete-button");

    // Button should be disabled initially
    await expect(confirmButton).toBeDisabled();

    // Type partial confirmation
    await page.getByTestId("delete-confirmation-input").fill("DELE");
    await expect(confirmButton).toBeDisabled();

    // Type full confirmation (wrong case)
    await page.getByTestId("delete-confirmation-input").fill("delete");
    await expect(confirmButton).toBeDisabled();

    // Type full confirmation (correct)
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await expect(confirmButton).toBeEnabled();
  });

  test("should close dialog on cancel button click", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTestId("delete-account-button").click();

    // Click cancel button
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should be closed
    const dialog = page.getByRole("dialog");
    await expect(dialog).not.toBeVisible();
  });

  test("should reset confirmation input when dialog reopened", async ({ page }) => {
    await page.goto("/settings");

    // Open dialog
    await page.getByTestId("delete-account-button").click();

    // Type something
    await page.getByTestId("delete-confirmation-input").fill("DEL");

    // Close dialog
    await page.getByRole("button", { name: "Cancel" }).click();

    // Reopen dialog
    await page.getByTestId("delete-account-button").click();

    // Input should be empty
    await expect(page.getByTestId("delete-confirmation-input")).toHaveValue("");
  });
});

test.describe("Deletion Flow (AC-2.8.5)", () => {
  test("should call API on confirmed deletion", async ({ page }) => {
    let deleteCalled = false;

    // Mock deletion API to prevent actual deletion
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Your account has been scheduled for deletion",
            scheduledPurgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodDays: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Wait for API call to complete
    await page.waitForTimeout(500);
    expect(deleteCalled).toBe(true);
  });

  test("should show success toast after deletion", async ({ page }) => {
    // Mock deletion API to prevent actual deletion
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Your account has been scheduled for deletion",
            scheduledPurgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodDays: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Check for success toast
    await expect(page.getByText(/scheduled for deletion/i)).toBeVisible({ timeout: 3000 });
  });

  test("should redirect to homepage after successful deletion", async ({ page }) => {
    // Mock deletion API to prevent actual deletion
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Your account has been scheduled for deletion",
            scheduledPurgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodDays: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Should redirect to homepage
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });

  test("should show loading state during deletion", async ({ page }) => {
    // Mock slow deletion API
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Your account has been scheduled for deletion",
            scheduledPurgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodDays: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Should show loading spinner
    await expect(page.locator("svg.animate-spin")).toBeVisible({ timeout: 500 });
  });
});

test.describe("Error Handling", () => {
  test("should show error toast on API failure", async ({ page }) => {
    // Mock deletion API error
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to delete account",
            code: "INTERNAL_ERROR",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Check for error toast
    await expect(page.getByText(/failed to delete/i)).toBeVisible({ timeout: 3000 });
  });

  test("should show error for invalid confirmation", async ({ page }) => {
    // Mock deletion API with validation error
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: 'You must type "DELETE" to confirm account deletion',
            code: "INVALID_CONFIRMATION",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Check for error toast
    await expect(page.getByText(/must type.*DELETE/i)).toBeVisible({ timeout: 3000 });
  });

  test("should not redirect on API error", async ({ page }) => {
    // Mock deletion API error
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to delete account",
            code: "INTERNAL_ERROR",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Wait a bit and verify still on settings page
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe("Button State During Deletion", () => {
  test("should disable confirm button during API call", async ({ page }) => {
    // Mock slow deletion API
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Your account has been scheduled for deletion",
            scheduledPurgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodDays: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Button should be disabled during loading
    await expect(page.getByTestId("confirm-delete-button")).toBeDisabled();
  });

  test("should disable input field during deletion", async ({ page }) => {
    // Mock slow deletion API
    await page.route("**/api/user/account", async (route) => {
      if (route.request().method() === "DELETE") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Your account has been scheduled for deletion",
            scheduledPurgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodDays: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");
    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-confirmation-input").fill("DELETE");
    await page.getByTestId("confirm-delete-button").click();

    // Input should be disabled during loading
    await expect(page.getByTestId("delete-confirmation-input")).toBeDisabled();
  });
});
