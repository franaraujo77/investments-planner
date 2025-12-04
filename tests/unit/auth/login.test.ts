/**
 * Login Unit Tests
 *
 * Story 2.3: User Login
 *
 * Tests for login API endpoint and related functionality.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock cache config to use in-memory fallback
vi.mock("@/lib/cache/config", () => ({
  getCacheConfig: vi.fn(() => ({ enabled: false })),
}));

// Mock logger to prevent console output in tests
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  _resetRateLimitStore,
} from "@/lib/auth/rate-limit";
import { AUTH_CONSTANTS, AUTH_MESSAGES } from "@/lib/auth/constants";
import { loginFormSchema } from "@/lib/auth/validation";

describe("Login Validation Schema", () => {
  it("should accept valid login input", () => {
    const input = {
      email: "test@example.com",
      password: "password123",
      remember: true,
    };

    const result = loginFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject empty email", () => {
    const input = {
      email: "",
      password: "password123",
      remember: false,
    };

    const result = loginFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Email is required");
    }
  });

  it("should reject invalid email format", () => {
    const input = {
      email: "not-an-email",
      password: "password123",
      remember: false,
    };

    const result = loginFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(AUTH_MESSAGES.INVALID_EMAIL);
    }
  });

  it("should reject empty password", () => {
    const input = {
      email: "test@example.com",
      password: "",
      remember: false,
    };

    const result = loginFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Password is required");
    }
  });

  it("should require remember field to be present", () => {
    const inputWithRemember = {
      email: "test@example.com",
      password: "password123",
      remember: false,
    };

    const resultWith = loginFormSchema.safeParse(inputWithRemember);
    expect(resultWith.success).toBe(true);
    if (resultWith.success) {
      expect(resultWith.data.remember).toBe(false);
    }

    // Without remember field should fail
    const inputWithout = {
      email: "test@example.com",
      password: "password123",
    };
    const resultWithout = loginFormSchema.safeParse(inputWithout);
    expect(resultWithout.success).toBe(false);
  });
});

describe("Login Rate Limiting", () => {
  const testIp = "192.168.1.100";

  beforeEach(() => {
    _resetRateLimitStore();
  });

  it("should allow first login attempt", async () => {
    const result = await checkRateLimit(testIp);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS);
  });

  it("should decrement remaining attempts after failure", async () => {
    await recordFailedAttempt(testIp);
    const result = await checkRateLimit(testIp);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS - 1);
  });

  it("should block after max failed attempts (AC-2.3.4)", async () => {
    // Exhaust all attempts
    for (let i = 0; i < AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS; i++) {
      await recordFailedAttempt(testIp);
    }

    const result = await checkRateLimit(testIp);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should clear rate limit after successful login", async () => {
    // Record some failures
    for (let i = 0; i < 3; i++) {
      await recordFailedAttempt(testIp);
    }

    // Clear on success
    await clearRateLimit(testIp);

    const result = await checkRateLimit(testIp);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS);
  });

  it("should track rate limits per IP independently", async () => {
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";

    // Exhaust ip1's attempts
    for (let i = 0; i < AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS; i++) {
      await recordFailedAttempt(ip1);
    }

    // ip2 should still be allowed
    const result1 = await checkRateLimit(ip1);
    const result2 = await checkRateLimit(ip2);

    expect(result1.allowed).toBe(false);
    expect(result2.allowed).toBe(true);
  });
});

describe("Login Constants", () => {
  it("should have correct token expiry values", () => {
    expect(AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY).toBe(15 * 60); // 15 minutes
    expect(AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY).toBe(7 * 24 * 60 * 60); // 7 days
    expect(AUTH_CONSTANTS.REMEMBER_ME_EXPIRY).toBe(30 * 24 * 60 * 60); // 30 days
  });

  it("should have rate limit configuration (AC-2.3.4)", () => {
    expect(AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS).toBe(5);
    expect(AUTH_CONSTANTS.RATE_LIMIT_WINDOW_MS).toBe(60 * 60 * 1000); // 1 hour
  });

  it("should have correct error messages", () => {
    expect(AUTH_MESSAGES.INVALID_CREDENTIALS).toBe("Invalid email or password");
    expect(AUTH_MESSAGES.RATE_LIMITED).toBe("Too many login attempts. Please try again later.");
    expect(AUTH_MESSAGES.EMAIL_NOT_VERIFIED).toBe("Please verify your email before logging in");
  });
});

describe("Login Security", () => {
  it("should use same error message for non-existent user and wrong password (AC-2.3.3)", () => {
    // Both cases should return the same message to prevent email enumeration
    expect(AUTH_MESSAGES.INVALID_CREDENTIALS).toBe("Invalid email or password");
  });

  it("should have bcrypt cost factor of 12", () => {
    expect(AUTH_CONSTANTS.BCRYPT_COST_FACTOR).toBe(12);
  });
});
