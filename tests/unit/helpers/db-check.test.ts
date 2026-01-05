/**
 * Database Check Helper Unit Tests
 *
 * Story 7.16: Fix Integration Test Infrastructure
 * AC-7.16.5: Graceful handling of database unavailability
 *
 * Tests the database availability check helper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isDatabaseAvailable, getDatabaseSkipMessage } from "@tests/helpers";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("Database Check Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isDatabaseAvailable", () => {
    it("returns true when database query succeeds", async () => {
      const { db } = await import("@/lib/db");
      const executeMock = db.execute as ReturnType<typeof vi.fn>;
      executeMock.mockResolvedValue(undefined);

      const result = await isDatabaseAvailable();

      expect(result).toBe(true);
      expect(executeMock).toHaveBeenCalledOnce();
    });

    it("returns false when database query fails", async () => {
      const { db } = await import("@/lib/db");
      const executeMock = db.execute as ReturnType<typeof vi.fn>;
      executeMock.mockRejectedValue(new Error("Connection refused"));

      const result = await isDatabaseAvailable();

      expect(result).toBe(false);
      expect(executeMock).toHaveBeenCalledOnce();
    });

    it("returns false when database query throws connection error", async () => {
      const { db } = await import("@/lib/db");
      const executeMock = db.execute as ReturnType<typeof vi.fn>;
      executeMock.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await isDatabaseAvailable();

      expect(result).toBe(false);
    });

    it("returns false when database query throws timeout error", async () => {
      const { db } = await import("@/lib/db");
      const executeMock = db.execute as ReturnType<typeof vi.fn>;
      executeMock.mockRejectedValue(new Error("ETIMEDOUT"));

      const result = await isDatabaseAvailable();

      expect(result).toBe(false);
    });
  });

  describe("getDatabaseSkipMessage", () => {
    it("returns a helpful message for skipped tests", () => {
      const message = getDatabaseSkipMessage();

      expect(message).toContain("Database connection unavailable");
      expect(message).toContain("PostgreSQL");
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("pnpm db:migrate");
    });

    it("returns a message with instructions on enabling tests", () => {
      const message = getDatabaseSkipMessage();

      expect(message).toContain("To enable these tests:");
      expect(message).toContain("Start a PostgreSQL instance");
      expect(message).toContain("Set DATABASE_URL");
    });

    it("references the documentation", () => {
      const message = getDatabaseSkipMessage();

      expect(message).toContain("docs/testing/integration-tests.md");
    });
  });
});
