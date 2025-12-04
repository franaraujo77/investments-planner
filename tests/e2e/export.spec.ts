/**
 * Data Export E2E Tests
 *
 * Story 2.7: Data Export
 *
 * Tests for data export functionality on the settings page.
 *
 * AC-2.7.1: Export button visible on Settings page
 * AC-2.7.2: ZIP file downloads with correct contents
 * AC-2.7.5: Progress indicator shows during generation, button disabled
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

/**
 * Create a mock ZIP file buffer for testing
 */
function createMockZipBuffer(): Buffer {
  // Create a minimal valid ZIP file structure
  // This is a simplified ZIP that contains just the central directory
  const zipBuffer = Buffer.from([
    // Local file header for portfolio.json
    0x50,
    0x4b,
    0x03,
    0x04, // Local file header signature
    0x14,
    0x00, // Version needed to extract
    0x00,
    0x00, // General purpose bit flag
    0x00,
    0x00, // Compression method (stored)
    0x00,
    0x00, // Last mod file time
    0x00,
    0x00, // Last mod file date
    0x00,
    0x00,
    0x00,
    0x00, // CRC-32
    0x02,
    0x00,
    0x00,
    0x00, // Compressed size
    0x02,
    0x00,
    0x00,
    0x00, // Uncompressed size
    0x0e,
    0x00, // File name length (14)
    0x00,
    0x00, // Extra field length
    // File name "portfolio.json"
    0x70,
    0x6f,
    0x72,
    0x74,
    0x66,
    0x6f,
    0x6c,
    0x69,
    0x6f,
    0x2e,
    0x6a,
    0x73,
    0x6f,
    0x6e,
    // File data "[]"
    0x5b,
    0x5d,
    // Central directory file header
    0x50,
    0x4b,
    0x01,
    0x02, // Central directory signature
    0x14,
    0x00, // Version made by
    0x14,
    0x00, // Version needed to extract
    0x00,
    0x00, // General purpose bit flag
    0x00,
    0x00, // Compression method
    0x00,
    0x00, // Last mod file time
    0x00,
    0x00, // Last mod file date
    0x00,
    0x00,
    0x00,
    0x00, // CRC-32
    0x02,
    0x00,
    0x00,
    0x00, // Compressed size
    0x02,
    0x00,
    0x00,
    0x00, // Uncompressed size
    0x0e,
    0x00, // File name length
    0x00,
    0x00, // Extra field length
    0x00,
    0x00, // File comment length
    0x00,
    0x00, // Disk number start
    0x00,
    0x00, // Internal file attributes
    0x00,
    0x00,
    0x00,
    0x00, // External file attributes
    0x00,
    0x00,
    0x00,
    0x00, // Relative offset of local header
    // File name "portfolio.json"
    0x70,
    0x6f,
    0x72,
    0x74,
    0x66,
    0x6f,
    0x6c,
    0x69,
    0x6f,
    0x2e,
    0x6a,
    0x73,
    0x6f,
    0x6e,
    // End of central directory
    0x50,
    0x4b,
    0x05,
    0x06, // End of central directory signature
    0x00,
    0x00, // Number of this disk
    0x00,
    0x00, // Disk where central directory starts
    0x01,
    0x00, // Number of central directory records on this disk
    0x01,
    0x00, // Total number of central directory records
    0x3c,
    0x00,
    0x00,
    0x00, // Size of central directory
    0x30,
    0x00,
    0x00,
    0x00, // Offset of start of central directory
    0x00,
    0x00, // Comment length
  ]);

  return zipBuffer;
}

