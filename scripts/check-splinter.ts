#!/usr/bin/env npx tsx
/**
 * Supabase Splinter Database Linter Integration
 *
 * This script runs Supabase Splinter lints against a live PostgreSQL database
 * to identify schema issues including:
 * - Performance issues (unindexed foreign keys, unused indexes)
 * - Security issues (exposed auth.users, missing RLS, insecure policies)
 * - Schema issues (missing primary keys, extensions in public schema)
 * - API exposure issues (materialized views, foreign tables without RLS)
 *
 * Run: pnpm security:splinter
 * Requires: DATABASE_URL environment variable
 *
 * @see https://supabase.github.io/splinter
 */

import postgres from "postgres";

// =============================================================================
// CONSTANTS
// =============================================================================

const SPLINTER_SQL_URL = "https://raw.githubusercontent.com/supabase/splinter/main/splinter.sql";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Lint result from Splinter SQL execution
 */
export interface LintResult {
  name: string;
  title: string;
  level: "ERROR" | "WARN" | "INFO";
  facing: "INTERNAL" | "EXTERNAL";
  categories: string[];
  description: string;
  detail: string;
  remediation: string;
  metadata: Record<string, unknown> | null;
  cache_key: string;
}

/**
 * Grouped lint results by severity level
 */
export interface GroupedLints {
  errors: LintResult[];
  warnings: LintResult[];
  infos: LintResult[];
}

/**
 * Splinter check result
 */
export interface SplinterResult {
  total: number;
  external: number;
  grouped: GroupedLints;
  passed: boolean;
}

// =============================================================================
// CORE FUNCTIONS (exported for testing)
// =============================================================================

/**
 * Fetch the latest Splinter SQL from GitHub
 *
 * @returns The Splinter SQL query string
 * @throws Error if fetch fails or times out
 */
export async function fetchSplinterSQL(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(SPLINTER_SQL_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch splinter.sql: ${response.statusText}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Group lint results by severity level
 *
 * @param lints - Array of lint results
 * @returns Grouped lint results
 */
export function groupLintsBySeverity(lints: LintResult[]): GroupedLints {
  return {
    errors: lints.filter((r) => r.level === "ERROR"),
    warnings: lints.filter((r) => r.level === "WARN"),
    infos: lints.filter((r) => r.level === "INFO"),
  };
}

/**
 * Filter lints to only include EXTERNAL-facing issues
 * These are user-relevant issues, not Supabase-internal
 *
 * @param lints - Array of lint results
 * @returns Filtered lint results
 */
export function filterExternalLints(lints: LintResult[]): LintResult[] {
  return lints.filter((r) => r.facing === "EXTERNAL");
}

/**
 * Format a single lint result for console output
 *
 * @param lint - The lint result to format
 * @param prefix - Prefix string for indentation
 * @returns Formatted string for console output
 */
export function formatLintResult(lint: LintResult, prefix: string = ""): string {
  const lines: string[] = [];
  lines.push(`${prefix}[${lint.name}] ${lint.title}`);
  lines.push(`${prefix}${lint.description}`);
  if (lint.detail) {
    lines.push(`${prefix}Detail: ${lint.detail}`);
  }
  if (lint.remediation) {
    lines.push(`${prefix}Fix: ${lint.remediation}`);
  }
  return lines.join("\n");
}

/**
 * Analyze Splinter results and prepare report
 *
 * @param results - Raw lint results from database
 * @returns SplinterResult with analysis
 */
export function analyzeResults(results: LintResult[]): SplinterResult {
  const externalLints = filterExternalLints(results);
  const grouped = groupLintsBySeverity(externalLints);

  return {
    total: results.length,
    external: externalLints.length,
    grouped,
    passed: grouped.errors.length === 0,
  };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Main Splinter execution function
 *
 * @returns Exit code (0 for success, 1 for failure)
 */
async function runSplinter(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    process.stderr.write("❌ DATABASE_URL environment variable required\n");
    process.stderr.write("\nPlease set DATABASE_URL to your PostgreSQL connection string.\n");
    process.stderr.write('Example: DATABASE_URL="postgresql://user:pass@host:5432/db"\n');
    return 1;
  }

  process.stdout.write("🔍 Supabase Splinter Database Linter\n\n");
  process.stdout.write("Fetching latest Splinter lints from GitHub...\n");

  let splinterSQL: string;
  try {
    splinterSQL = await fetchSplinterSQL();
    process.stdout.write("✅ Splinter SQL loaded\n\n");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(`❌ Failed to fetch Splinter SQL: ${errorMessage}\n`);
    return 1;
  }

  process.stdout.write("Connecting to database...\n");

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30, // Increased for Supabase pooler cold starts
    prepare: false,
  });

  try {
    process.stdout.write("Running lints against database schema...\n\n");
    const results = await sql.unsafe<LintResult[]>(splinterSQL);

    const analysis = analyzeResults(results);
    const { grouped, passed } = analysis;

    // Summary
    process.stdout.write("📊 Splinter Results:\n\n");
    process.stdout.write(`   Total lints:     ${analysis.total}\n`);
    process.stdout.write(`   External lints:  ${analysis.external}\n`);
    process.stdout.write(`   Errors:          ${grouped.errors.length}\n`);
    process.stdout.write(`   Warnings:        ${grouped.warnings.length}\n`);
    process.stdout.write(`   Info:            ${grouped.infos.length}\n\n`);

    // Errors
    if (grouped.errors.length > 0) {
      process.stderr.write("❌ ERRORS (must fix):\n\n");
      for (const err of grouped.errors) {
        process.stderr.write(formatLintResult(err, "   ") + "\n\n");
      }
    }

    // Warnings
    if (grouped.warnings.length > 0) {
      process.stdout.write("⚠️  WARNINGS (should review):\n\n");
      for (const warn of grouped.warnings) {
        process.stdout.write(formatLintResult(warn, "   ") + "\n\n");
      }
    }

    // Info
    if (grouped.infos.length > 0) {
      process.stdout.write("ℹ️  INFO:\n\n");
      for (const info of grouped.infos) {
        process.stdout.write(`   [${info.name}] ${info.title}\n`);
        if (info.detail) {
          process.stdout.write(`   Detail: ${info.detail}\n`);
        }
        process.stdout.write("\n");
      }
    }

    // Final verdict
    if (!passed) {
      process.stderr.write("❌ SPLINTER CHECK FAILED\n\n");
      process.stderr.write(`${grouped.errors.length} error(s) must be fixed before deployment.\n`);
      process.stderr.write(
        "See: https://supabase.github.io/splinter for remediation guidance.\n\n"
      );
      return 1;
    }

    process.stdout.write("✅ SPLINTER CHECK PASSED\n\n");
    if (grouped.warnings.length > 0) {
      process.stdout.write(`Note: ${grouped.warnings.length} warning(s) should be reviewed.\n`);
    }
    return 0;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(`❌ Splinter execution failed: ${errorMessage}\n`);
    return 1;
  } finally {
    await sql.end();
  }
}

// Run the check
runSplinter()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((err) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(`❌ Unexpected error: ${errorMessage}\n`);
    process.exit(1);
  });
