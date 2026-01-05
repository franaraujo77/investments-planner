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
import { logger } from "@/lib/telemetry/logger";
import {
  getTroubleshootingContext,
  validateDrizzleTable,
  DRIZZLE_SYMBOLS,
  isTableNameRow,
  isColumnInfoRow,
} from "@/lib/db/migration-utils";
import * as schema from "@/lib/db/schema";
import type { PgTable } from "drizzle-orm/pg-core";

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

async function getProductionTables(): Promise<Set<string>> {
  const result = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);

  // Use type guard to validate and filter rows
  const rows = (result as unknown[]).filter(isTableNameRow);
  return new Set(rows.map((row) => row.tablename));
}

async function getProductionColumns(tableName: string): Promise<Map<string, ColumnInfo>> {
  const result = await db.execute(
    sql`SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}`
  );

  // Use type guard to validate and filter rows
  const rows = (result as unknown[]).filter(isColumnInfoRow);
  const columns = new Map<string, ColumnInfo>();

  for (const dbRow of rows) {
    columns.set(dbRow.column_name, {
      columnName: dbRow.column_name,
      dataType: dbRow.data_type,
      isNullable: dbRow.is_nullable,
      columnDefault: dbRow.column_default,
    });
  }
  return columns;
}

/**
 * Get all table definitions from schema
 * Uses PgTable type for type safety while accessing Drizzle internal symbols
 */
function getSchemaTableNames(): Map<string, PgTable> {
  const tables = new Map<string, PgTable>();

  // Extract all table definitions from schema
  for (const [_key, value] of Object.entries(schema)) {
    // Validate it's a Drizzle table with required symbols
    if (validateDrizzleTable(value)) {
      // @ts-expect-error - Drizzle uses symbols for internal metadata
      const tableName = value[DRIZZLE_SYMBOLS.name] as string;
      tables.set(tableName, value as PgTable);
    }
  }

  if (tables.size === 0) {
    logger.warn("No Drizzle tables found in schema - check Drizzle API compatibility");
  }

  return tables;
}

/**
 * Extract column names from a Drizzle table definition
 * @param table - PgTable instance with Drizzle internal metadata
 * @returns Set of column names defined in the schema
 */
function getSchemaColumnNames(table: PgTable): Set<string> {
  const columns = new Set<string>();

  // Validate table has required symbols
  if (!validateDrizzleTable(table)) {
    logger.warn("Invalid Drizzle table - skipping column extraction");
    return columns;
  }

  // Get columns from table definition
  // @ts-expect-error - Drizzle uses symbols for internal metadata
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
  logger.info("Starting production schema audit");

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
      logger.warn("Table missing in production", { table: tableName });
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
      if (missingColumns.length > 0) {
        logger.warn("Missing columns in production", {
          table: tableName,
          columns: missingColumns.join(", "),
        });
      }
      if (extraColumns.length > 0) {
        logger.info("Extra columns in production not in schema", {
          table: tableName,
          columns: extraColumns.join(", "),
        });
      }
    } else {
      results.push({
        table: tableName,
        status: "ok",
      });
    }
  }

  logger.info("Schema audit completed", { tablesChecked: results.length });
  return results;
}

async function main() {
  try {
    const results = await auditSchema();

    // Categorize results
    const okTables = results.filter((r) => r.status === "ok");
    const missingTables = results.filter((r) => r.status === "missing-table");
    const tablesWithIssues = results.filter((r) => r.status === "missing-columns");

    // Log summary
    logger.info("Audit Summary", {
      totalTables: results.length,
      okTables: okTables.length,
      missingTables: missingTables.length,
      tablesWithIssues: tablesWithIssues.length,
    });

    // Log detailed results
    if (missingTables.length > 0) {
      logger.error("Missing tables in production", {
        tables: missingTables.map((r) => r.table).join(", "),
        action: "Create missing tables with migrations",
      });
    }

    if (tablesWithIssues.length > 0) {
      for (const result of tablesWithIssues) {
        if (result.missingColumns && result.missingColumns.length > 0) {
          logger.error("Missing columns in production", {
            table: result.table,
            missingColumns: result.missingColumns.join(", "),
            action:
              "Run 'pnpm db:generate' to create migration, then 'pnpm db:migrate' to apply it",
          });
        }
        if (result.extraColumns && result.extraColumns.length > 0) {
          logger.warn("Extra columns in production not in schema", {
            table: result.table,
            extraColumns: result.extraColumns.join(", "),
            action: "Update schema.ts to match production or remove columns with migration",
          });
        }
      }
    }

    if (okTables.length > 0 && missingTables.length === 0 && tablesWithIssues.length === 0) {
      logger.info("All tables match schema definition", {
        verifiedTables: okTables.map((r) => r.table).join(", "),
      });
    }

    // Exit with error if issues found
    if (missingTables.length > 0 || tablesWithIssues.length > 0) {
      logger.error("Schema audit found issues", {
        nextSteps: [
          "1. Review migration files in drizzle/ directory",
          "2. Run 'pnpm db:generate' to create new migrations if needed",
          "3. Run 'pnpm db:migrate' to apply pending migrations",
          "4. Re-run this audit to verify fixes",
        ].join("; "),
      });
      process.exit(1);
    }

    logger.info("Schema audit complete - no issues found");
    process.exit(0);
  } catch (error) {
    logger.error("Schema audit failed", {
      error: error instanceof Error ? error.message : String(error),
      troubleshooting: getTroubleshootingContext(error, "Schema audit"),
    });
    process.exit(1);
  } finally {
    // Close database connection to prevent resource leaks
    await db.$client.end();
  }
}

main();
