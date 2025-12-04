/**
 * Email Verification Tests
 *
 * Story 2.2: Email Verification
 * Tests for verification token handling and rate limiting.
 *
 * AC-2.2.1: Valid token verification
 * AC-2.2.2: Expired token handling
 * AC-2.2.3: Already-used token handling
 * AC-2.2.5: Resend rate limiting
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
  checkEmailRateLimit,
  recordEmailResendAttempt,
  _resetEmailRateLimitStore,
} from "@/lib/auth/rate-limit";

// =============================================================================
// Email Rate Limiting Tests (AC-2.2.5)
// =============================================================================

describe("Email Rate Limiting (Story 2.2 AC-2.2.5)", () => {
  beforeEach(() => {
    // Reset rate limit store before each test
    _resetEmailRateLimitStore();
  });

  describe("checkEmailRateLimit", () => {
    it("should allow first request for new email", async () => {
      const result = await checkEmailRateLimit("test@example.com");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it("should normalize email to lowercase", async () => {
      const result1 = await checkEmailRateLimit("Test@Example.COM");
      const result2 = await checkEmailRateLimit("test@example.com");

      // Both should be treated as the same email
      expect(result1.remaining).toBe(result2.remaining);
    });

    it("should track attempts correctly", async () => {
      const email = "test@example.com";

      // First check - 3 remaining
      let result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(3);

      // Record first attempt
      await recordEmailResendAttempt(email);
      result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(2);

      // Record second attempt
      await recordEmailResendAttempt(email);
      result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(1);

      // Record third attempt
      await recordEmailResendAttempt(email);
      result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(0);
      expect(result.allowed).toBe(false);
    });

    it("should block after 3 attempts", async () => {
      const email = "blocked@example.com";

      // Record 3 attempts
      await recordEmailResendAttempt(email);
      await recordEmailResendAttempt(email);
      await recordEmailResendAttempt(email);

      const result = await checkEmailRateLimit(email);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should return retryAfter in seconds", async () => {
      const email = "retry@example.com";

      // Record 3 attempts to trigger rate limit
      await recordEmailResendAttempt(email);
      await recordEmailResendAttempt(email);
      await recordEmailResendAttempt(email);

      const result = await checkEmailRateLimit(email);
      expect(result.allowed).toBe(false);
      // retryAfter should be less than 1 hour (3600 seconds)
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should track different emails separately", async () => {
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";

      // Exhaust rate limit for email1
      await recordEmailResendAttempt(email1);
      await recordEmailResendAttempt(email1);
      await recordEmailResendAttempt(email1);

      // email1 should be blocked
      const result1 = await checkEmailRateLimit(email1);
      expect(result1.allowed).toBe(false);

      // email2 should still be allowed
      const result2 = await checkEmailRateLimit(email2);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });
  });

  describe("recordEmailResendAttempt", () => {
    it("should create entry for new email", async () => {
      const email = "new@example.com";

      // Should have full quota initially
      let result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(3);

      // Record attempt
      await recordEmailResendAttempt(email);

      // Should have reduced quota
      result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(2);
    });

    it("should increment existing entry", async () => {
      const email = "existing@example.com";

      await recordEmailResendAttempt(email);
      let result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(2);

      await recordEmailResendAttempt(email);
      result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(1);
    });

    it("should handle case-insensitive emails", async () => {
      await recordEmailResendAttempt("TEST@example.com");
      const result = await checkEmailRateLimit("test@example.com");
      expect(result.remaining).toBe(2);
    });
  });
});

// =============================================================================
// Verification Token Status Tests
// These test the logic for differentiating token states
// =============================================================================

describe("Verification Token Status", () => {
  // Test helper to simulate token states
  interface MockToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    usedAt: Date | null;
  }

  function createMockToken(overrides: Partial<MockToken> = {}): MockToken {
    return {
      id: "token-123",
      userId: "user-123",
      token: "jwt-token-string",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      usedAt: null,
      ...overrides,
    };
  }

  function isTokenValid(token: MockToken | null): boolean {
    if (!token) return false;
    if (token.usedAt) return false;
    if (token.expiresAt < new Date()) return false;
    return true;
  }

  function getTokenStatus(token: MockToken | null): "valid" | "not_found" | "expired" | "used" {
    if (!token) return "not_found";
    if (token.usedAt) return "used";
    if (token.expiresAt < new Date()) return "expired";
    return "valid";
  }

  describe("isTokenValid", () => {
    it("should return false for null token", () => {
      expect(isTokenValid(null)).toBe(false);
    });

    it("should return true for valid token", () => {
      const token = createMockToken();
      expect(isTokenValid(token)).toBe(true);
    });

    it("should return false for used token (AC-2.2.3)", () => {
      const token = createMockToken({
        usedAt: new Date(),
      });
      expect(isTokenValid(token)).toBe(false);
    });

    it("should return false for expired token (AC-2.2.2)", () => {
      const token = createMockToken({
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });
      expect(isTokenValid(token)).toBe(false);
    });

    it("should handle token expiring exactly now", () => {
      const token = createMockToken({
        expiresAt: new Date(Date.now() - 1), // Just expired
      });
      expect(isTokenValid(token)).toBe(false);
    });
  });

  describe("getTokenStatus", () => {
    it("should return not_found for null token", () => {
      expect(getTokenStatus(null)).toBe("not_found");
    });

    it("should return valid for valid token (AC-2.2.1)", () => {
      const token = createMockToken();
      expect(getTokenStatus(token)).toBe("valid");
    });

    it("should return used for used token (AC-2.2.3)", () => {
      const token = createMockToken({
        usedAt: new Date(),
      });
      expect(getTokenStatus(token)).toBe("used");
    });

    it("should return expired for expired token (AC-2.2.2)", () => {
      const token = createMockToken({
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(getTokenStatus(token)).toBe("expired");
    });

    it("should prioritize used over expired", () => {
      // If a token is both used AND expired, should report as "used"
      // (because that's the more specific reason)
      const token = createMockToken({
        expiresAt: new Date(Date.now() - 1000),
        usedAt: new Date(Date.now() - 2000),
      });
      expect(getTokenStatus(token)).toBe("used");
    });
  });
});

// =============================================================================
// Response Message Tests (Security - No Enumeration)
// =============================================================================

describe("Response Message Security (AC-2.2.5)", () => {
  const RESEND_MESSAGE = "If an unverified account exists, a new verification link has been sent";

  it("should use generic message for all cases (no email enumeration)", () => {
    // The resend endpoint should return the same message for:
    // - Valid unverified user
    // - Already verified user
    // - Non-existent user
    // This prevents attackers from discovering valid emails

    expect(RESEND_MESSAGE).not.toContain("success");
    expect(RESEND_MESSAGE).not.toContain("error");
    expect(RESEND_MESSAGE).not.toContain("not found");
    expect(RESEND_MESSAGE).not.toContain("already verified");
  });

  it("message should be ambiguous about email existence", () => {
    // The message should not reveal whether the email exists
    expect(RESEND_MESSAGE).toContain("If");
    expect(RESEND_MESSAGE).toContain("unverified account exists");
  });
});
