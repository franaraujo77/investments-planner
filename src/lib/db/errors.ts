/**
 * Database Error Utilities
 *
 * Provides consistent error extraction and logging for database operations.
 * Works with postgres.js driver errors to capture full error context.
 *
 * Usage:
 * ```typescript
 * import { extractDbError, isDbError, DbErrorCode } from '@/lib/db/errors';
 *
 * try {
 *   await db.select().from(users);
 * } catch (error) {
 *   const dbError = extractDbError(error);
 *   logger.error("Database operation failed", dbError.toLogContext());
 * }
 * ```
 */

import { logger } from "@/lib/telemetry/logger";

/**
 * Common PostgreSQL error codes
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const DbErrorCode = {
  // Class 08 - Connection Exception
  CONNECTION_EXCEPTION: "08000",
  CONNECTION_DOES_NOT_EXIST: "08003",
  CONNECTION_FAILURE: "08006",

  // Class 23 - Integrity Constraint Violation
  INTEGRITY_CONSTRAINT_VIOLATION: "23000",
  NOT_NULL_VIOLATION: "23502",
  FOREIGN_KEY_VIOLATION: "23503",
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",

  // Class 28 - Invalid Authorization
  INVALID_AUTHORIZATION: "28000",
  INVALID_PASSWORD: "28P01",

  // Class 42 - Syntax Error or Access Rule Violation
  SYNTAX_ERROR: "42601",
  UNDEFINED_TABLE: "42P01",
  UNDEFINED_COLUMN: "42703",
  INSUFFICIENT_PRIVILEGE: "42501",

  // Class 53 - Insufficient Resources
  INSUFFICIENT_RESOURCES: "53000",
  DISK_FULL: "53100",
  OUT_OF_MEMORY: "53200",
  TOO_MANY_CONNECTIONS: "53300",

  // Class 57 - Operator Intervention
  OPERATOR_INTERVENTION: "57000",
  QUERY_CANCELED: "57014",
  ADMIN_SHUTDOWN: "57P01",
  CRASH_SHUTDOWN: "57P02",
  CANNOT_CONNECT_NOW: "57P03",

  // Class 58 - System Error
  SYSTEM_ERROR: "58000",
  IO_ERROR: "58030",
} as const;

export type DbErrorCodeType = (typeof DbErrorCode)[keyof typeof DbErrorCode];

/**
 * Structured database error information
 */
export interface DbErrorInfo {
  /** Original error message */
  message: string;

  /** Underlying cause (e.g., network error) */
  cause?: string;

  /** PostgreSQL error code (e.g., "23505" for unique violation) */
  code?: string;

  /** Additional error detail from PostgreSQL */
  detail?: string;

  /** Hint for resolving the error */
  hint?: string;

  /** Constraint name that was violated */
  constraint?: string;

  /** Table name involved in the error */
  table?: string;

  /** Column name involved in the error */
  column?: string;

  /** Schema name involved in the error */
  schema?: string;

  /** Position in the query where error occurred */
  position?: string;

  /** Whether this is a connection error */
  isConnectionError: boolean;

  /** Whether this is a constraint violation */
  isConstraintViolation: boolean;

  /** Whether this is a timeout error */
  isTimeout: boolean;

  /** Human-readable error category */
  category: DbErrorCategory;
}

/**
 * High-level error categories for user-friendly messages
 */
export type DbErrorCategory =
  | "connection"
  | "authentication"
  | "constraint"
  | "not_found"
  | "permission"
  | "timeout"
  | "resource"
  | "query"
  | "unknown";

/**
 * Postgres.js error shape (not exported by the library)
 */
interface PostgresError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
  table?: string;
  column?: string;
  schema?: string;
  position?: string;
  query?: string;
  parameters?: unknown[];
  cause?: Error;
  severity?: string;
  routine?: string;
}

/**
 * Extracts detailed error information from a database error
 *
 * @param error - Error caught from database operation
 * @returns Structured error information
 */
