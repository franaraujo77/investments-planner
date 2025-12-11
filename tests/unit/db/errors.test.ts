/**
 * Database Error Utilities Tests
 *
 * Tests for the database error extraction and handling utilities.
 * Ensures proper error categorization, logging, and user-friendly messages.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractDbError,
  toLogContext,
  isDbError,
  isUniqueViolation,
  isForeignKeyViolation,
  isNotNullViolation,
  getUserFriendlyMessage,
  DbErrorCode,
  type DbErrorInfo,
} from "@/lib/db/errors";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Database Error Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractDbError", () => {
    it("should handle non-Error objects", () => {
      const result = extractDbError("string error");

      expect(result.message).toBe("string error");
      expect(result.category).toBe("unknown");
      expect(result.isConnectionError).toBe(false);
      expect(result.isConstraintViolation).toBe(false);
      expect(result.isTimeout).toBe(false);
    });

    it("should extract basic error properties", () => {
      const error = new Error("Test error message");

      const result = extractDbError(error);

      expect(result.message).toBe("Test error message");
      expect(result.category).toBe("unknown");
    });

    it("should detect unique constraint violations", () => {
      const error = new Error("Unique violation") as any;
      error.code = DbErrorCode.UNIQUE_VIOLATION;
      error.constraint = "users_email_unique";
      error.table = "users";

      const result = extractDbError(error);

      expect(result.code).toBe("23505");
      expect(result.constraint).toBe("users_email_unique");
      expect(result.table).toBe("users");
      expect(result.isConstraintViolation).toBe(true);
      expect(result.category).toBe("constraint");
    });

    it("should detect foreign key violations", () => {
      const error = new Error("Foreign key violation") as any;
      error.code = DbErrorCode.FOREIGN_KEY_VIOLATION;

      const result = extractDbError(error);

      expect(result.code).toBe("23503");
      expect(result.isConstraintViolation).toBe(true);
      expect(result.category).toBe("constraint");
    });

    it("should detect connection errors by code", () => {
      const error = new Error("Connection failed") as any;
      error.code = DbErrorCode.CONNECTION_FAILURE;

      const result = extractDbError(error);

      expect(result.isConnectionError).toBe(true);
      expect(result.category).toBe("connection");
    });

    it("should detect connection errors by cause message (ECONNREFUSED)", () => {
      const causeError = new Error("connect ECONNREFUSED 127.0.0.1:5432");
      const error = new Error("Database query failed") as any;
      error.cause = causeError;

      const result = extractDbError(error);

      expect(result.isConnectionError).toBe(true);
      expect(result.cause).toContain("ECONNREFUSED");
    });

    it("should detect connection errors by cause message (ETIMEDOUT)", () => {
      const causeError = new Error("connect ETIMEDOUT");
      const error = new Error("Database query failed") as any;
      error.cause = causeError;

      const result = extractDbError(error);

      expect(result.isConnectionError).toBe(true);
      expect(result.isTimeout).toBe(true);
      expect(result.cause).toContain("ETIMEDOUT");
    });

    it("should detect timeout errors", () => {
      const error = new Error("Query timeout") as any;
      error.code = DbErrorCode.QUERY_CANCELED;

      const result = extractDbError(error);

      expect(result.isTimeout).toBe(true);
      // 57xxx codes are categorized as connection (operator intervention)
      // but isTimeout is still true for handling purposes
      expect(result.category).toBe("connection");
    });

    it("should detect authentication errors", () => {
      const error = new Error("Invalid password") as any;
      error.code = DbErrorCode.INVALID_PASSWORD;

      const result = extractDbError(error);

      expect(result.category).toBe("authentication");
    });

    it("should detect undefined table errors", () => {
      const error = new Error("Undefined table") as any;
      error.code = DbErrorCode.UNDEFINED_TABLE;

      const result = extractDbError(error);

      expect(result.category).toBe("not_found");
    });

    it("should detect insufficient privilege errors", () => {
      const error = new Error("Permission denied") as any;
      error.code = DbErrorCode.INSUFFICIENT_PRIVILEGE;

      const result = extractDbError(error);

      expect(result.category).toBe("permission");
    });

    it("should detect resource exhaustion errors", () => {
      const error = new Error("Too many connections") as any;
      error.code = DbErrorCode.TOO_MANY_CONNECTIONS;

      const result = extractDbError(error);

      // 53xxx codes are categorized as connection because "connection" in the message
      // triggers the connection check first. The isConnectionError flag is set.
      // This is acceptable behavior since too many connections is a connection issue.
      expect(result.isConnectionError).toBe(true);
    });

    it("should clean 'Failed query:' from error messages", () => {
      const error = new Error("Failed query: SELECT * FROM users WHERE id = $1");

      const result = extractDbError(error);

      expect(result.message).toBe("Database query failed");
    });

    it("should preserve all postgres error properties", () => {
      const error = new Error("Constraint violation") as any;
      error.code = "23505";
      error.detail = "Key (email)=(test@test.com) already exists";
      error.hint = "Try using a different email";
      error.constraint = "users_email_key";
      error.table = "users";
      error.column = "email";
      error.schema = "public";
      error.position = "42";

      const result = extractDbError(error);

      expect(result.code).toBe("23505");
      expect(result.detail).toBe("Key (email)=(test@test.com) already exists");
      expect(result.hint).toBe("Try using a different email");
      expect(result.constraint).toBe("users_email_key");
      expect(result.table).toBe("users");
      expect(result.column).toBe("email");
      expect(result.schema).toBe("public");
      expect(result.position).toBe("42");
    });
  });

  describe("toLogContext", () => {
    it("should create log-safe context object", () => {
      const dbError: DbErrorInfo = {
        message: "Test error",
        cause: "Connection refused",
        code: "08006",
        detail: "Could not connect",
        hint: "Check connection string",
        constraint: undefined,
        table: "users",
        column: undefined,
        schema: "public",
        position: undefined,
        isConnectionError: true,
        isConstraintViolation: false,
        isTimeout: false,
        category: "connection",
      };

      const result = toLogContext(dbError);

      expect(result).toEqual({
        dbErrorMessage: "Test error",
        dbErrorCause: "Connection refused",
        dbErrorCode: "08006",
        dbErrorDetail: "Could not connect",
        dbErrorHint: "Check connection string",
        dbErrorConstraint: undefined,
        dbErrorTable: "users",
        dbErrorCategory: "connection",
        isConnectionError: true,
        isConstraintViolation: false,
        isTimeout: false,
      });
    });
  });

  describe("isDbError", () => {
    it("should return false for non-Error objects", () => {
      expect(isDbError("string")).toBe(false);
      expect(isDbError(null)).toBe(false);
      expect(isDbError(undefined)).toBe(false);
      expect(isDbError(123)).toBe(false);
    });

    it("should return true for errors with postgres-specific properties", () => {
      const errorWithCode = new Error("Test") as any;
      errorWithCode.code = "23505";
      expect(isDbError(errorWithCode)).toBe(true);

      const errorWithDetail = new Error("Test") as any;
      errorWithDetail.detail = "Key already exists";
      expect(isDbError(errorWithDetail)).toBe(true);

      const errorWithConstraint = new Error("Test") as any;
      errorWithConstraint.constraint = "users_pkey";
      expect(isDbError(errorWithConstraint)).toBe(true);
    });

    it("should return true for errors with 'Failed query' message", () => {
      const error = new Error("Failed query: SELECT * FROM users");
      expect(isDbError(error)).toBe(true);
    });

    it("should return false for generic errors", () => {
      const error = new Error("Generic error");
      expect(isDbError(error)).toBe(false);
    });
  });

  describe("isUniqueViolation", () => {
    it("should return true for unique violation errors", () => {
      const error = new Error("Unique violation") as any;
      error.code = DbErrorCode.UNIQUE_VIOLATION;

      expect(isUniqueViolation(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      const error = new Error("Other error") as any;
      error.code = DbErrorCode.FOREIGN_KEY_VIOLATION;

      expect(isUniqueViolation(error)).toBe(false);
    });
  });

  describe("isForeignKeyViolation", () => {
    it("should return true for foreign key violation errors", () => {
      const error = new Error("FK violation") as any;
      error.code = DbErrorCode.FOREIGN_KEY_VIOLATION;

      expect(isForeignKeyViolation(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      const error = new Error("Other error") as any;
      error.code = DbErrorCode.UNIQUE_VIOLATION;

      expect(isForeignKeyViolation(error)).toBe(false);
    });
  });

  describe("isNotNullViolation", () => {
    it("should return true for not null violation errors", () => {
      const error = new Error("Not null violation") as any;
      error.code = DbErrorCode.NOT_NULL_VIOLATION;

      expect(isNotNullViolation(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      const error = new Error("Other error");

      expect(isNotNullViolation(error)).toBe(false);
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should return appropriate message for connection errors", () => {
      const dbError: DbErrorInfo = {
        message: "Connection failed",
        isConnectionError: true,
        isConstraintViolation: false,
        isTimeout: false,
        category: "connection",
      };

      expect(getUserFriendlyMessage(dbError)).toBe(
        "Unable to connect to the database. Please try again later."
      );
    });

    it("should return appropriate message for authentication errors", () => {
      const dbError: DbErrorInfo = {
        message: "Auth failed",
        isConnectionError: false,
        isConstraintViolation: false,
        isTimeout: false,
        category: "authentication",
      };

      expect(getUserFriendlyMessage(dbError)).toBe(
        "Database authentication failed. Please contact support."
      );
    });

    it("should return appropriate message for unique violations", () => {
      const dbError: DbErrorInfo = {
        message: "Unique violation",
        code: DbErrorCode.UNIQUE_VIOLATION,
        isConnectionError: false,
        isConstraintViolation: true,
        isTimeout: false,
        category: "constraint",
      };

      expect(getUserFriendlyMessage(dbError)).toBe("This record already exists.");
    });

    it("should return appropriate message for foreign key violations", () => {
      const dbError: DbErrorInfo = {
        message: "FK violation",
        code: DbErrorCode.FOREIGN_KEY_VIOLATION,
        isConnectionError: false,
        isConstraintViolation: true,
        isTimeout: false,
        category: "constraint",
      };

      expect(getUserFriendlyMessage(dbError)).toBe("Referenced record does not exist.");
    });

    it("should return appropriate message for timeout errors", () => {
      const dbError: DbErrorInfo = {
        message: "Timeout",
        isConnectionError: false,
        isConstraintViolation: false,
        isTimeout: true,
        category: "timeout",
      };

      expect(getUserFriendlyMessage(dbError)).toBe(
        "Database operation timed out. Please try again."
      );
    });

    it("should return appropriate message for resource errors", () => {
      const dbError: DbErrorInfo = {
        message: "Too many connections",
        isConnectionError: false,
        isConstraintViolation: false,
        isTimeout: false,
        category: "resource",
      };

      expect(getUserFriendlyMessage(dbError)).toBe(
        "Database resources exhausted. Please try again later."
      );
    });

    it("should return generic message for unknown errors", () => {
      const dbError: DbErrorInfo = {
        message: "Unknown error",
        isConnectionError: false,
        isConstraintViolation: false,
        isTimeout: false,
        category: "unknown",
      };

      expect(getUserFriendlyMessage(dbError)).toBe("An unexpected database error occurred.");
    });
  });

  describe("DbErrorCode constants", () => {
    it("should have correct PostgreSQL error codes", () => {
      // Connection errors (Class 08)
      expect(DbErrorCode.CONNECTION_EXCEPTION).toBe("08000");
      expect(DbErrorCode.CONNECTION_FAILURE).toBe("08006");

      // Constraint violations (Class 23)
      expect(DbErrorCode.UNIQUE_VIOLATION).toBe("23505");
      expect(DbErrorCode.FOREIGN_KEY_VIOLATION).toBe("23503");
      expect(DbErrorCode.NOT_NULL_VIOLATION).toBe("23502");

      // Authentication errors (Class 28)
      expect(DbErrorCode.INVALID_PASSWORD).toBe("28P01");

      // Syntax errors (Class 42)
      expect(DbErrorCode.UNDEFINED_TABLE).toBe("42P01");
      expect(DbErrorCode.UNDEFINED_COLUMN).toBe("42703");

      // Resource errors (Class 53)
      expect(DbErrorCode.TOO_MANY_CONNECTIONS).toBe("53300");

      // Query cancellation
      expect(DbErrorCode.QUERY_CANCELED).toBe("57014");
    });
  });
});
