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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaTableNames(): Map<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tables = new Map<string, any>();

  // Extract all table definitions from schema
  for (const [_key, value] of Object.entries(schema)) {
    // Check if it's a Drizzle table
    // @ts-expect-error - Drizzle uses symbols for internal metadata, type system doesn't track this
    if (value && typeof value === "object" && value[Symbol.for("drizzle:isPgTable")]) {
      // @ts-expect-error - Drizzle uses symbols for internal metadata
      const tableName = value[Symbol.for("drizzle:Name")];
      tables.set(tableName, value);
    }
  }

  return tables;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaColumnNames(table: any): Set<string> {
  const columns = new Set<string>();

  // Get columns from table definition

  const tableColumns = (table[Symbol.for("drizzle:Columns")] || {}) as Record<
    string,
    { name?: string }
  >;

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
    console.error("❌ Audit failed:", error);
    process.exit(1);
  }
}

main();
