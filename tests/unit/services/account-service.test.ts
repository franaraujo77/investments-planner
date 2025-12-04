/**
 * Account Service Unit Tests
 *
 * Story 2.8: Account Deletion
 *
 * Tests for account service functions:
 * - AC-2.8.3: Cascade data deletion (soft delete user, hard delete tokens)
 * - AC-2.8.4: Soft delete with 30-day purge window
 * - AC-2.8.5: Logout and redirect after deletion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockUserResult: unknown[] = [];
let mockInvalidateCacheError: Error | null = null;
let mockInngestSendError: Error | null = null;

// Mock drizzle-orm operators first (before db mock)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
}));

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve(mockUserResult)),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", deletedAt: "deleted_at", updatedAt: "updated_at" },
  refreshTokens: { userId: "user_id" },
  verificationTokens: { userId: "user_id" },
  passwordResetTokens: { userId: "user_id" },
  calculationEvents: { userId: "user_id" },
}));

// Mock cache invalidation
vi.mock("@/lib/cache/invalidation", () => ({
  invalidateUserCache: vi.fn(() => {
    if (mockInvalidateCacheError) {
      return Promise.reject(mockInvalidateCacheError);
    }
    return Promise.resolve();
  }),
}));

// Mock Inngest client
vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: vi.fn(() => {
      if (mockInngestSendError) {
        return Promise.reject(mockInngestSendError);
      }
      return Promise.resolve({ ids: ["event-123"] });
    }),
  },
}));

// Import after mocks
import {
  deleteUserAccount,
  hardDeleteUserData,
  PURGE_DELAY_DAYS,
} from "@/lib/services/account-service";

describe("Account Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-02T12:00:00.000Z"));
    // Reset mock control variables
    mockUserResult = [];
    mockInvalidateCacheError = null;
    mockInngestSendError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("PURGE_DELAY_DAYS", () => {
    it("should be 30 days (GDPR compliance)", () => {
      expect(PURGE_DELAY_DAYS).toBe(30);
    });
  });

  describe("deleteUserAccount", () => {
    it("should throw error if user not found", async () => {
      mockUserResult = [];

      await expect(deleteUserAccount(mockUserId)).rejects.toThrow("User not found");
    });

    it("should throw error if user is already deleted", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: new Date("2025-12-01T00:00:00.000Z"),
        },
      ];

      await expect(deleteUserAccount(mockUserId)).rejects.toThrow(
        "User account is already deleted"
      );
    });

    it("should return success when user exists and not deleted (AC-2.8.3)", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: null,
        },
      ];

      const result = await deleteUserAccount(mockUserId);

      expect(result.success).toBe(true);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    it("should calculate correct scheduled purge date (AC-2.8.4)", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: null,
        },
      ];

      const result = await deleteUserAccount(mockUserId);

      const expectedPurgeDate = new Date("2025-12-02T12:00:00.000Z");
      expectedPurgeDate.setDate(expectedPurgeDate.getDate() + 30);

      expect(result.scheduledPurgeDate.getTime()).toBe(expectedPurgeDate.getTime());
    });

    it("should continue even if cache invalidation fails", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: null,
        },
      ];
      mockInvalidateCacheError = new Error("Cache error");

      const result = await deleteUserAccount(mockUserId);

      expect(result.success).toBe(true);
    });

    it("should continue even if Inngest send fails", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: null,
        },
      ];
      mockInngestSendError = new Error("Inngest error");

      const result = await deleteUserAccount(mockUserId);

      expect(result.success).toBe(true);
    });

    it("should return success with correct result structure", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: null,
        },
      ];

      const result = await deleteUserAccount(mockUserId);

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("deletedAt");
      expect(result).toHaveProperty("scheduledPurgeDate");
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(result.scheduledPurgeDate).toBeInstanceOf(Date);
    });
  });

  describe("hardDeleteUserData", () => {
    it("should silently return if user not found", async () => {
      mockUserResult = [];

      await expect(hardDeleteUserData(mockUserId)).resolves.not.toThrow();
    });

    it("should throw error if user is not soft-deleted", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: null,
        },
      ];

      await expect(hardDeleteUserData(mockUserId)).rejects.toThrow(
        "Cannot hard delete a user that is not soft-deleted"
      );
    });

    it("should complete without error when user is soft-deleted", async () => {
      mockUserResult = [
        {
          id: mockUserId,
          deletedAt: new Date("2025-11-02T00:00:00.000Z"),
        },
      ];

      await expect(hardDeleteUserData(mockUserId)).resolves.not.toThrow();
    });
  });
});
