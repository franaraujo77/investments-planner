/**
 * Production Database Schema Audit
 *
 * Compares the expected schema (from schema.ts) with the actual production database
 * to identify missing columns, tables, or indexes.
 *
 * This script helps prevent issues like the missing 'updated_at' column that caused
 * the /api/alerts error on Jan 5, 2026.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/audit-production-schema.ts
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
}

interface AuditResult {
  table: string;
  status: "ok" | "missing-columns" | "missing-table";
  missingColumns?: string[];
  extraColumns?: string[];
}

interface DatabaseRow {
  tablename?: string;
  column_name?: string;
  data_type?: string;
  is_nullable?: string;
  column_default?: string | null;
}

/**
 * Redact sensitive information from DATABASE_URL for logging
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

async function getProductionTables(): Promise<Set<string>> {
  const result = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  const rows = result as unknown as DatabaseRow[];
  return new Set(rows.map((row) => row.tablename ?? ""));
}

async function getProductionColumns(tableName: string): Promise<Map<string, ColumnInfo>> {
  const result = await db.execute(
    sql`SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}`
  );

  const rows = result as unknown as DatabaseRow[];
  const columns = new Map<string, ColumnInfo>();

  for (const dbRow of rows) {
    if (dbRow.column_name) {
      columns.set(dbRow.column_name, {
        columnName: dbRow.column_name,
        dataType: dbRow.data_type ?? "",
        isNullable: dbRow.is_nullable ?? "",
        columnDefault: dbRow.column_default ?? null,
      });
    }
  }
  return columns;
}

/**
 * Drizzle Symbol Constants
 * These symbols are used by Drizzle ORM for internal metadata
 */
const DRIZZLE_SYMBOLS = {
  isPgTable: Symbol.for("drizzle:isPgTable"),
  name: Symbol.for("drizzle:Name"),
  columns: Symbol.for("drizzle:Columns"),
} as const;

/**
 * Validate that Drizzle symbols exist on a table object
 * Provides early detection if Drizzle API changes
 */
