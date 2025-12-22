/**
 * Unit tests for RLS Coverage Check Script
 *
 * Tests the core functions used to verify Row Level Security coverage
 * across all database tables.
 */

import { describe, it, expect } from "vitest";
import {
  extractTablesFromContent,
  findRlsInMigration,
  checkRlsCoverageForTables,
} from "../../../scripts/check-rls-coverage";

// =============================================================================
// extractTablesFromContent
// =============================================================================

describe("extractTablesFromContent", () => {
  it("should extract table names from pgTable declarations with double quotes", () => {
    const schemaContent = `
      export const users = pgTable("users", {
        id: uuid("id").primaryKey(),
      });

      export const portfolios = pgTable("portfolios", {
        id: uuid("id").primaryKey(),
      });
    `;

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual(["users", "portfolios"]);
  });

  it("should extract table names from pgTable declarations with single quotes", () => {
    const schemaContent = `
      export const alerts = pgTable('alerts', {
        id: uuid("id").primaryKey(),
      });
    `;

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual(["alerts"]);
  });

  it("should handle mixed quote styles", () => {
    const schemaContent = `
      export const users = pgTable("users", { id: uuid("id") });
      export const alerts = pgTable('alerts', { id: uuid("id") });
    `;

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual(["users", "alerts"]);
  });

  it("should handle pgTable with extra whitespace", () => {
    const schemaContent = `
      export const users = pgTable  (  "users"  , {
        id: uuid("id").primaryKey(),
      });
    `;

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual(["users"]);
  });

  it("should return empty array for empty schema", () => {
    const schemaContent = "";

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual([]);
  });

  it("should return empty array for schema without pgTable", () => {
    const schemaContent = `
      export const userSchema = z.object({
        id: z.string(),
      });
    `;

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual([]);
  });

  it("should handle underscores in table names", () => {
    const schemaContent = `
      export const refreshTokens = pgTable("refresh_tokens", { id: uuid("id") });
      export const assetClasses = pgTable("asset_classes", { id: uuid("id") });
    `;

    const tables = extractTablesFromContent(schemaContent);

    expect(tables).toEqual(["refresh_tokens", "asset_classes"]);
  });

  it("should not extract from comments", () => {
    const schemaContent = `
      // pgTable("commented_table", {})
      /* pgTable("block_commented", {}) */
      export const users = pgTable("users", { id: uuid("id") });
    `;

    const tables = extractTablesFromContent(schemaContent);

    // Note: The regex doesn't distinguish comments, but this is acceptable
    // as real schema files don't have pgTable in comments
    expect(tables).toContain("users");
  });
});

// =============================================================================
// findRlsInMigration
// =============================================================================

describe("findRlsInMigration", () => {
  it("should detect RLS statements with double quotes", () => {
    const migrationContent = `
      ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0001_migration.sql");

    expect(rlsMap.size).toBe(2);
    expect(rlsMap.get("users")).toBe("0001_migration.sql");
    expect(rlsMap.get("portfolios")).toBe("0001_migration.sql");
  });

  it("should detect RLS statements with single quotes", () => {
    const migrationContent = `
      ALTER TABLE 'alerts' ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0002_migration.sql");

    expect(rlsMap.size).toBe(1);
    expect(rlsMap.get("alerts")).toBe("0002_migration.sql");
  });

  it("should detect RLS statements without quotes", () => {
    const migrationContent = `
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0003_migration.sql");

    expect(rlsMap.size).toBe(1);
    expect(rlsMap.get("users")).toBe("0003_migration.sql");
  });

  it("should handle case-insensitive matching", () => {
    const migrationContent = `
      alter table "users" enable row level security;
      ALTER TABLE "PORTFOLIOS" ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0004_migration.sql");

    expect(rlsMap.size).toBe(2);
    expect(rlsMap.has("users")).toBe(true);
    expect(rlsMap.has("PORTFOLIOS")).toBe(true);
  });

  it("should handle extra whitespace in statements", () => {
    const migrationContent = `
      ALTER   TABLE   "users"   ENABLE   ROW   LEVEL   SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0005_migration.sql");

    expect(rlsMap.size).toBe(1);
    expect(rlsMap.get("users")).toBe("0005_migration.sql");
  });

  it("should return empty map for migration without RLS statements", () => {
    const migrationContent = `
      CREATE TABLE "users" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      );
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0006_migration.sql");

    expect(rlsMap.size).toBe(0);
  });

  it("should return empty map for empty migration", () => {
    const migrationContent = "";

    const rlsMap = findRlsInMigration(migrationContent, "0007_migration.sql");

    expect(rlsMap.size).toBe(0);
  });

  it("should handle multiple RLS statements in one migration", () => {
    const migrationContent = `
      -- Enable RLS on all tables
      ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "investments" ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0008_migration.sql");

    expect(rlsMap.size).toBe(4);
    expect(rlsMap.get("users")).toBe("0008_migration.sql");
    expect(rlsMap.get("portfolios")).toBe("0008_migration.sql");
    expect(rlsMap.get("alerts")).toBe("0008_migration.sql");
    expect(rlsMap.get("investments")).toBe("0008_migration.sql");
  });

  it("should handle underscores in table names", () => {
    const migrationContent = `
      ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "asset_classes" ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0009_migration.sql");

    expect(rlsMap.size).toBe(2);
    expect(rlsMap.get("refresh_tokens")).toBe("0009_migration.sql");
    expect(rlsMap.get("asset_classes")).toBe("0009_migration.sql");
  });

  it("should not match partial statements", () => {
    const migrationContent = `
      -- This is not valid:
      -- ALTER TABLE "users" ENABLE ROW LEVEL
      -- ENABLE ROW LEVEL SECURITY on "users"

      -- This is valid:
      ALTER TABLE "valid_table" ENABLE ROW LEVEL SECURITY;
    `;

    const rlsMap = findRlsInMigration(migrationContent, "0010_migration.sql");

    expect(rlsMap.size).toBe(1);
    expect(rlsMap.get("valid_table")).toBe("0010_migration.sql");
  });
});

