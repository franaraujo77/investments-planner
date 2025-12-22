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

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/db/schema.ts");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

interface CheckResult {
  table: string;
  hasRls: boolean;
  migration?: string;
}

/**
 * Extract table names from schema.ts
 * Looks for pgTable("table_name", ...) declarations
 */
function extractTablesFromSchema(): string[] {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");

  // Match pgTable("table_name", ...)
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

    // Match: ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY
    // Also match without quotes for flexibility
    const rlsRegex = /ALTER\s+TABLE\s+["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

    let match;
    while ((match = rlsRegex.exec(content)) !== null) {
      const tableName = match[1];
      if (tableName && !rlsMap.has(tableName)) {
        rlsMap.set(tableName, file);
      }
    }
  }

  return rlsMap;
}

/**
 * Main check function
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
  if (missingRls.length > 0) {
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
