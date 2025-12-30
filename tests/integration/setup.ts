/**
 * Integration Test Setup
 *
 * Story 1.7: Enable All Skipped Tests
 * AC-1.7.3: Integration Test Infrastructure
 *
 * This file runs before all integration tests to:
 * 1. Verify database connection
 * 2. Set up test environment
 * 3. Provide utilities for test isolation
 *
 * Usage:
 *   - This file is automatically loaded via vitest.config.integration.ts
 *   - Import utilities: import { cleanupTestData, createTestUser } from "./setup"
 */

import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Ensure required environment variables
beforeAll(async () => {
  // Check DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.warn(
      "\n⚠️  DATABASE_URL not set. Integration tests will be skipped.\n" +
        "   Set DATABASE_URL to run integration tests against a real database.\n"
    );
    return;
  }

  // Mock AUTH_SECRET for auth tests
  vi.stubEnv("AUTH_SECRET", "integration-test-secret-key-at-least-32-characters-long");
  vi.stubEnv("NODE_ENV", "test");

  console.log("Integration test environment configured");
});

afterAll(async () => {
  // Cleanup any lingering resources
  vi.unstubAllEnvs();
});

afterEach(async () => {
  // Reset mocks between tests
  vi.clearAllMocks();
});

/**
 * Known dummy/placeholder DATABASE_URLs that indicate no real DB available
 */
const DUMMY_DATABASE_URLS = [
  "postgresql://test:test@localhost:5432/test",
  "postgresql://test:test@localhost:5432/test_integration",
];

/**
 * Check if a URL is parseable and compatible with postgres.js
 *
 * postgres.js internally calls decodeURIComponent on URL components.
 * A URL can be valid for `new URL()` but still fail in postgres.js if:
 * - The password contains encoded sequences that decode to invalid UTF-8
 * - Example: %258B decodes to %8B, which is not valid UTF-8
 *
 * This function validates that the URL will work with postgres.js.
 */
function isValidPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Validate password can be decoded by postgres.js
    if (parsed.password) {
      try {
        const decoded = decodeURIComponent(parsed.password);
        // postgres.js may decode again if the result contains %
        // Test if a second decode would fail
        if (decoded.includes("%")) {
          decodeURIComponent(decoded);
        }
      } catch {
        // Password will fail postgres.js decoding
        return false;
      }
    }

    // Validate username similarly
    if (parsed.username) {
      try {
        const decoded = decodeURIComponent(parsed.username);
        if (decoded.includes("%")) {
          decodeURIComponent(decoded);
        }
      } catch {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if database is available for integration tests
 *
 * Returns true only if DATABASE_URL is set, is not a dummy placeholder URL,
 * and is compatible with postgres.js. This prevents tests from attempting
 * to connect to non-existent or malformed databases.
 */
export function isDatabaseAvailable(): boolean {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return false;

  // Check if it's a dummy URL
  if (DUMMY_DATABASE_URLS.includes(dbUrl)) return false;

  // Check if the URL is compatible with postgres.js
  if (!isValidPostgresUrl(dbUrl)) {
    console.warn(
      "⚠️  DATABASE_URL is malformed or incompatible with postgres.js - " +
        "integration tests requiring DB will be skipped. " +
        "Ensure special characters in password are properly URL-encoded."
    );
    return false;
  }

  return true;
}

/**
 * Creates a unique test email to avoid conflicts
 */
export function createTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Test data factories (to be expanded as needed)
 *
 * These functions create test data in the database and return the created records.
 * Use them in tests to set up required data.
 */

export interface TestUserData {
  email: string;
  password: string;
  name: string;
}

export function createTestUserData(overrides: Partial<TestUserData> = {}): TestUserData {
  return {
    email: createTestEmail(),
    password: "SecurePassword123!",
    name: "Test User",
    ...overrides,
  };
}

/**
 * Clean up test data by email pattern
 *
 * Call this in afterEach or afterAll to remove test data:
 * ```typescript
 * afterAll(async () => {
 *   await cleanupTestUsers();
 * });
 * ```
 *
 * Note: This is a placeholder. Actual implementation requires database access.
 * When DATABASE_URL is properly configured, this will clean up test records.
 */
export async function cleanupTestUsers(): Promise<void> {
  if (!isDatabaseAvailable()) {
    return;
  }

  // Dynamic import to avoid errors when DATABASE_URL is not set
  try {
    const { db } = await import("@/lib/db");
    const { users } = await import("@/lib/db/schema");
    const { like } = await import("drizzle-orm");

    await db.delete(users).where(like(users.email, "test-%"));
  } catch {
    // Silently ignore cleanup errors in test environment
  }
}
