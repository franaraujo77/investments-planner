#!/usr/bin/env npx tsx
/**
 * Security Check: RLS Coverage Verification
 *
 * This script verifies that all tables defined in the schema have Row Level Security (RLS)
 * enabled in the migration files. It helps prevent security regressions when new tables
 * are added to the schema.
 *
 * Run: pnpm security:check-rls
 * CI: Runs automatically on PRs that modify schema.ts or migration files
 */

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// TYPES
// =============================================================================

export interface CheckResult {
  table: string;
  hasRls: boolean;
  migration?: string;
}

export interface RlsCoverageResult {
  tables: string[];
  rlsEnabled: Map<string, string>;
  results: CheckResult[];
  missingRls: string[];
  passed: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/db/schema.ts");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

// =============================================================================
// CORE FUNCTIONS (exported for testing)
// =============================================================================

/**
 * Extract table names from schema content
 * Looks for pgTable("table_name", ...) declarations
 *
 * @param schemaContent - The content of schema.ts file
 * @returns Array of table names found in the schema
 */
export function extractTablesFromContent(schemaContent: string): string[] {
  // Match pgTable("table_name", ...) or pgTable('table_name', ...)
  const tableRegex = /pgTable\s*\(\s*["']([^"']+)["']/g;
  const tables: string[] = [];

  let match;
  while ((match = tableRegex.exec(schemaContent)) !== null) {
    if (match[1]) {
      tables.push(match[1]);
    }
  }

  return tables;
}

/**
 * Extract table names from schema.ts file
 * Wrapper around extractTablesFromContent for file system access
 */
function extractTablesFromSchema(): string[] {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
  return extractTablesFromContent(schemaContent);
}

/**
 * Find RLS enablement statements in migration content
 *
 * @param migrationContent - The content of a migration file
 * @param fileName - The name of the migration file (for mapping)
 * @returns Array of table names that have RLS enabled in this migration
 *
 * Note: The regex allows both quoted ("table") and unquoted (table) table names
 * for flexibility. While our migrations consistently use double quotes, this
 * handles hand-written migrations or different SQL formatting styles.
 */
export function findRlsInMigration(
  migrationContent: string,
  fileName: string
): Map<string, string> {
  const rlsMap = new Map<string, string>();

  // Match: ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY
  // Flexibility: Allows quoted ("table"), single-quoted ('table'), or unquoted (table) names
  // This handles different SQL formatting styles and hand-written migrations
  const rlsRegex = /ALTER\s+TABLE\s+["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

  let match;
  while ((match = rlsRegex.exec(migrationContent)) !== null) {
    const tableName = match[1];
    if (tableName && !rlsMap.has(tableName)) {
      rlsMap.set(tableName, fileName);
    }
  }

  return rlsMap;
}

/**
 * Check migration files for RLS enablement statements
 * Returns a map of table -> migration file where RLS was enabled
 */
function findRlsEnabledTables(): Map<string, string> {
  const rlsMap = new Map<string, string>();

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    const fileRls = findRlsInMigration(content, file);

    // Merge results (first occurrence wins)
    for (const [table, migration] of fileRls) {
      if (!rlsMap.has(table)) {
        rlsMap.set(table, migration);
      }
    }
  }

  return rlsMap;
}

/**
 * Check RLS coverage for given tables and RLS map
 *
 * @param tables - Array of table names from schema
 * @param rlsEnabled - Map of table names to migration files where RLS was enabled
 * @returns RlsCoverageResult with full analysis
 */
export function checkRlsCoverageForTables(
  tables: string[],
  rlsEnabled: Map<string, string>
): RlsCoverageResult {
  const results: CheckResult[] = [];
  const missingRls: string[] = [];

  for (const table of tables) {
    const hasRls = rlsEnabled.has(table);
    const migration = rlsEnabled.get(table);

    const result: CheckResult = { table, hasRls };
    if (migration) {
      result.migration = migration;
    }
    results.push(result);

    if (!hasRls) {
      missingRls.push(table);
    }
  }

  return {
    tables,
    rlsEnabled,
    results,
    missingRls,
    passed: missingRls.length === 0,
  };
}

/**
 * Main check function - orchestrates the full check and outputs results
 */
function checkRlsCoverage(): void {
  console.log("🔒 Security Check: RLS Coverage Verification\n");

  // Get all tables from schema
  const tables = extractTablesFromSchema();
  console.log(`📋 Found ${tables.length} tables in schema.ts\n`);

  // Get tables with RLS enabled in migrations
  const rlsEnabled = findRlsEnabledTables();
  console.log(`✅ Found ${rlsEnabled.size} tables with RLS enabled in migrations\n`);

  // Check coverage
  const { results, missingRls, passed } = checkRlsCoverageForTables(tables, rlsEnabled);

  // Report results
  console.log("📊 Results:\n");
  console.log("| Table | RLS Enabled | Migration |");
  console.log("|-------|-------------|-----------|");

  for (const result of results.sort((a, b) => a.table.localeCompare(b.table))) {
    const status = result.hasRls ? "✅" : "❌";
    const migration = result.migration || "-";
    console.log(`| ${result.table} | ${status} | ${migration} |`);
  }

  console.log("");

  // Final verdict
  if (!passed) {
    console.error("❌ SECURITY CHECK FAILED\n");
    console.error("The following tables do NOT have Row Level Security enabled:\n");
    for (const table of missingRls) {
      console.error(`  - ${table}`);
    }
    console.error("\n📝 To fix this:");
    console.error("1. Create a new migration file in drizzle/");
    console.error('2. Add: ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;');
    console.error("3. Add appropriate policies if needed");
    console.error("\nSee drizzle/0015_enable_rls_security.sql for examples.\n");
    process.exit(1);
  } else {
    console.log("✅ SECURITY CHECK PASSED");
    console.log("All tables have Row Level Security enabled.\n");
  }
}

// Run the check
checkRlsCoverage();