function validateDrizzleTable(table: unknown): boolean {
  if (!table || typeof table !== "object") return false;

  // Check if it's a Drizzle table
  // @ts-expect-error - Drizzle uses symbols for internal metadata
  if (!table[DRIZZLE_SYMBOLS.isPgTable]) return false;

  // Validate required symbols exist
  // @ts-expect-error - Drizzle uses symbols for internal metadata
  if (!table[DRIZZLE_SYMBOLS.name]) {
    console.warn("⚠️  Drizzle table missing 'Name' symbol - API may have changed");
    return false;
  }

  // @ts-expect-error - Drizzle uses symbols for internal metadata
  if (!table[DRIZZLE_SYMBOLS.columns]) {
    console.warn("⚠️  Drizzle table missing 'Columns' symbol - API may have changed");
    return false;
  }

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaTableNames(): Map<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tables = new Map<string, any>();

  // Extract all table definitions from schema
  for (const [_key, value] of Object.entries(schema)) {
    // Validate it's a Drizzle table with required symbols
    if (validateDrizzleTable(value)) {
      // @ts-expect-error - Drizzle uses symbols for internal metadata
      const tableName = value[DRIZZLE_SYMBOLS.name] as string;
      tables.set(tableName, value);
    }
  }

  if (tables.size === 0) {
    console.warn("⚠️  No Drizzle tables found in schema - check Drizzle API compatibility");
  }

  return tables;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaColumnNames(table: any): Set<string> {
  const columns = new Set<string>();

  // Validate table has required symbols
  if (!validateDrizzleTable(table)) {
    console.warn("⚠️  Invalid Drizzle table - skipping column extraction");
    return columns;
  }

  // Get columns from table definition
  const tableColumns = (table[DRIZZLE_SYMBOLS.columns] || {}) as Record<string, { name?: string }>;

  for (const [_key, column] of Object.entries(tableColumns)) {
    const columnName = column.name;
    if (columnName) {
      columns.add(columnName);
    }
  }

  return columns;
}

async function auditSchema(): Promise<AuditResult[]> {
  console.log("🔍 Starting production schema audit...\n");

  const productionTables = await getProductionTables();
  const schemaTables = getSchemaTableNames();

  const results: AuditResult[] = [];

  // Check each table in schema
  for (const [tableName, tableSchema] of schemaTables) {
    // Skip internal Drizzle tables
    if (tableName === "__drizzle_migrations") continue;

    if (!productionTables.has(tableName)) {
      results.push({
        table: tableName,
        status: "missing-table",
      });
      continue;
    }

    // Compare columns
    const schemaColumns = getSchemaColumnNames(tableSchema);
    const productionColumns = await getProductionColumns(tableName);

    const missingColumns: string[] = [];
    const extraColumns: string[] = [];

    // Check for missing columns in production
    for (const columnName of schemaColumns) {
      if (!productionColumns.has(columnName)) {
        missingColumns.push(columnName);
      }
    }

    // Check for extra columns in production (not in schema)
    for (const columnName of productionColumns.keys()) {
      if (!schemaColumns.has(columnName)) {
        extraColumns.push(columnName);
      }
    }

    if (missingColumns.length > 0 || extraColumns.length > 0) {
      results.push({
        table: tableName,
        status: "missing-columns",
        missingColumns,
        extraColumns,
      });
    } else {
      results.push({
        table: tableName,
        status: "ok",
      });
    }
  }

  return results;
}

async function main() {
  try {
    const results = await auditSchema();

    // Categorize results
    const okTables = results.filter((r) => r.status === "ok");
    const missingTables = results.filter((r) => r.status === "missing-table");
    const tablesWithIssues = results.filter((r) => r.status === "missing-columns");

    // Print summary
    console.log("📊 Audit Summary");
    console.log("═".repeat(50));
    console.log(`Total tables in schema: ${results.length}`);
    console.log(`✅ Tables OK: ${okTables.length}`);
    console.log(`❌ Missing tables: ${missingTables.length}`);
    console.log(`⚠️  Tables with column mismatches: ${tablesWithIssues.length}`);
    console.log("");

    // Print detailed results
    if (missingTables.length > 0) {
      console.log("❌ Missing Tables in Production:");
      console.log("─".repeat(50));
      for (const result of missingTables) {
        console.log(`  • ${result.table}`);
      }
      console.log("");
    }

    if (tablesWithIssues.length > 0) {
      console.log("⚠️  Tables with Column Mismatches:");
      console.log("─".repeat(50));
      for (const result of tablesWithIssues) {
        console.log(`\n  Table: ${result.table}`);
        if (result.missingColumns && result.missingColumns.length > 0) {
          console.log(`    Missing columns in production:`);
          for (const col of result.missingColumns) {
            console.log(`      - ${col}`);
          }
        }
        if (result.extraColumns && result.extraColumns.length > 0) {
          console.log(`    Extra columns in production (not in schema):`);
          for (const col of result.extraColumns) {
            console.log(`      - ${col}`);
          }
        }
      }
      console.log("");
    }

    if (okTables.length > 0 && missingTables.length === 0 && tablesWithIssues.length === 0) {
      console.log("✅ All tables match schema definition!");
      console.log("");
      console.log("Tables verified:");
      for (const result of okTables) {
        console.log(`  ✓ ${result.table}`);
      }
    }

    // Exit with error if issues found
    if (missingTables.length > 0 || tablesWithIssues.length > 0) {
      console.log("");
      console.log("⚠️  Schema audit found issues. Review above and apply necessary migrations.");
      process.exit(1);
    }

    console.log("");
    console.log("✅ Schema audit complete - no issues found");
    process.exit(0);
  } catch (error) {
    console.error("❌ Schema audit failed");
    console.error(getTroubleshootingContext(error, "Schema audit"));
    process.exit(1);
  }
}

main();
