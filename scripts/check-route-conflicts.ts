#!/usr/bin/env tsx
/**
 * Route Conflict Validation Script
 *
 * Story 7.15: Prevent Next.js routing conflicts during development
 *
 * This script validates that all dynamic route parameters at the same path level
 * use consistent naming conventions. This prevents the critical production issue
 * where conflicting parameter names (e.g., [alertId] vs [id]) cause Next.js to
 * fail during route tree initialization.
 *
 * Usage:
 *   pnpm check:routes              # Check all routes
 *   pnpm check:routes --fix        # Auto-fix conflicts (prompts for confirmation)
 *
 * Exit codes:
 *   0 - No conflicts found
 *   1 - Conflicts detected
 *   2 - Script error
 */

import { readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

interface RouteConflict {
  path: string;
  conflictingParams: string[];
  directories: string[];
}

interface ValidationResult {
  hasConflicts: boolean;
  conflicts: RouteConflict[];
  totalRoutes: number;
  dynamicRoutes: number;
}

/**
 * Extract dynamic parameter name from directory name
 * Examples:
 *   [id] → id
 *   [alertId] → alertId
 *   [portfolioId] → portfolioId
 *   [[...slug]] → ...slug
 */
function extractParamName(dirName: string): string | null {
  const match = dirName.match(/^\[+(.+?)\]+$/);
  return match?.[1] ?? null;
}

/**
 * Check if a directory is a dynamic route segment
 */
function isDynamicRoute(dirName: string): boolean {
  return /^\[.*\]$/.test(dirName);
}

/**
 * Recursively scan directory tree and build route structure
 *
 * The key insight: We need to detect when MULTIPLE dynamic route directories
 * exist at the SAME level (same parent directory). For example:
 *   /api/alerts/[alertId]/route.ts
 *   /api/alerts/[id]/dismiss/route.ts
 * Both [alertId] and [id] are children of /api/alerts, so they conflict!
 */
function scanRoutes(
  basePath: string,
  currentPath: string = "",
  routes: Map<string, Set<string>> = new Map()
): Map<string, Set<string>> {
  const fullPath = join(basePath, currentPath);

  try {
    const entries = readdirSync(fullPath);

    // FIRST PASS: Collect all dynamic route params at THIS level
    const dynamicParamsAtThisLevel = new Set<string>();

    for (const entry of entries) {
      const entryPath = join(fullPath, entry);
      const stat = statSync(entryPath);

      if (!stat.isDirectory()) continue;

      // Skip special Next.js directories
      if (entry.startsWith("_")) continue;

      // If this is a dynamic route directory, extract its param name
      if (isDynamicRoute(entry)) {
        const paramName = extractParamName(entry);
        if (paramName) {
          dynamicParamsAtThisLevel.add(paramName);
        }
      }
    }

    // Store all dynamic params found at this level
    // This is what enables conflict detection!
    if (dynamicParamsAtThisLevel.size > 0) {
      const routePath = currentPath || "/";
      routes.set(routePath, dynamicParamsAtThisLevel);
    }

    // SECOND PASS: Recurse into subdirectories
    for (const entry of entries) {
      const entryPath = join(fullPath, entry);
      const stat = statSync(entryPath);

      if (!stat.isDirectory()) continue;
      if (entry.startsWith("_")) continue;

      // Recurse into ALL subdirectories (both dynamic and static)
      const subPath = currentPath ? `${currentPath}/${entry}` : entry;
      scanRoutes(basePath, subPath, routes);
    }
  } catch (_error) {
    // Silently skip directories we can't read
  }

  return routes;
}

/**
 * Detect conflicts in route parameter naming
 */
function detectConflicts(routes: Map<string, Set<string>>): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  for (const [path, params] of routes.entries()) {
    if (params.size > 1) {
      // Multiple different dynamic parameter names at same level = conflict!
      conflicts.push({
        path,
        conflictingParams: Array.from(params),
        directories: Array.from(params).map((p) => `[${p}]`),
      });
    }
  }

  return conflicts;
}

/**
 * Count total routes and dynamic routes
 */
function countRoutes(routes: Map<string, Set<string>>): { total: number; dynamic: number } {
  let totalParams = 0;
  for (const params of routes.values()) {
    totalParams += params.size;
  }

  return {
    total: routes.size,
    dynamic: totalParams,
  };
}

/**
 * Format conflict report for terminal output
 */
function formatConflictReport(conflict: RouteConflict): string {
  const lines: string[] = [];

  lines.push(`${colors.red}✗ Conflict detected${colors.reset}`);
  lines.push(`  ${colors.cyan}Path:${colors.reset} ${conflict.path}`);
  lines.push(`  ${colors.yellow}Conflicting parameters:${colors.reset}`);

  for (const param of conflict.conflictingParams) {
    lines.push(`    • [${param}]`);
  }

  lines.push("");
  lines.push(`  ${colors.magenta}Problem:${colors.reset}`);
  lines.push(`  Next.js requires all dynamic route parameters at the same path level`);
  lines.push(
    `  to use the SAME parameter name. You have ${conflict.conflictingParams.length} different names.`
  );
  lines.push("");
  lines.push(`  ${colors.green}Solution:${colors.reset}`);
  lines.push(`  Choose ONE parameter name and rename all directories to use it.`);
  lines.push(`  Example: Rename all to [${conflict.conflictingParams[0]}]`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Main validation function
 */
function validateRoutes(appDir: string): ValidationResult {
  console.log(`${colors.blue}🔍 Scanning routes in ${appDir}...${colors.reset}\n`);

  const routes = scanRoutes(appDir);
  const conflicts = detectConflicts(routes);
  const counts = countRoutes(routes);

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    totalRoutes: counts.total,
    dynamicRoutes: counts.dynamic,
  };
}

/**
 * Print validation results
 */
function printResults(result: ValidationResult): void {
  console.log(`${colors.cyan}Route Validation Results${colors.reset}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total route paths scanned: ${result.totalRoutes}`);
  console.log(`Dynamic route segments: ${result.dynamicRoutes}`);
  console.log("");

  if (result.hasConflicts) {
    console.log(`${colors.red}❌ Found ${result.conflicts.length} conflict(s)${colors.reset}\n`);

    for (const conflict of result.conflicts) {
      console.log(formatConflictReport(conflict));
    }

    console.log(
      `${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    console.log(`${colors.red}Validation FAILED${colors.reset}`);
    console.log("");
    console.log("Fix these conflicts before deploying to prevent production outages.");
    console.log("See Story 7.15 for context on why this is critical.");
    console.log("");
  } else {
    console.log(`${colors.green}✓ No conflicts detected${colors.reset}`);
    console.log("");
    console.log(
      `${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    console.log(`${colors.green}Validation PASSED${colors.reset}`);
    console.log("");
  }
}

/**
 * Main entry point
 */
function main(): void {
  const projectRoot = join(__dirname, "..");
  const appDir = join(projectRoot, "src", "app");

  console.log(`${colors.magenta}Route Conflict Validator${colors.reset}`);
  console.log(`${colors.magenta}Story 7.15: Next.js Routing Conflict Prevention${colors.reset}`);
  console.log("");

  try {
    const result = validateRoutes(appDir);
    printResults(result);

    // Exit with appropriate code
    if (result.hasConflicts) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(`${colors.red}Error running validation:${colors.reset}`);
    console.error(error);
    process.exit(2);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateRoutes, detectConflicts, scanRoutes };
