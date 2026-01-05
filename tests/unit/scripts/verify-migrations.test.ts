/**
 * Unit tests for scripts/verify-migrations.ts
 *
 * Tests utility functions for redacting sensitive data and generating
 * troubleshooting context.
 */

import { describe, it, expect } from "vitest";
import { redactDatabaseUrl, getTroubleshootingContext } from "@/lib/db/migration-utils";

describe("verify-migrations utilities", () => {
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
        "postgresql://postgres.abcdef:SecretPass123@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@aws-0-us-west-2.pooler.supabase.com/postgres");
      expect(redacted).not.toContain("postgres.abcdef");
      expect(redacted).not.toContain("SecretPass123");
    });

    it("should redact URL-encoded passwords", () => {
      const url = "postgresql://user:p%40ssw0rd%21@localhost:5432/mydb";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@localhost/mydb");
      expect(redacted).not.toContain("p%40ssw0rd%21");
    });

    it("should preserve hostname and database name", () => {
      const url = "postgresql://user:pass@db.example.com:5432/production";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toContain("db.example.com");
      expect(redacted).toContain("production");
    });

    it("should handle URL without port", () => {
      const url = "postgresql://user:pass@localhost/mydb";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@localhost/mydb");
    });

    it("should return 'invalid URL format' for malformed URLs", () => {
      expect(redactDatabaseUrl("not-a-url")).toBe("invalid URL format");
      expect(redactDatabaseUrl("just some text")).toBe("invalid URL format");
    });

    it("should handle incomplete but valid URL structure", () => {
      // postgresql:// is technically a valid URL structure, just incomplete
      const url = "postgresql://";
      const redacted = redactDatabaseUrl(url);
      // The URL parser accepts it as valid, so it gets redacted
      expect(redacted).toBe("postgresql://***.***@/");
    });

    it("should handle database URL without database name", () => {
      const url = "postgresql://user:pass@localhost:5432/";
      const redacted = redactDatabaseUrl(url);

      expect(redacted).toBe("postgresql://***.***@localhost/");
    });
  });

  describe("getTroubleshootingContext", () => {
    it("should include error message in context", () => {
      const error = new Error("Connection timeout");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Connection timeout");
      expect(context).toContain("Error Context");
    });

    it("should handle non-Error objects", () => {
      const context = getTroubleshootingContext("String error");

      expect(context).toContain("String error");
      expect(context).toContain("Error Context");
    });

    it("should provide connection refused guidance", () => {
      const error = new Error("ECONNREFUSED");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Connection refused");
      expect(context).toContain("Check if database is accessible");
      expect(context).toContain("🔄 This may be transient");
    });

    it("should provide connection guidance for 'connect' errors", () => {
      const error = new Error("Failed to connect to database");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Connection refused");
      expect(context).toContain("Verify DATABASE_URL is correct");
    });

    it("should provide authentication guidance", () => {
      const error = new Error("authentication failed for user");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Authentication failed");
      expect(context).toContain("Check credentials in DATABASE_URL");
      expect(context).toContain("❌ This is a configuration issue");
    });

    it("should provide password-related guidance", () => {
      const error = new Error("password authentication failed");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Authentication failed");
      expect(context).toContain("Verify password is properly URL-encoded");
    });

    it("should provide schema issue guidance for 'does not exist'", () => {
      const error = new Error('relation "users" does not exist');
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Table/column missing");
      expect(context).toContain("Run pending migrations");
      expect(context).toContain("❌ This is a schema issue");
    });

    it("should provide schema issue guidance for 'relation' errors", () => {
      const error = new Error("relation constraint violation");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Table/column missing");
      expect(context).toContain("Check if connected to correct database");
    });

    it("should provide timeout guidance", () => {
      const error = new Error("Query timeout exceeded");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Database timeout");
      expect(context).toContain("Check database performance");
      expect(context).toContain("🔄 This may be transient");
    });

    it("should provide ETIMEDOUT guidance", () => {
      // Note: ETIMEDOUT in the message also contains "connect", so it matches connection guidance
      const error = new Error("ETIMEDOUT while connecting");
      const context = getTroubleshootingContext(error);

      // Since "connect" is in the message, it matches connection refused guidance first
      expect(context).toContain("Connection refused");
      expect(context).toContain("Check if database is accessible");
      expect(context).toContain("🔄 This may be transient");
    });

    it("should provide timeout guidance for pure timeout errors", () => {
      const error = new Error("Query execution timeout exceeded");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Database timeout");
      expect(context).toContain("Query took too long");
      expect(context).toContain("Check database performance");
    });

    it("should provide generic guidance for unknown errors", () => {
      const error = new Error("Something unexpected happened");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("Review error message above");
      expect(context).toContain("Check logs in GitHub Actions");
      expect(context).toContain("migration-deployment-guide.md");
    });

    it("should include troubleshooting header", () => {
      const error = new Error("Test error");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("💡 Troubleshooting:");
    });

    it("should include error context header", () => {
      const error = new Error("Test error");
      const context = getTroubleshootingContext(error);

      expect(context).toContain("📋 Error Context:");
    });
  });
});
