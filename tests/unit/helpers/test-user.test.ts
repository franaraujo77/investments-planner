/**
 * Test User Helper Unit Tests
 *
 * Story 7.16: Fix Integration Test Infrastructure
 * AC-7.16.2: Test helper modules created
 *
 * Tests the test user helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestUser, deleteTestUser, getTestUser } from "@tests/helpers";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
  hash: vi.fn(() => Promise.resolve("hashed_password")),
}));

describe("Test User Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTestUser", () => {
    it("creates a test user with default values", async () => {
      const mockUser = {
        id: "test-user-id",
        email: "test-123@example.com",
        name: "Test User",
        locale: "en-US",
      };

      const { db } = await import("@/lib/db");
      const insertMock = db.insert as ReturnType<typeof vi.fn>;
      const valuesMock = vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockUser])),
      }));
      insertMock.mockReturnValue({ values: valuesMock });

      const result = await createTestUser();

      expect(result).toEqual({
        userId: "test-user-id",
        email: "test-123@example.com",
        name: "Test User",
        locale: "en-US",
      });
    });

    it("creates a test user with custom email", async () => {
      const mockUser = {
        id: "custom-user-id",
        email: "custom@example.com",
        name: "Test User",
        locale: "en-US",
      };

      const { db } = await import("@/lib/db");
      const insertMock = db.insert as ReturnType<typeof vi.fn>;
      const valuesMock = vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockUser])),
      }));
      insertMock.mockReturnValue({ values: valuesMock });

      const result = await createTestUser({ email: "custom@example.com" });

      expect(result.email).toBe("custom@example.com");
    });

    it("creates a test user with custom name and locale", async () => {
      const mockUser = {
        id: "custom-user-id",
        email: "test@example.com",
        name: "Custom Name",
        locale: "pt-BR",
      };

      const { db } = await import("@/lib/db");
      const insertMock = db.insert as ReturnType<typeof vi.fn>;
      const valuesMock = vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockUser])),
      }));
      insertMock.mockReturnValue({ values: valuesMock });

      const result = await createTestUser({
        name: "Custom Name",
        locale: "pt-BR",
      });

      expect(result.name).toBe("Custom Name");
      expect(result.locale).toBe("pt-BR");
    });

    it("hashes the password before storing", async () => {
      const mockUser = {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        locale: "en-US",
      };

      const { db } = await import("@/lib/db");
      const { hash } = await import("bcrypt");
      const insertMock = db.insert as ReturnType<typeof vi.fn>;
      const valuesMock = vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockUser])),
      }));
      insertMock.mockReturnValue({ values: valuesMock });

      await createTestUser({ password: "CustomPassword123!" });

      expect(hash).toHaveBeenCalledWith("CustomPassword123!", 10);
    });

    it("throws error if user creation fails", async () => {
      const { db } = await import("@/lib/db");
      const insertMock = db.insert as ReturnType<typeof vi.fn>;
      const valuesMock = vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      }));
      insertMock.mockReturnValue({ values: valuesMock });

      await expect(createTestUser()).rejects.toThrow("Failed to create test user");
    });
  });

  describe("deleteTestUser", () => {
    it("deletes a user by ID", async () => {
      const { db } = await import("@/lib/db");
      const deleteMock = db.delete as ReturnType<typeof vi.fn>;
      const whereMock = vi.fn();
      deleteMock.mockReturnValue({ where: whereMock });

      await deleteTestUser("user-to-delete");

      expect(deleteMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("properly cleans up even if called during error handling", async () => {
      const { db } = await import("@/lib/db");
      const deleteMock = db.delete as ReturnType<typeof vi.fn>;
      const whereMock = vi.fn();
      deleteMock.mockReturnValue({ where: whereMock });

      // Simulate cleanup in finally block after error
      let errorCaught = false;
      try {
        throw new Error("Test error");
      } catch (_error) {
        errorCaught = true;
        // Cleanup would happen here in real tests
        await deleteTestUser("user-cleanup-test");
      }

      // Verify error was caught and cleanup executed
      expect(errorCaught).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe("getTestUser", () => {
    it("returns default test user object", () => {
      const result = getTestUser();

      expect(result).toEqual({
        email: "test@example.com",
        password: "Test123!@#",
        name: "Test User",
        locale: "en-US",
      });
    });

    it("returns a new object each time (not a singleton)", () => {
      const result1 = getTestUser();
      const result2 = getTestUser();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object references
    });
  });
});
