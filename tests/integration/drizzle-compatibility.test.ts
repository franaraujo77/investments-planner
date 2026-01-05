/**
 * Integration tests for Drizzle ORM compatibility
 *
 * This test ensures that Drizzle's internal symbol-based API hasn't changed.
 * If this test fails after a Drizzle update, the migration-utils functions
 * need to be updated to match the new API.
 *
 * Compatible with: drizzle-orm@^0.36.4
 */

import { describe, it, expect } from "vitest";
import { DRIZZLE_SYMBOLS, validateDrizzleTable } from "@/lib/db/migration-utils";
import * as schema from "@/lib/db/schema";

describe("Drizzle ORM Compatibility", () => {
  it("should have tables with expected Drizzle symbols", () => {
    // Get a known table from schema
    const { users } = schema;

    // Verify it's recognized as a Drizzle table
    expect(validateDrizzleTable(users)).toBe(true);

    // Verify individual symbols exist
    // @ts-expect-error - Accessing internal Drizzle metadata
    expect(users[DRIZZLE_SYMBOLS.name]).toBe("users");
    // @ts-expect-error - Accessing internal Drizzle metadata
    expect(users[DRIZZLE_SYMBOLS.columns]).toBeDefined();
  });

  it("should extract columns from Drizzle table", () => {
    const { users } = schema;

    // @ts-expect-error - Accessing internal Drizzle metadata
    const columns = users[DRIZZLE_SYMBOLS.columns];

    // Verify we can access column metadata
    expect(columns).toBeDefined();
    expect(typeof columns).toBe("object");

    // Check for known columns in users table (keys are camelCase in schema)
    expect(columns.id).toBeDefined();
    expect(columns.email).toBeDefined();
    expect(columns.createdAt).toBeDefined(); // camelCase key

    // Verify column names are accessible (actual column names are snake_case in DB)
    expect(columns.id.name).toBe("id");
    expect(columns.email.name).toBe("email");
    expect(columns.createdAt.name).toBe("created_at"); // snake_case in DB
  });

  it("should validate all schema tables", () => {
    // Get all exports from schema
    const schemaExports = Object.entries(schema);

    // Find tables (filter out non-table exports like enums)
    const tables = schemaExports.filter(([_key, value]) => validateDrizzleTable(value));

    // We should have multiple tables
    expect(tables.length).toBeGreaterThan(10);

    // All tables should have the expected structure
    for (const [key, table] of tables) {
      // @ts-expect-error - Accessing internal Drizzle metadata
      const tableName = table[DRIZZLE_SYMBOLS.name];

      expect(tableName).toBeDefined();
      expect(typeof tableName).toBe("string");

      // @ts-expect-error - Accessing internal Drizzle metadata
      const columns = table[DRIZZLE_SYMBOLS.columns];

      expect(columns).toBeDefined();
      expect(typeof columns).toBe("object");

      // Log validation for debugging
      console.log(`✓ Validated table: ${key} -> ${tableName}`);
    }
  });

  it("should handle invalid table objects gracefully", () => {
    // Plain objects should not validate
    expect(validateDrizzleTable({})).toBe(false);
    expect(validateDrizzleTable({ name: "fake_table" })).toBe(false);

    // Non-objects should not validate
    expect(validateDrizzleTable(null)).toBe(false);
    expect(validateDrizzleTable(undefined)).toBe(false);
    expect(validateDrizzleTable("string")).toBe(false);
    expect(validateDrizzleTable(123)).toBe(false);
  });

  it("should fail if Drizzle symbols change", () => {
    /**
     * This test is intentionally strict to catch Drizzle API changes.
     * If this test fails after updating Drizzle ORM:
     *
     * 1. Check Drizzle's release notes for breaking changes
     * 2. Update DRIZZLE_SYMBOLS in src/lib/db/migration-utils.ts
     * 3. Update this test to match the new API
     * 4. Update compatibility note in migration-utils.ts
     */

    const { users } = schema;

    // These specific symbol names must exist
    const requiredSymbols = [Symbol.for("drizzle:Name"), Symbol.for("drizzle:Columns")];

    for (const symbol of requiredSymbols) {
      // @ts-expect-error - Accessing internal Drizzle metadata
      expect(users[symbol]).toBeDefined();
    }
  });
});
