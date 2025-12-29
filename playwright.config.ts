import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration
 *
 * E2E testing configuration for investments-planner.
 * Runs tests against localhost:3000.
 *
 * Projects:
 * - setup: Authenticates test user and saves state
 * - chromium: Unauthenticated tests (login, registration, etc.)
 * - chromium-authenticated: Tests requiring authentication
 */

/** Path to stored authenticated browser state */
const AUTH_STATE_PATH = "tests/e2e/.auth/user.json";

export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : "50%",
  reporter: process.env.CI ? "github" : "html",
  timeout: 30000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Setup project - runs first to create authenticated state
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Unauthenticated tests (login, registration, password reset, etc.)
    {
      name: "chromium",
      testMatch: /\/(login|registration|password-reset|verification|smoke)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Authenticated tests - depend on setup project
    {
      name: "chromium-authenticated",
      testIgnore: /\/(login|registration|password-reset|verification|smoke)\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )
    ),
  },
});