test.describe("Data Export", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("should show export section on settings page (AC-2.7.1)", async ({ page }) => {
    await page.goto("/settings");

    // Check export section heading
    await expect(page.getByRole("heading", { name: "Export Your Data" })).toBeVisible();

    // Check description text
    await expect(page.getByText(/Download a copy of all your data/)).toBeVisible();
  });

  test('should show "Export My Data" button (AC-2.7.1)', async ({ page }) => {
    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test("should show loading state when export is clicked (AC-2.7.5)", async ({ page }) => {
    // Mock the export endpoint with a delay to see loading state
    await page.route("**/api/user/export", async (route) => {
      // Add a delay to simulate export processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const zipBuffer = createMockZipBuffer();
      await route.fulfill({
        status: 200,
        contentType: "application/zip",
        headers: {
          "Content-Disposition": 'attachment; filename="investments-planner-export-2025-12-02.zip"',
        },
        body: zipBuffer,
      });
    });

    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });

    // Click and immediately check for loading state
    await exportButton.click();

    // Should show loading indicator
    await expect(page.getByText(/Exporting/i)).toBeVisible();

    // Button should be disabled during export
    await expect(exportButton).toBeDisabled();

    // Wait for export to complete
    await expect(page.getByText(/Exporting/i)).toBeHidden({ timeout: 5000 });
  });

  test("should disable button during export (AC-2.7.5)", async ({ page }) => {
    // Mock export endpoint with delay
    await page.route("**/api/user/export", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const zipBuffer = createMockZipBuffer();
      await route.fulfill({
        status: 200,
        contentType: "application/zip",
        body: zipBuffer,
      });
    });

    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await exportButton.click();

    // Verify button is disabled during export
    await expect(exportButton).toBeDisabled();
  });

  test("should trigger download on successful export (AC-2.7.2)", async ({ page }) => {
    // Mock export endpoint
    await page.route("**/api/user/export", async (route) => {
      const zipBuffer = createMockZipBuffer();
      await route.fulfill({
        status: 200,
        contentType: "application/zip",
        headers: {
          "Content-Disposition": 'attachment; filename="investments-planner-export-2025-12-02.zip"',
          "Content-Length": zipBuffer.length.toString(),
        },
        body: zipBuffer,
      });
    });

    await page.goto("/settings");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Click export button
    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await exportButton.click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify filename format
    expect(download.suggestedFilename()).toMatch(
      /investments-planner-export-\d{4}-\d{2}-\d{2}\.zip/
    );
  });

  test("should show success toast on successful export", async ({ page }) => {
    // Mock export endpoint
    await page.route("**/api/user/export", async (route) => {
      const zipBuffer = createMockZipBuffer();
      await route.fulfill({
        status: 200,
        contentType: "application/zip",
        body: zipBuffer,
      });
    });

    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await exportButton.click();

    // Should show success toast
    await expect(page.getByText(/Export downloaded successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test("should show error toast on export failure", async ({ page }) => {
    // Mock export endpoint with error
    await page.route("**/api/user/export", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to generate export",
          code: "INTERNAL_ERROR",
        }),
      });
    });

    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await exportButton.click();

    // Should show error toast
    await expect(page.getByText(/Failed to generate export/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should re-enable button after export completes", async ({ page }) => {
    // Mock export endpoint
    await page.route("**/api/user/export", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const zipBuffer = createMockZipBuffer();
      await route.fulfill({
        status: 200,
        contentType: "application/zip",
        body: zipBuffer,
      });
    });

    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await exportButton.click();

    // Wait for loading to complete
    await expect(page.getByText(/Exporting/i)).toBeHidden({ timeout: 5000 });

    // Button should be re-enabled
    await expect(exportButton).toBeEnabled();
  });

  test("should re-enable button after export fails", async ({ page }) => {
    // Mock export endpoint with error
    await page.route("**/api/user/export", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    await page.goto("/settings");

    const exportButton = page.getByRole("button", { name: /Export My Data/i });
    await exportButton.click();

    // Wait for error to show
    await expect(page.getByText(/Failed|error/i)).toBeVisible({
      timeout: 5000,
    });

    // Button should be re-enabled
    await expect(exportButton).toBeEnabled();
  });
});

test.describe("Data Export - Unauthenticated", () => {
  test("should reject unauthenticated export requests", async ({ page }) => {
    // Don't mock auth - let it fail naturally
    await page.route("**/api/user/export", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        }),
      });
    });

    // Make direct API request
    const response = await page.request.get("/api/user/export");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});
