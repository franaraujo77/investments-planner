/**
 * JWT Utilities Tests
 *
 * Tests for Story 1.3 AC1: JWT access token (15min) and refresh token (7d)
 *
 * NOTE: These tests require Vitest (Story 1.7) to be installed.
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";

// Mock AUTH_SECRET environment variable
beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-key-at-least-32-characters-long");
});

describe("Access Token Signing (AC: 1)", () => {
  it("should create a valid JWT token", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
    };

    const token = await signAccessToken(payload);

    // JWT should have 3 parts separated by dots
    expect(token.split(".")).toHaveLength(3);
  });

  it("should include correct payload fields", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
    };

    const token = await signAccessToken(payload);
    const decoded = await verifyAccessToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it("should set correct expiry time (15 minutes)", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
    };

    const beforeSign = Math.floor(Date.now() / 1000);
    const token = await signAccessToken(payload);
    const decoded = await verifyAccessToken(token);

    // exp should be ~15 minutes (900 seconds) after iat
    const expectedExpiry = beforeSign + 15 * 60;
    expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 1);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
  });
});

describe("Refresh Token Signing (AC: 1)", () => {
  it("should create a valid JWT token", async () => {
    const payload = {
      userId: "user-123",
      tokenId: "token-456",
    };

    const token = await signRefreshToken(payload);

    // JWT should have 3 parts separated by dots
    expect(token.split(".")).toHaveLength(3);
  });

  it("should set 7-day expiry by default", async () => {
    const payload = {
      userId: "user-123",
      tokenId: "token-456",
    };

    const beforeSign = Math.floor(Date.now() / 1000);
    const token = await signRefreshToken(payload);
    const decoded = await verifyRefreshToken(token);

    // exp should be ~7 days (604800 seconds) after iat
    const expectedExpiry = beforeSign + 7 * 24 * 60 * 60;
    expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 1);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
  });

  it("should set 30-day expiry with remember flag", async () => {
    const payload = {
      userId: "user-123",
      tokenId: "token-456",
    };

    const beforeSign = Math.floor(Date.now() / 1000);
    const token = await signRefreshToken(payload, true);
    const decoded = await verifyRefreshToken(token);

    // exp should be ~30 days after iat
    const expectedExpiry = beforeSign + 30 * 24 * 60 * 60;
    expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 1);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
  });
});

describe("Access Token Verification", () => {
  it("should verify valid token", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
    };

    const token = await signAccessToken(payload);
    const decoded = await verifyAccessToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it("should reject token with invalid signature", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
    };

    const token = await signAccessToken(payload);
    // Tamper with the signature
    const tamperedToken = token.slice(0, -5) + "xxxxx";

    await expect(verifyAccessToken(tamperedToken)).rejects.toThrow("Invalid token");
  });

  it("should reject expired token", async () => {
    // Mock time to create an expired token
    const originalDateNow = Date.now;
    const pastTime = Date.now() - 20 * 60 * 1000; // 20 minutes ago

    Date.now = vi.fn(() => pastTime);

    const payload = {
      userId: "user-123",
      email: "test@example.com",
    };

    const token = await signAccessToken(payload);

    // Restore time for verification
    Date.now = originalDateNow;

    await expect(verifyAccessToken(token)).rejects.toThrow("expired");
  });

  it("should reject malformed token", async () => {
    await expect(verifyAccessToken("not.a.valid.token")).rejects.toThrow();
    await expect(verifyAccessToken("")).rejects.toThrow();
    await expect(verifyAccessToken("random-string")).rejects.toThrow();
  });
});

describe("Refresh Token Verification", () => {
  it("should verify valid token", async () => {
    const payload = {
      userId: "user-123",
      tokenId: "token-456",
    };

    const token = await signRefreshToken(payload);
    const decoded = await verifyRefreshToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.tokenId).toBe(payload.tokenId);
  });

  it("should reject token with invalid signature", async () => {
    const payload = {
      userId: "user-123",
      tokenId: "token-456",
    };

    const token = await signRefreshToken(payload);
    const tamperedToken = token.slice(0, -5) + "xxxxx";

    await expect(verifyRefreshToken(tamperedToken)).rejects.toThrow("Invalid token");
  });
});

describe("Environment Configuration", () => {
  it("should throw if AUTH_SECRET is not set", async () => {
    vi.stubEnv("AUTH_SECRET", "");

    await expect(
      signAccessToken({ userId: "user-123", email: "test@example.com" })
    ).rejects.toThrow("AUTH_SECRET");
  });

  it("should throw if AUTH_SECRET is too short", async () => {
    vi.stubEnv("AUTH_SECRET", "short-secret");

    await expect(
      signAccessToken({ userId: "user-123", email: "test@example.com" })
    ).rejects.toThrow("32 characters");
  });
});
