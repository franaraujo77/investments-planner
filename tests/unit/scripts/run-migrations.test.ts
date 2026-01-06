/**
 * Unit tests for run-migrations.ts script
 * Story 7.18: Programmatic Migration Implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type postgres from "postgres";

// Mock dependencies before importing the module under test
const mockMigrate = vi.fn();
const mockDrizzle = vi.fn();
const mockPostgres = vi.fn();
const mockExistsSync = vi.fn();
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: mockDrizzle,
}));

vi.mock("drizzle-orm/postgres-js/migrator", () => ({
  migrate: mockMigrate,
}));

vi.mock("postgres", () => ({
  default: mockPostgres,
}));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: mockLogger,
}));

describe("run-migrations.ts", () => {
  const originalEnv = process.env;
  let runMigrations: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    // Default successful mocks
    mockExistsSync.mockReturnValue(true);
    mockDrizzle.mockReturnValue({});

    // Mock sql connection with query method
    const mockSqlQuery = vi.fn().mockResolvedValue([{ count: "28" }]);
    const mockSqlEnd = vi.fn().mockResolvedValue(undefined);
    const mockSqlConnection = Object.assign(mockSqlQuery, {
      end: mockSqlEnd,
    }) as unknown as ReturnType<typeof postgres>;

    mockPostgres.mockReturnValue(mockSqlConnection);
    mockMigrate.mockResolvedValue(undefined);

    // Import the function to test
    const migrationModule = await import("../../../scripts/run-migrations");
    runMigrations = migrationModule.runMigrations;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("Environment validation", () => {
    it("should throw error when DATABASE_URL is not set", async () => {
      delete process.env.DATABASE_URL;

      await expect(runMigrations()).rejects.toThrow("DATABASE_URL is required");

      expect(mockLogger.error).toHaveBeenCalledWith("DATABASE_URL environment variable is not set");
    });

    it("should throw error when DATABASE_URL is empty string", async () => {
      process.env.DATABASE_URL = "";

      await expect(runMigrations()).rejects.toThrow("DATABASE_URL is required");

      expect(mockLogger.error).toHaveBeenCalledWith("DATABASE_URL environment variable is not set");
    });
  });

  describe("Migrations folder validation", () => {
    it("should throw error when migrations folder does not exist", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
      mockExistsSync.mockReturnValue(false);

      await expect(runMigrations()).rejects.toThrow('Migrations folder "./drizzle" does not exist');

      expect(mockLogger.error).toHaveBeenCalledWith("Migrations folder not found", {
        migrationsFolder: "./drizzle",
      });
    });

    it("should proceed when migrations folder exists", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
      mockExistsSync.mockReturnValue(true);

      await runMigrations();

      expect(mockExistsSync).toHaveBeenCalledWith("./drizzle");
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        "Migrations folder not found",
        expect.anything()
      );
    });
  });

  describe("Database connection", () => {
    it("should create postgres connection with correct configuration", async () => {
      const testUrl = "postgresql://test:test@localhost/test";
      process.env.DATABASE_URL = testUrl;

      await runMigrations();

      expect(mockPostgres).toHaveBeenCalledWith(testUrl, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        max_lifetime: 300,
      });
    });

    it("should close connection in finally block even on success", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

      await runMigrations();

      const mockSql = mockPostgres.mock.results[0]?.value;
      expect(mockSql?.end).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Database connection closed");
    });

    it("should close connection in finally block even on migration failure", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
      mockMigrate.mockRejectedValue(new Error("Migration failed"));

      await expect(runMigrations()).rejects.toThrow("Migration failed");

      const mockSql = mockPostgres.mock.results[0]?.value;
      expect(mockSql?.end).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Database connection closed");
    });
  });

  describe("Migration execution", () => {
    it("should call migrate with correct configuration", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

      await runMigrations();

      expect(mockMigrate).toHaveBeenCalledWith(expect.anything(), {
        migrationsFolder: "./drizzle",
        migrationsTable: "__drizzle_migrations",
        migrationsSchema: "drizzle",
      });
    });

    it("should log migration start with configuration details", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

      await runMigrations();

      expect(mockLogger.info).toHaveBeenCalledWith("Starting database migrations", {
        migrationsFolder: "./drizzle",
        migrationsTable: "__drizzle_migrations",
        migrationsSchema: "drizzle",
      });
    });

    it("should verify migrations were applied by querying tracking table", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

      await runMigrations();

      const mockSql = mockPostgres.mock.results[0]?.value;
      expect(mockSql).toHaveBeenCalled();
      // Verify the SQL query was executed (the mock function itself is called)
      expect(mockSql?.mock?.calls?.length).toBeGreaterThan(0);
    });

    it("should log success with migration count", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

      await runMigrations();

      expect(mockLogger.info).toHaveBeenCalledWith("Migrations applied successfully", {
        migrationsApplied: 28,
      });
    });

    it("should handle zero migrations applied", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

      const mockSqlQuery = vi.fn().mockResolvedValue([{ count: "0" }]);
      const mockSqlEnd = vi.fn().mockResolvedValue(undefined);
      const mockSqlConnection = Object.assign(mockSqlQuery, {
        end: mockSqlEnd,
      }) as unknown as ReturnType<typeof postgres>;
      mockPostgres.mockReturnValue(mockSqlConnection);

      // Re-import to get new mocked connection
      vi.resetModules();
      const migrationModule = await import("../../../scripts/run-migrations");
      await migrationModule.runMigrations();

      expect(mockLogger.info).toHaveBeenCalledWith("Migrations applied successfully", {
        migrationsApplied: 0,
      });
    });
  });

  describe("Error handling", () => {
    it("should log error details when migration fails", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
      const testError = new Error("Migration execution failed");
      testError.stack = "Error stack trace";
      mockMigrate.mockRejectedValue(testError);

      await expect(runMigrations()).rejects.toThrow("Migration execution failed");

      expect(mockLogger.error).toHaveBeenCalledWith("Migration failed", {
        error: "Migration execution failed",
        stack: "Error stack trace",
      });
    });

    it("should handle non-Error exceptions", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
      mockMigrate.mockRejectedValue("String error");

      await expect(runMigrations()).rejects.toBe("String error");

      expect(mockLogger.error).toHaveBeenCalledWith("Migration failed", {
        error: "String error",
        stack: undefined,
      });
    });

    it("should rethrow errors after logging", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
      const testError = new Error("Migration failed");
      mockMigrate.mockRejectedValue(testError);

      await expect(runMigrations()).rejects.toThrow("Migration failed");
    });
  });
});