export function extractDbError(error: unknown): DbErrorInfo {
  // Handle non-Error objects
  if (!(error instanceof Error)) {
    return {
      message: String(error),
      isConnectionError: false,
      isConstraintViolation: false,
      isTimeout: false,
      category: "unknown",
    };
  }

  const pgError = error as PostgresError;

  // Extract cause message (postgres.js wraps errors)
  const causeMessage = extractCauseMessage(pgError);

  // Determine error category
  const category = categorizeError(pgError, causeMessage);

  // Check for specific error types
  const isConnectionError: boolean =
    category === "connection" ||
    causeMessage?.includes("ECONNREFUSED") === true ||
    causeMessage?.includes("ETIMEDOUT") === true ||
    causeMessage?.includes("ENOTFOUND") === true ||
    pgError.code?.startsWith("08") === true ||
    pgError.code?.startsWith("57") === true;

  const isConstraintViolation: boolean =
    category === "constraint" || pgError.code?.startsWith("23") === true;

  const isTimeout: boolean =
    category === "timeout" ||
    causeMessage?.includes("timeout") === true ||
    causeMessage?.includes("ETIMEDOUT") === true ||
    pgError.code === DbErrorCode.QUERY_CANCELED;

  // Build result object, only including optional properties when they have values
  // This satisfies exactOptionalPropertyTypes
  const result: DbErrorInfo = {
    message: cleanErrorMessage(pgError.message),
    isConnectionError,
    isConstraintViolation,
    isTimeout,
    category,
  };

  // Only add optional properties if they have values
  if (causeMessage !== undefined) result.cause = causeMessage;
  if (pgError.code !== undefined) result.code = pgError.code;
  if (pgError.detail !== undefined) result.detail = pgError.detail;
  if (pgError.hint !== undefined) result.hint = pgError.hint;
  if (pgError.constraint !== undefined) result.constraint = pgError.constraint;
  if (pgError.table !== undefined) result.table = pgError.table;
  if (pgError.column !== undefined) result.column = pgError.column;
  if (pgError.schema !== undefined) result.schema = pgError.schema;
  if (pgError.position !== undefined) result.position = pgError.position;

  return result;
}

/**
 * Extracts the cause message from nested errors
 */
function extractCauseMessage(error: PostgresError): string | undefined {
  if (!error.cause) return undefined;

  if (error.cause instanceof Error) {
    return error.cause.message;
  }

  return String(error.cause);
}

/**
 * Removes query text from error message for security
 */
function cleanErrorMessage(message: string): string {
  // postgres.js includes "Failed query: SELECT..." in errors
  // Remove the query part but keep the reason
  const failedQueryMatch = message.match(/^Failed query:.*$/m);
  if (failedQueryMatch) {
    return "Database query failed";
  }
  return message;
}

/**
 * Categorizes the error for user-friendly handling
 */
function categorizeError(error: PostgresError, causeMessage?: string): DbErrorCategory {
  const code = error.code;
  const msg = (error.message + " " + (causeMessage || "")).toLowerCase();

  // Connection errors
  if (
    code?.startsWith("08") ||
    code?.startsWith("57") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("connection")
  ) {
    return "connection";
  }

  // Authentication errors
  if (code?.startsWith("28") || msg.includes("authentication") || msg.includes("password")) {
    return "authentication";
  }

  // Constraint violations
  if (code?.startsWith("23")) {
    return "constraint";
  }

  // Not found / undefined
  if (code === DbErrorCode.UNDEFINED_TABLE || code === DbErrorCode.UNDEFINED_COLUMN) {
    return "not_found";
  }

  // Permission errors
  if (code === DbErrorCode.INSUFFICIENT_PRIVILEGE) {
    return "permission";
  }

  // Timeout errors
  if (code === DbErrorCode.QUERY_CANCELED || msg.includes("timeout") || msg.includes("etimedout")) {
    return "timeout";
  }

  // Resource errors
  if (code?.startsWith("53")) {
    return "resource";
  }

  // Query/syntax errors
  if (code?.startsWith("42")) {
    return "query";
  }

  return "unknown";
}

/**
 * Log context type compatible with the logger
 */
