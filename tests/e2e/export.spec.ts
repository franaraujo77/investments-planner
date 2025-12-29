/**
 * Data Export E2E Tests
 *
 * Story 2.7: Data Export
 * Story 1.6: GDPR Compliance
 *
 * Tests for data export functionality on the settings page.
 *
 * AC-1.6.1: Request export, receive email with download link (within 24h)
 * AC-1.6.2: Export contains all user data in JSON format
 *
 * NOTE: These tests run in the 'chromium-authenticated' project which uses
 * storageState from the auth setup. No API mocking is needed for authentication.
 *
 * IMPORTANT: The export is asynchronous - user requests export and receives
 * an email with a download link. Tests verify the request flow, not direct download.
 */

import { test, expect } from "@playwright/test";

test.describe("Data Export", () => {
  test("should show export section on settings page (AC-1.6.1)", async ({ page }) => {
    await page.goto("/settings");

    // Check export section heading
    await expect(page.getByRole("heading", { name: "Export Your Data" })).toBeVisible();

    // Check description text
    await expect(page.getByText(/Request a copy of all your data/)).toBeVisible();
  });

  test('should show "Request Data Export" button (AC-1.6.1)', async ({ page }) => {
    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test("should show loading state when export is requested (AC-1.6.1)", async ({ page }) => {
    await page.goto("/settings");

    // Set up a promise to track when the request is intercepted
    let resolveRequest: () => void;
    const requestReceived = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    // Mock the export endpoint with a delay to see loading state
    await page.route("**/api/user/export", async (route) => {
      resolveRequest();
      // Add delay to ensure we can capture loading state
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Export queued" }),
      });
    });

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });

    // Click to trigger the request
    await exportButton.click();

    // Wait for the route handler to start processing
    await requestReceived;

    // Should show loading button with "Requesting..." text
    const loadingButton = page.getByRole("button", { name: /Requesting/i });
    await expect(loadingButton).toBeVisible({ timeout: 1000 });
    await expect(loadingButton).toBeDisabled();
  });

  test("should disable button during export request (AC-1.6.1)", async ({ page }) => {
    await page.goto("/settings");

    // Set up a promise to track when the request is intercepted
    let resolveRequest: () => void;
    const requestReceived = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    // Mock export endpoint with delay - set up after page load, before click
    await page.route("**/api/user/export", async (route) => {
      resolveRequest();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });
    await exportButton.click();

    // Wait for the route handler to start processing
    await requestReceived;

    // Button changes to "Requesting..." when loading - verify it's disabled
    const loadingButton = page.getByRole("button", { name: /Requesting/i });
    await expect(loadingButton).toBeDisabled();
  });

  test("should show success toast on successful export request (AC-1.6.1)", async ({ page }) => {
    await page.goto("/settings");

    // Mock export endpoint - set up after page load, before click
    await page.route("**/api/user/export", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });
    await exportButton.click();

    // Should show success toast about email (use toast container selector to be specific)
    const toast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: /Export request received/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test("should show error toast on export failure", async ({ page }) => {
    await page.goto("/settings");

    // Mock export endpoint with error - set up after page load, before click
    await page.route("**/api/user/export", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to queue export",
          code: "INTERNAL_ERROR",
        }),
      });
    });

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });
    await exportButton.click();

    // Should show error toast
    await expect(page.getByText(/Failed to queue export|Failed to request export/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should re-enable button after export request completes", async ({ page }) => {
    await page.goto("/settings");

    // Mock export endpoint - set up after page load, before click
    await page.route("**/api/user/export", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });
    await exportButton.click();

    // Wait for success toast to appear (indicates request completed)
    await expect(page.getByText(/Export request received/i)).toBeVisible({ timeout: 5000 });

    // Button should be re-enabled
    await expect(exportButton).toBeEnabled();
  });

  test("should re-enable button after export request fails", async ({ page }) => {
    await page.goto("/settings");

    // Mock export endpoint with error - set up after page load, before click
    await page.route("**/api/user/export", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    const exportButton = page.getByRole("button", { name: /Request Data Export/i });
    await exportButton.click();

    // Wait for error to show
    await expect(page.getByText(/Failed|error/i)).toBeVisible({
      timeout: 5000,
    });

    // Button should be re-enabled
    await expect(exportButton).toBeEnabled();
  });

  test("should show rate limit information", async ({ page }) => {
    await page.goto("/settings");

    // Check rate limit note
    await expect(page.getByText(/one export every 24 hours/i)).toBeVisible();
  });
});
