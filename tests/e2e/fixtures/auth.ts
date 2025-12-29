/**
 * E2E Test Authentication Utilities
 *
 * Provides proper authentication for E2E tests by:
 * 1. Logging in via the actual login form (sets real cookies)
 * 2. Saving authenticated state to reuse across tests
 *
 * This fixes the timeout issues caused by API route mocking,
 * which doesn't work with Next.js Server Components that read
 * cookies directly via next/headers.
 */

import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Test user credentials
 * These should match a verified user in the test database
 */
export const TEST_USER = {
  email: "e2e-test@example.com",
  password: "TestPass123!",
  name: "E2E Test User",
} as const;

/**
 * Path to store authenticated browser state
 */
export const AUTH_STATE_PATH = "tests/e2e/.auth/user.json";

/**
 * Login via the actual login form
 *
 * This sets real cookies that Server Components can read.
 * Use this instead of API route mocking.
 *
 * @param page - Playwright page instance
 * @param email - User email (defaults to TEST_USER.email)
 * @param password - User password (defaults to TEST_USER.password)
 */
export async function loginViaForm(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
): Promise<void> {
  await page.goto("/login");

  // Fill login form
  await page.getByLabel("Email").fill(email);

  // Password field uses placeholder-based selector since it's type="password"
  const passwordInput = page
    .locator('input[type="password"], input[placeholder*="password" i]')
    .first();
  await passwordInput.fill(password);

  // Submit form
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for redirect to dashboard (successful login)
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

/**
 * Login and save authentication state
 *
 * Use this in a setup test to create reusable auth state.
 *
 * @param page - Playwright page instance
 * @param context - Browser context to save state from
 */
export async function loginAndSaveState(page: Page, context: BrowserContext): Promise<void> {
  await loginViaForm(page);

  // Save the authenticated state
  await context.storageState({ path: AUTH_STATE_PATH });
}

/**
 * Check if user is authenticated by verifying cookies exist
 *
 * @param context - Browser context to check
 * @returns true if auth cookies are present
 */
export async function isAuthenticated(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((c) => c.name === "access_token" && c.value.length > 0);
}

/**
 * Navigate to a protected page, handling auth redirect if needed
 *
 * If not authenticated, will login first then navigate.
 *
 * @param page - Playwright page instance
 * @param url - Protected page URL (e.g., "/settings")
 */
export async function gotoProtectedPage(page: Page, url: string): Promise<void> {
  await page.goto(url);

  // Check if we got redirected to login
  if (page.url().includes("/login")) {
    await loginViaForm(page);
    await page.goto(url);
  }

  // Verify we're on the expected page
  await expect(page).toHaveURL(new RegExp(url.replace("/", "\\/")));
}

/**
 * Mock API responses for client-side fetches
 *
 * Use this ONLY for mocking client-side API calls (e.g., profile updates).
 * This does NOT work for Server Component authentication.
 *
 * @param page - Playwright page instance
 * @param routes - Map of route patterns to response handlers
 */
export async function mockClientApiRoutes(
  page: Page,
  routes: Record<string, (route: import("@playwright/test").Route) => Promise<void>>
): Promise<void> {
  for (const [pattern, handler] of Object.entries(routes)) {
    await page.route(pattern, handler);
  }
}

/**
 * Custom test fixture with automatic authentication
 *
 * Usage:
 * ```ts
 * import { test } from './fixtures/auth';
 *
 * test('my authenticated test', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/settings');
 *   // User is already logged in
 * });
 * ```
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page, context }, use) => {
    // Check if we have stored auth state
    const authenticated = await isAuthenticated(context);

    if (!authenticated) {
      // Login if not already authenticated
      await loginViaForm(page);
    }

    await use(page);
  },
});

export { expect } from "@playwright/test";
