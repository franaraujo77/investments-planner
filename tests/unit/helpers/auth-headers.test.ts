/**
 * Auth Headers Helper Unit Tests
 *
 * Story 7.16: Fix Integration Test Infrastructure
 * AC-7.16.2: Test helper modules created
 *
 * Tests the authentication header helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthToken, getAuthHeaders } from "@tests/helpers";
import { jwtVerify } from "jose";

describe("Auth Headers Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = "test-secret-key-for-tests";
  });

  describe("createAuthToken", () => {
    it("creates a valid JWT token for a user ID", async () => {
      const userId = "test-user-123";
      const token = await createAuthToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
    });

    it("encodes user ID in the token payload", async () => {
      const userId = "test-user-456";
      const token = await createAuthToken(userId);

      // Verify token contains user ID
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      expect(payload.userId).toBe(userId);
    });

    it("sets expiration time correctly", async () => {
      const userId = "test-user-789";
      const token = await createAuthToken(userId, "1h");

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      // exp should be roughly 1 hour from iat
      const hourInSeconds = 60 * 60;
      const timeDiff = (payload.exp as number) - (payload.iat as number);
      expect(timeDiff).toBeGreaterThanOrEqual(hourInSeconds - 5); // Allow 5s tolerance
      expect(timeDiff).toBeLessThanOrEqual(hourInSeconds + 5);
    });

    it("defaults to 15m expiration if not specified", async () => {
      const userId = "test-user-default";
      const token = await createAuthToken(userId);

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      // exp should be roughly 15 minutes from iat
      const fifteenMinutesInSeconds = 15 * 60;
      const timeDiff = (payload.exp as number) - (payload.iat as number);
      expect(timeDiff).toBeGreaterThanOrEqual(fifteenMinutesInSeconds - 5);
      expect(timeDiff).toBeLessThanOrEqual(fifteenMinutesInSeconds + 5);
    });

    it("throws error if JWT_SECRET not set", async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      const userId = "test-user-no-secret";

      await expect(createAuthToken(userId)).rejects.toThrow(
        "JWT_SECRET environment variable is required for integration tests"
      );

      // Restore for other tests
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe("getAuthHeaders", () => {
    it("returns headers with Authorization and Content-Type", async () => {
      const userId = "test-user-headers";
      const headers = await getAuthHeaders(userId);

      expect(headers).toHaveProperty("Authorization");
      expect(headers).toHaveProperty("Content-Type");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("includes Bearer token in Authorization header", async () => {
      const userId = "test-user-bearer";
      const headers = await getAuthHeaders(userId);

      expect(headers.Authorization).toMatch(/^Bearer .+/);
      const token = headers.Authorization.replace("Bearer ", "");
      expect(token.split(".")).toHaveLength(3); // Valid JWT format
    });

    it("creates a valid token in the Authorization header", async () => {
      const userId = "test-user-valid-header";
      const headers = await getAuthHeaders(userId);

      const token = headers.Authorization.replace("Bearer ", "");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      expect(payload.userId).toBe(userId);
    });
  });
});
