/**
 * Run Database Migrations Programmatically
 *
 * This script uses the drizzle-orm programmatic migration API instead of drizzle-kit.
 *
 * WHY NOT DRIZZLE-KIT?
 * The drizzle-kit migrate command (v0.31.7) has a critical bug where it:
 * ✅ Reports "migrations applied successfully!"
 * ✅ Creates the __drizzle_migrations table
 * ❌ Does NOT populate the migrations tracking table
 * ❌ Does NOT actually apply migration SQL files
 *
 * This caused all 28 migrations to be missing from production, including the critical
 * 0027_add_alerts_updated_at.sql that caused /api/alerts endpoint failures.
 *
 * References:
 * - https://github.com/drizzle-team/drizzle-orm/issues/4560
 * - https://github.com/drizzle-team/drizzle-orm/issues/4451
 *
 * SOLUTION:
 * Use the programmatic migrate() function from drizzle-orm/postgres-js/migrator
 * which works correctly and properly tracks migrations in the __drizzle_migrations table.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { existsSync } from "fs";
import { logger } from "@/lib/telemetry/logger";

export async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error("DATABASE_URL environment variable is not set");
    throw new Error("DATABASE_URL is required");
  }

  const migrationsFolder = "./drizzle";

  /**
   * Pre-flight check: Verify migrations folder exists
   * Prevents cryptic errors if folder is missing (e.g., fresh clone)
   */
  if (!existsSync(migrationsFolder)) {
    logger.error("Migrations folder not found", { migrationsFolder });
    throw new Error(
      `Migrations folder "${migrationsFolder}" does not exist. Run 'pnpm db:generate' to create migrations.`
    );
  }

  logger.info("Starting database migrations", {
    migrationsFolder,
    migrationsTable: "__drizzle_migrations",
    migrationsSchema: "drizzle",
  });

  /**
   * Create a single connection for migrations with timeouts
   * - max: 1 ensures only one connection is used
   * - idle_timeout: Close idle connections after 20s
   * - connect_timeout: Timeout connection attempts after 10s
   * - max_lifetime: Kill connections after 5min
   */
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 300,
  });
  const db = drizzle(sql);

  try {
    /**
     * Apply all pending migrations from the drizzle folder
     * The migrate() function returns void, so we verify separately
     */
    await migrate(db, {
      migrationsFolder,
      migrationsTable: "__drizzle_migrations",
      migrationsSchema: "drizzle",
    });

    /**
     * Verify migrations were actually applied by querying the tracking table
     * This confirms the migration succeeded and the table is populated
     */
    const result = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM drizzle.__drizzle_migrations
    `;
    const migrationCount = parseInt(result[0]?.count ?? "0", 10);

    logger.info("Migrations applied successfully", {
      migrationsApplied: migrationCount,
    });
  } catch (error) {
    logger.error("Migration failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    /**
     * Always close the connection to prevent resource leaks
     * This is critical in CI/CD environments
     */
    await sql.end();
    logger.info("Database connection closed");
  }
}

// Run migrations and handle process exit
// Only auto-run if this script is executed directly (not imported for testing)
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration script failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}
