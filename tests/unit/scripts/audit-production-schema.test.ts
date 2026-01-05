/**
 * Unit tests for scripts/audit-production-schema.ts
 *
 * Tests utility functions for Drizzle table validation, URL redaction,
 * and troubleshooting context generation.
 */

import { describe, it, expect } from "vitest";

/**
 * Drizzle Symbol Constants
 * Copied from scripts/audit-production-schema.ts for testing
 */
const DRIZZLE_SYMBOLS = {
  isPgTable: Symbol.for("drizzle:isPgTable"),
  name: Symbol.for("drizzle:Name"),
  columns: Symbol.for("drizzle:Columns"),
} as const;

/**
 * Validate that Drizzle symbols exist on a table object
 * Copied from scripts/audit-production-schema.ts for testing
 */
function validateDrizzleTable(table: unknown): boolean {
  if (!table || typeof table !== "object") return false;

  // Check if it's a Drizzle table
  // @ts-expect-error - Drizzle uses symbols for internal metadata
  if (!table[DRIZZLE_SYMBOLS.isPgTable]) return false;

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
 * Copied from scripts/audit-production-schema.ts for testing
 */
function redactDatabaseUrl(url?: string): string {
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
 * Copied from scripts/audit-production-schema.ts for testing
 */
function getTroubleshootingContext(error: unknown, operation: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const dbUrl = redactDatabaseUrl(process.env.DATABASE_URL);

  let context = `\n📋 Error Context:\n`;
  context += `   Operation: ${operation}\n`;
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

describe("audit-production-schema utilities", () => {
  describe("validateDrizzleTable", () => {
    it("should return false for null", () => {
      expect(validateDrizzleTable(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(validateDrizzleTable(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(validateDrizzleTable("string")).toBe(false);
      expect(validateDrizzleTable(123)).toBe(false);
      expect(validateDrizzleTable(true)).toBe(false);
    });

    it("should return false for plain objects without Drizzle symbols", () => {
      expect(validateDrizzleTable({})).toBe(false);
      expect(validateDrizzleTable({ name: "test" })).toBe(false);
    });

    it("should return false when isPgTable symbol is missing", () => {
      const fakeTable = {
        [DRIZZLE_SYMBOLS.name]: "test_table",
        [DRIZZLE_SYMBOLS.columns]: {},
      };

      expect(validateDrizzleTable(fakeTable)).toBe(false);
    });

    it("should return false when name symbol is missing", () => {
      const fakeTable = {
        [DRIZZLE_SYMBOLS.isPgTable]: true,
        [DRIZZLE_SYMBOLS.columns]: {},
      };

      expect(validateDrizzleTable(fakeTable)).toBe(false);
    });

    it("should return false when columns symbol is missing", () => {
      const fakeTable = {
        [DRIZZLE_SYMBOLS.isPgTable]: true,
        [DRIZZLE_SYMBOLS.name]: "test_table",
      };

      expect(validateDrizzleTable(fakeTable)).toBe(false);
    });

    it("should return true for valid Drizzle table with all symbols", () => {
      const validTable = {
        [DRIZZLE_SYMBOLS.isPgTable]: true,
        [DRIZZLE_SYMBOLS.name]: "test_table",
        [DRIZZLE_SYMBOLS.columns]: {
          id: { name: "id" },
          name: { name: "name" },
        },
      };

      expect(validateDrizzleTable(validTable)).toBe(true);
    });

    it("should return true even with empty columns object", () => {
      const validTable = {
        [DRIZZLE_SYMBOLS.isPgTable]: true,
        [DRIZZLE_SYMBOLS.name]: "test_table",
        [DRIZZLE_SYMBOLS.columns]: {},
      };

      expect(validateDrizzleTable(validTable)).toBe(true);
    });
  });

  describe("redactDatabaseUrl", () => {
    it("should return 'not set' for undefined URL", () => {
      expect(redactDatabaseUrl(undefined)).toBe("not set");
    });

    it("should return 'not set' for empty string", () => {
      expect(redactDatabaseUrl("")).toBe("not set");
    });

    it("should redact credentials from valid PostgreSQL URL", () => {
      const url = "postgresql://user:password@localhost:5432/mydb";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@localhost/mydb");
      expect(redacted).not.toContain("user");
      expect(redacted).not.toContain("password");
    });

    it("should redact credentials from Supabase URL", () => {
      const url =
        "postgresql://postgres.xyz:SuperSecret@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@aws-0-us-east-1.pooler.supabase.com/postgres");
      expect(redacted).not.toContain("postgres.xyz");
      expect(redacted).not.toContain("SuperSecret");
    });

    it("should handle complex URL-encoded passwords", () => {
      const url = "postgresql://user:p%40ss%23w0rd%21@localhost:5432/mydb";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@localhost/mydb");
      expect(redacted).not.toContain("p%40ss%23w0rd%21");
    });

    it("should preserve hostname and database name", () => {
      const url = "postgresql://admin:secret@prod.db.company.com:5432/main_db";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toContain("prod.db.company.com");
      expect(redacted).toContain("main_db");
      expect(redacted).not.toContain("admin");
      expect(redacted).not.toContain("secret");
    });

    it("should return 'invalid URL format' for malformed URLs", () => {
      expect(redactDatabaseUrl("not-a-valid-url")).toBe("invalid URL format");
      expect(redactDatabaseUrl("http://")).toBe("invalid URL format");
      expect(redactDatabaseUrl("random text")).toBe("invalid URL format");
    });
  });

  describe("getTroubleshootingContext", () => {
    it("should include operation name in context", () => {
      const error = new Error("Test error");
      const context = getTroubleshootingContext(error, "Schema audit");

      expect(context).toContain("Operation: Schema audit");
    });

    it("should include error message in context", () => {
      const error = new Error("Connection failed");
      const context = getTroubleshootingContext(error, "Test operation");

      expect(context).toContain("Connection failed");
      expect(context).toContain("Error Context");
    });

    it("should handle non-Error objects", () => {
      const context = getTroubleshootingContext("String error message", "Test");

      expect(context).toContain("String error message");
      expect(context).toContain("Error Context");
    });

    it("should provide connection refused guidance", () => {
      const error = new Error("ECONNREFUSED");
      const context = getTroubleshootingContext(error, "Connection test");

      expect(context).toContain("Connection refused");
      expect(context).toContain("Check if database is accessible");
      expect(context).toContain("🔄 This may be transient");
    });

    it("should provide connection guidance for 'connect' in message", () => {
      const error = new Error("Unable to connect to server");
      const context = getTroubleshootingContext(error, "DB Connection");

      expect(context).toContain("Connection refused");
      expect(context).toContain("Verify DATABASE_URL is correct");
      expect(context).toContain("Check network connectivity");
    });

    it("should provide authentication guidance", () => {
      const error = new Error("authentication failed");
      const context = getTroubleshootingContext(error, "Auth check");

      expect(context).toContain("Authentication failed");
      expect(context).toContain("Check credentials in DATABASE_URL");
      expect(context).toContain("❌ This is a configuration issue");
    });

    it("should provide password-specific guidance", () => {
      const error = new Error("Invalid password provided");
      const context = getTroubleshootingContext(error, "Login");

      expect(context).toContain("Authentication failed");
      expect(context).toContain("Verify password is properly URL-encoded");
    });

    it("should provide schema issue guidance for missing tables", () => {
      const error = new Error('table "users" does not exist');
      const context = getTroubleshootingContext(error, "Schema check");

      expect(context).toContain("Table/column missing");
      expect(context).toContain("Run pending migrations");
      expect(context).toContain("❌ This is a schema issue");
    });

    it("should provide schema issue guidance for relation errors", () => {
      const error = new Error("relation not found");
      const context = getTroubleshootingContext(error, "Query");

      expect(context).toContain("Table/column missing");
      expect(context).toContain("Check if connected to correct database");
    });

    it("should provide timeout guidance", () => {
      const error = new Error("Query timeout after 30 seconds");
      const context = getTroubleshootingContext(error, "Long query");

      expect(context).toContain("Database timeout");
      expect(context).toContain("Check database performance");
      expect(context).toContain("🔄 This may be transient");
    });

    it("should provide ETIMEDOUT guidance", () => {
      // Note: ETIMEDOUT in the message also contains "connect", so it matches connection guidance
      const error = new Error("ETIMEDOUT connecting to database");
      const context = getTroubleshootingContext(error, "Connection");

      // Since "connect" is in the message, it matches connection refused guidance first
      expect(context).toContain("Connection refused");
      expect(context).toContain("Check if database is accessible");
      expect(context).toContain("🔄 This may be transient");
    });

    it("should provide timeout guidance for pure timeout errors", () => {
      const error = new Error("Query execution timeout exceeded");
      const context = getTroubleshootingContext(error, "Query");

      expect(context).toContain("Database timeout");
      expect(context).toContain("Query took too long");
      expect(context).toContain("Check database performance");
    });

    it("should provide generic guidance for unknown errors", () => {
      const error = new Error("Unexpected internal error");
      const context = getTroubleshootingContext(error, "Operation");

      expect(context).toContain("Review error message above");
      expect(context).toContain("Check logs in GitHub Actions");
      expect(context).toContain("migration-deployment-guide.md");
    });

    it("should include all required headers", () => {
      const error = new Error("Test");
      const context = getTroubleshootingContext(error, "Test op");

      expect(context).toContain("📋 Error Context:");
      expect(context).toContain("💡 Troubleshooting:");
      expect(context).toContain("Operation:");
      expect(context).toContain("Database:");
      expect(context).toContain("Error:");
    });
  });
});
