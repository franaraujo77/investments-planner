/**
 * Migration and Schema Audit Utilities
 *
 * Shared utility functions for database migration verification and schema auditing.
 * These utilities help prevent schema drift and migration issues.
 *
 * @module migration-utils
 */

import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Drizzle Symbol Constants
 *
 * These symbols are used by Drizzle ORM for internal metadata.
 * IMPORTANT: These are tied to Drizzle ORM's internal API.
 *
 * @see https://github.com/drizzle-team/drizzle-orm
 *
 * Compatibility tracking for future reference:
 * - Last verified: drizzle-orm@0.36.4 (January 2026)
 * - Integration test: tests/integration/drizzle-compatibility.test.ts
 *
 * If tests fail after Drizzle upgrade:
 * 1. Check Drizzle's release notes for breaking changes
 * 2. Update these symbol names if they changed
 * 3. Update the compatibility version comment above
 * 4. Update the integration test to match new API
 *
 * NOTE: Drizzle tables are identified by the presence of Name and Columns symbols.
 * There is no isPgTable symbol in the current version.
 */
export const DRIZZLE_SYMBOLS = {
  name: Symbol.for("drizzle:Name"),
  columns: Symbol.for("drizzle:Columns"),
} as const;

/**
 * Type guard to check if a database result row has expected properties
 */
export function isMigrationRow(
  row: unknown
): row is { id: string; hash: string; created_at: string } {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    typeof row.id === "string" &&
    "hash" in row &&
    typeof row.hash === "string" &&
    "created_at" in row &&
    typeof row.created_at === "string"
  );
}

/**
 * Type guard to check if a database result row is a column info row
 */
export function isColumnInfoRow(row: unknown): row is {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
} {
  return (
    typeof row === "object" &&
    row !== null &&
    "column_name" in row &&
    typeof row.column_name === "string" &&
    "data_type" in row &&
    typeof row.data_type === "string"
  );
}

/**
 * Type guard to check if a database result row is a table name row
 */
export function isTableNameRow(row: unknown): row is { tablename: string } {
  return (
    typeof row === "object" &&
    row !== null &&
    "tablename" in row &&
    typeof row.tablename === "string"
  );
}

/**
 * Validate that Drizzle symbols exist on a table object
 *
 * Provides early detection if Drizzle API changes.
 * Returns false if any required symbol is missing.
 *
 * Drizzle tables are identified by the presence of Name and Columns symbols.
 *
 * @param table - Object to validate as a Drizzle table
 * @returns true if all required symbols exist, false otherwise
 */
export function validateDrizzleTable(table: unknown): table is PgTable {
  if (!table || typeof table !== "object") return false;

  // Validate required symbols exist
  // @ts-expect-error - Drizzle uses symbols for internal metadata
  if (!table[DRIZZLE_SYMBOLS.name]) {
    return false;
  }

  // @ts-expect-error - Drizzle uses symbols for internal metadata
  if (!table[DRIZZLE_SYMBOLS.columns]) {
    return false;
  }

  return true;
}

/**
 * Redact sensitive information from DATABASE_URL for logging
 *
 * Masks username and password while preserving hostname and database name
 * for debugging purposes.
 *
 * @param url - Database connection URL (optional)
 * @returns Redacted URL string safe for logging
 *
 * @example
 * ```ts
 * redactDatabaseUrl("postgresql://user:pass@localhost:5432/mydb")
 * // Returns: "postgresql://***.***@localhost/mydb"
 * ```
 */
export function redactDatabaseUrl(url?: string): string {
  if (!url) return "not set";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const database = parsed.pathname.slice(1);
    return `${parsed.protocol}//***.***@${host}/${database}`;
  } catch {
    return "invalid URL format";
  }
}

/**
 * Get troubleshooting context for errors
 *
 * Analyzes error messages and provides specific guidance based on error type.
 * Helps developers quickly identify and resolve common database issues.
 *
 * @param error - Error object or string
 * @param operation - Optional operation name for context
 * @returns Formatted troubleshooting context string
 */
export function getTroubleshootingContext(error: unknown, operation?: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const dbUrl = redactDatabaseUrl(process.env.DATABASE_URL);

  let context = `\n📋 Error Context:\n`;
  if (operation) {
    context += `   Operation: ${operation}\n`;
  }
  context += `   Database: ${dbUrl}\n`;
  context += `   Error: ${errorMessage}\n\n`;

  context += `💡 Troubleshooting:\n`;

  // Provide specific guidance based on error type
  if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("connect")) {
    context += `   - Connection refused: Check if database is accessible\n`;
    context += `   - Verify DATABASE_URL is correct\n`;
    context += `   - Check network connectivity\n`;
    context += `   - 🔄 This may be transient - retry in a few seconds\n`;
  } else if (errorMessage.includes("authentication") || errorMessage.includes("password")) {
    context += `   - Authentication failed: Check credentials in DATABASE_URL\n`;
    context += `   - Verify password is properly URL-encoded\n`;
    context += `   - ❌ This is a configuration issue - fix DATABASE_URL\n`;
  } else if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
    context += `   - Table/column missing: Run pending migrations\n`;
    context += `   - Check if connected to correct database\n`;
    context += `   - ❌ This is a schema issue - apply migrations\n`;
  } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    context += `   - Database timeout: Query took too long\n`;
    context += `   - Check database performance\n`;
    context += `   - 🔄 This may be transient - retry in a few seconds\n`;
  } else {
    context += `   - Review error message above for details\n`;
    context += `   - Check logs in GitHub Actions or terminal\n`;
    context += `   - See docs/migration-deployment-guide.md for help\n`;
  }

  return context;
}
