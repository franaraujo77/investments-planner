/**
 * Verify Migration Status in Production
 *
 * This script checks:
 * 1. Which migrations are applied in production database
 * 2. Which migration files exist locally
 * 3. Identifies any missing migrations
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/telemetry/logger";
import fs from "fs";
import path from "path";

interface MigrationRow {
  id: string;
  hash: string;
  created_at: string;
}

interface ColumnRow {
  column_name: string;
  data_type: string;
  column_default: string | null;
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
function getTroubleshootingContext(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const dbUrl = redactDatabaseUrl(process.env.DATABASE_URL);

  let context = `\n📋 Error Context:\n`;
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

async function verifyMigrations() {
  logger.info("Checking production migration status");

  try {
    // Get applied migrations from database
    const appliedMigrations = await db.execute(
      sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC`
    );

    const migrationRows = appliedMigrations as unknown as MigrationRow[];

    logger.info("Applied migrations in production", { count: migrationRows.length });

    logger.info("Recent migrations", {
      migrations: migrationRows
        .slice(0, 10)
        .map((m) => `${m.id} (${new Date(m.created_at).toISOString()})`)
        .join(", "),
    });

    // Get local migration files
    const migrationsDir = path.join(process.cwd(), "drizzle");
    const localFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    logger.info("Local migration files found", { count: localFiles.length });

    // Check for any missing migrations
    const appliedIds = new Set(migrationRows.map((row) => row.id));
    const missingMigrations = localFiles.filter((f) => {
      const migrationId = f.replace(".sql", "");
      return !appliedIds.has(migrationId);
    });

    if (missingMigrations.length > 0) {
      logger.warn("Missing migrations in production", {
        count: missingMigrations.length,
        migrations: missingMigrations.join(", "),
      });
      logger.info("Action required: Apply pending migrations with 'pnpm db:migrate'");
    } else {
      logger.info("All local migrations are applied in production");
    }

    // Verify updated_at column exists
    logger.info("Checking alerts table schema");
    const columnCheck = await db.execute(
      sql`SELECT column_name, data_type, column_default
          FROM information_schema.columns
          WHERE table_name = 'alerts'
          AND column_name = 'updated_at'`
    );

    const columnRows = columnCheck as unknown as ColumnRow[];

    if (columnRows.length > 0) {
      const column = columnRows[0];
      if (column) {
        logger.info("Column verified in alerts table", {
          column: "updated_at",
          type: column.data_type,
          default: column.column_default,
        });
      }
    } else {
      logger.error("Column missing in alerts table", {
        column: "updated_at",
        table: "alerts",
        action: "Run 'pnpm db:migrate' to apply pending migrations",
      });
    }
  } catch (error) {
    logger.error("Migration verification failed", {
      error: error instanceof Error ? error.message : String(error),
      troubleshooting: getTroubleshootingContext(error),
    });
    process.exit(1);
  } finally {
    // Close database connection to prevent resource leaks
    await db.$client.end();
  }
}

verifyMigrations()
  .then(() => {
    logger.info("Verification complete");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
