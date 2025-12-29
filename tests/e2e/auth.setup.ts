/**
 * Authentication Setup for E2E Tests
 *
 * This setup file runs before authenticated tests to:
 * 1. Clear rate limits (prevents flakiness from previous runs)
 * 2. Login via the form to get real auth cookies
 * 3. Save the authenticated state for reuse
 *
 * Run order is controlled by playwright.config.ts dependencies.
 */

import { test as setup, expect } from "@playwright/test";
import { TEST_USER, AUTH_STATE_PATH } from "./fixtures/auth";

/**
 * Setup: Authenticate and save state
 *
 * This test logs in as the test user and saves the browser
 * state (cookies, localStorage) for other tests to use.
 */
setup("authenticate", async ({ page, context }) => {
  // Clear server-side rate limits (dev-only endpoint)
  try {
    const response = await page.request.post("/api/dev/clear-rate-limits");
    if (response.ok()) {
      console.log("✅ Server rate limits cleared");
    }
  } catch {
    // Ignore - endpoint may not exist in production
  }

  // Navigate to login page first to set up the domain for localStorage
  await page.goto("/login");

  // Clear client-side lockout state from localStorage
  await page.evaluate(() => {
    localStorage.removeItem("login_lockout_until");
  });
  console.log("✅ Client lockout state cleared");

  // Reload the page so the form picks up the cleared state
  await page.reload();

  // Wait for page to be ready
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  // Fill login form
  await page.getByLabel("Email").fill(TEST_USER.email);

  // Password input - handle the password field type
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(TEST_USER.password);

  // Click login button
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for successful login - dashboard is at root "/" or "/dashboard"
  // If login fails, this will timeout with a clear error
  // Regex must match full URL like http://localhost:3000/ or http://localhost:3000/dashboard
  await page.waitForURL(/\/(dashboard)?$/, {
    timeout: 15000,
  });

  // Verify we're on the dashboard by checking for the welcome message
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  // Save the authenticated state
  await context.storageState({ path: AUTH_STATE_PATH });
});