type LogContext = Record<string, string | number | boolean | undefined | null>;

/**
 * Creates a log-safe context object from database error info
 *
 * Excludes sensitive data like query parameters and full query text.
 */
export function toLogContext(info: DbErrorInfo): LogContext {
  return {
    dbErrorMessage: info.message,
    dbErrorCause: info.cause,
    dbErrorCode: info.code,
    dbErrorDetail: info.detail,
    dbErrorHint: info.hint,
    dbErrorConstraint: info.constraint,
    dbErrorTable: info.table,
    dbErrorCategory: info.category,
    isConnectionError: info.isConnectionError,
    isConstraintViolation: info.isConstraintViolation,
    isTimeout: info.isTimeout,
  };
}

/**
 * Checks if an error is a database error (has postgres-specific properties)
 */
export function isDbError(error: unknown): error is PostgresError {
  if (!(error instanceof Error)) return false;
  const pgError = error as PostgresError;
  return (
    pgError.code !== undefined ||
    pgError.detail !== undefined ||
    pgError.constraint !== undefined ||
    pgError.message?.includes("Failed query")
  );
}

/**
 * Checks if error is a unique constraint violation
 */
export function isUniqueViolation(error: unknown): boolean {
  const info = extractDbError(error);
  return info.code === DbErrorCode.UNIQUE_VIOLATION;
}

/**
 * Checks if error is a foreign key violation
 */
export function isForeignKeyViolation(error: unknown): boolean {
  const info = extractDbError(error);
  return info.code === DbErrorCode.FOREIGN_KEY_VIOLATION;
}

/**
 * Checks if error is a not null violation
 */
export function isNotNullViolation(error: unknown): boolean {
  const info = extractDbError(error);
  return info.code === DbErrorCode.NOT_NULL_VIOLATION;
}

/**
 * Gets a user-friendly error message based on error category
 */
export function getUserFriendlyMessage(info: DbErrorInfo): string {
  switch (info.category) {
    case "connection":
      return "Unable to connect to the database. Please try again later.";
    case "authentication":
      return "Database authentication failed. Please contact support.";
    case "constraint":
      if (info.code === DbErrorCode.UNIQUE_VIOLATION) {
        return "This record already exists.";
      }
      if (info.code === DbErrorCode.FOREIGN_KEY_VIOLATION) {
        return "Referenced record does not exist.";
      }
      return "Data validation failed.";
    case "not_found":
      return "Database schema error. Please contact support.";
    case "permission":
      return "Database permission denied. Please contact support.";
    case "timeout":
      return "Database operation timed out. Please try again.";
    case "resource":
      return "Database resources exhausted. Please try again later.";
    case "query":
      return "Database query error. Please contact support.";
    default:
      return "An unexpected database error occurred.";
  }
}

/**
 * Logs a database error with full context
 *
 * @param context - Description of the operation that failed
 * @param error - The caught error
 * @param additionalContext - Extra context to include in logs
 */
export function logDbError(
  context: string,
  error: unknown,
  additionalContext?: Record<string, string | number | boolean | undefined | null>
): DbErrorInfo {
  const dbError = extractDbError(error);
  const logContext = {
    ...toLogContext(dbError),
    ...additionalContext,
  };

  logger.error(context, logContext);

  return dbError;
}

/**
 * Wraps a database operation with standardized error handling
 *
 * @param operation - Async database operation to execute
 * @param context - Description for error logging
 * @returns Result of the operation
 * @throws Re-throws with enhanced error info attached
 *
 * @example
 * ```typescript
 * const user = await withDbErrorHandling(
 *   () => db.select().from(users).where(eq(users.id, id)),
 *   "fetch user by id"
 * );
 * ```
 */
export async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  additionalContext?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const dbError = logDbError(context, error, additionalContext);

    // Re-throw with enhanced error
    const enhancedError = new Error(dbError.message) as PostgresError;
    if (dbError.code) enhancedError.code = dbError.code;
    if (dbError.detail) enhancedError.detail = dbError.detail;
    enhancedError.cause = error as Error;
    throw enhancedError;
  }
}
