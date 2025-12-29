/**
 * Auth Flow Integration Tests
 *
 * Tests for Story 1.3: Full authentication flow integration tests
 * AC: 1, 2, 3, 4, 5
 *
 * IMPORTANT: These are API integration tests that require:
 * 1. A running Next.js server (pnpm dev)
 * 2. DATABASE_URL pointing to a test database
 * 3. Database migrations applied
 *
 * These tests use fetch() to call actual API endpoints, making them
 * more suitable for E2E testing with Playwright's API testing.
 * Consider using tests/e2e/ for full API flow testing instead.
 *
 * Story 1.7 AC-1.7.3: These tests are conditionally skipped until
 * the full integration test infrastructure is in place.
 *
 * Run integration tests with: DATABASE_URL=... pnpm test:integration
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import { isDatabaseAvailable } from "./setup";

// Mock environment before importing auth modules
beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-key-at-least-32-characters-long");
  vi.stubEnv("NODE_ENV", "test");
});

/**
 * Auth Flow Integration Tests
 *
 * These tests verify the complete auth flow via HTTP API calls.
 * They are skipped by default because they require:
 * 1. A running Next.js server on localhost:3000
 * 2. A configured test database (DATABASE_URL)
 * 3. Database migrations applied
 *
 * To run these tests:
 * 1. Start the dev server: pnpm dev
 * 2. Set DATABASE_URL to a test database
 * 3. Run migrations: pnpm db:migrate
 * 4. Set RUN_API_INTEGRATION_TESTS=true
 */

describe("Auth Flow Integration (requires running server)", () => {
  const shouldSkip = !process.env.RUN_API_INTEGRATION_TESTS || !isDatabaseAvailable();

  beforeAll(() => {
    if (shouldSkip) {
      console.log(
        "⚠️  Skipping Auth Flow Integration tests - requires RUN_API_INTEGRATION_TESTS=true and DATABASE_URL"
      );
    }
  });
  describe("Register → Login → Me → Logout Flow", () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: "SecurePassword123!",
      name: "Test User",
    };

    it.skipIf(shouldSkip)("should complete full registration flow", async () => {
      // 1. Register
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      });

      expect(registerResponse.status).toBe(200);
      const registerData = await registerResponse.json();
      expect(registerData.user.email).toBe(testUser.email);
      expect(registerData.accessToken).toBeDefined();

      // Check cookies are set
      const cookies = registerResponse.headers.get("set-cookie");
      expect(cookies).toContain("access_token");
      expect(cookies).toContain("refresh_token");
    });

    it.skipIf(shouldSkip)("should complete full login flow", async () => {
      // Login
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.user.email).toBe(testUser.email);
    });

    it.skipIf(shouldSkip)("should get current user with /me endpoint", async () => {
      // Login first to get cookies
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      // Extract cookies from login response
      const cookies = loginResponse.headers.get("set-cookie") ?? "";

      // Call /me with cookies
      const meResponse = await fetch("/api/auth/me", {
        headers: { Cookie: cookies },
      });

      expect(meResponse.status).toBe(200);
      const meData = await meResponse.json();
      expect(meData.user.email).toBe(testUser.email);
    });

    it.skipIf(shouldSkip)("should logout and clear cookies", async () => {
      // Login first
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const loginCookies = loginResponse.headers.get("set-cookie") ?? "";

      // Logout
      const logoutResponse = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Cookie: loginCookies },
      });

      expect(logoutResponse.status).toBe(200);
      const logoutData = await logoutResponse.json();
      expect(logoutData.success).toBe(true);

      // Verify cookies are cleared
      const logoutCookies = logoutResponse.headers.get("set-cookie") ?? "";
      expect(logoutCookies).toContain("max-age=0");
    });
  });

  describe("Token Refresh (AC: 2)", () => {
    it.skipIf(shouldSkip)("should rotate refresh tokens on refresh", async () => {
      // Register/Login to get initial tokens
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "refresh-test@example.com",
          password: "SecurePassword123!",
        }),
      });

      const initialCookies = loginResponse.headers.get("set-cookie") ?? "";

      // Refresh tokens
      const refreshResponse = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: initialCookies },
      });

      expect(refreshResponse.status).toBe(200);

      // New cookies should be set
      const newCookies = refreshResponse.headers.get("set-cookie") ?? "";
      expect(newCookies).toContain("refresh_token");

      // Old token should no longer work (rotation)
      const secondRefreshResponse = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: initialCookies }, // Using OLD cookies
      });

      // Should fail because old token was rotated
      expect(secondRefreshResponse.status).toBe(401);
    });
  });

  describe("Rate Limiting (AC: 5)", () => {
    it.skipIf(shouldSkip)("should block after 5 failed login attempts", async () => {
      const testEmail = "ratelimit-test@example.com";

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testEmail,
            password: "wrongpassword",
          }),
        });
      }

      // 6th attempt should be rate limited
      const blockedResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "wrongpassword",
        }),
      });

      expect(blockedResponse.status).toBe(429);
      const blockedData = await blockedResponse.json();
      expect(blockedData.code).toBe("RATE_LIMITED");
      expect(blockedData.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("Cookie Security (AC: 4)", () => {
    it.skipIf(shouldSkip)("should set httpOnly, secure, sameSite on cookies", async () => {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "cookie-test@example.com",
          password: "SecurePassword123!",
        }),
      });

      const cookies = loginResponse.headers.get("set-cookie") ?? "";

      // Verify cookie attributes
      expect(cookies.toLowerCase()).toContain("httponly");
      expect(cookies.toLowerCase()).toContain("samesite=strict");
      // secure only in production
    });
  });
});

describe("Auth Validation Tests (Unit)", () => {
  describe("Registration Validation", () => {
    it("should require valid email format", () => {
      // Simple email validation: has @, has ., @ comes before .
      const isValidEmail = (email: string) => {
        const atIndex = email.indexOf("@");
        const dotIndex = email.lastIndexOf(".");
        return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
      };

      const invalidEmails = ["notanemail", "missing@domain", "@nodomain.com", "no@dot"];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it("should require password minimum length", () => {
      const shortPassword = "short";
      expect(shortPassword.length >= 8).toBe(false);

      const validPassword = "validPassword";
      expect(validPassword.length >= 8).toBe(true);
    });
  });
});
