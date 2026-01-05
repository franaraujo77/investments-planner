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
import { getTroubleshootingContext, isMigrationRow } from "@/lib/db/migration-utils";
import fs from "fs";
import path from "path";

async function verifyMigrations() {
  logger.info("Checking production migration status");

  try {
    // Get applied migrations from database
    const appliedMigrations = await db.execute(
      sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC`
    );

    // Validate and filter migration rows using type guard
    const migrationRows = (appliedMigrations as unknown[]).filter(isMigrationRow);

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