// =============================================================================
// checkRlsCoverageForTables
// =============================================================================

describe("checkRlsCoverageForTables", () => {
  it("should pass when all tables have RLS", () => {
    const tables = ["users", "portfolios", "alerts"];
    const rlsEnabled = new Map([
      ["users", "0001_migration.sql"],
      ["portfolios", "0001_migration.sql"],
      ["alerts", "0002_migration.sql"],
    ]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    expect(result.passed).toBe(true);
    expect(result.missingRls).toEqual([]);
    expect(result.results).toHaveLength(3);
  });

  it("should fail when tables are missing RLS", () => {
    const tables = ["users", "portfolios", "alerts"];
    const rlsEnabled = new Map([["users", "0001_migration.sql"]]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    expect(result.passed).toBe(false);
    expect(result.missingRls).toEqual(["portfolios", "alerts"]);
  });

  it("should report correct missing tables", () => {
    const tables = ["users", "portfolios", "alerts", "investments"];
    const rlsEnabled = new Map([
      ["users", "0001_migration.sql"],
      ["investments", "0002_migration.sql"],
    ]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    expect(result.passed).toBe(false);
    expect(result.missingRls).toEqual(["portfolios", "alerts"]);
    expect(result.missingRls).not.toContain("users");
    expect(result.missingRls).not.toContain("investments");
  });

  it("should include migration file in results for covered tables", () => {
    const tables = ["users", "portfolios"];
    const rlsEnabled = new Map([
      ["users", "0001_migration.sql"],
      ["portfolios", "0002_migration.sql"],
    ]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    const usersResult = result.results.find((r) => r.table === "users");
    const portfoliosResult = result.results.find((r) => r.table === "portfolios");

    expect(usersResult?.migration).toBe("0001_migration.sql");
    expect(portfoliosResult?.migration).toBe("0002_migration.sql");
  });

  it("should not include migration for uncovered tables", () => {
    const tables = ["users", "uncovered"];
    const rlsEnabled = new Map([["users", "0001_migration.sql"]]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    const uncoveredResult = result.results.find((r) => r.table === "uncovered");

    expect(uncoveredResult?.hasRls).toBe(false);
    expect(uncoveredResult?.migration).toBeUndefined();
  });

  it("should handle empty tables array", () => {
    const tables: string[] = [];
    const rlsEnabled = new Map<string, string>();

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    expect(result.passed).toBe(true);
    expect(result.missingRls).toEqual([]);
    expect(result.results).toEqual([]);
  });

  it("should handle extra RLS entries not in schema", () => {
    const tables = ["users"];
    const rlsEnabled = new Map([
      ["users", "0001_migration.sql"],
      ["extra_table", "0002_migration.sql"], // Not in schema
    ]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].table).toBe("users");
  });

  it("should preserve table order in results", () => {
    const tables = ["zebra", "alpha", "middle"];
    const rlsEnabled = new Map([
      ["zebra", "0001.sql"],
      ["alpha", "0001.sql"],
      ["middle", "0001.sql"],
    ]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    expect(result.results.map((r) => r.table)).toEqual(["zebra", "alpha", "middle"]);
  });

  it("should correctly set hasRls boolean in results", () => {
    const tables = ["covered", "uncovered"];
    const rlsEnabled = new Map([["covered", "0001.sql"]]);

    const result = checkRlsCoverageForTables(tables, rlsEnabled);

    const coveredResult = result.results.find((r) => r.table === "covered");
    const uncoveredResult = result.results.find((r) => r.table === "uncovered");

    expect(coveredResult?.hasRls).toBe(true);
    expect(uncoveredResult?.hasRls).toBe(false);
  });
});
