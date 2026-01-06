/**
 * Verify Migration Status in Production
 *
 * This script checks:
 * 1. Which migrations are applied in production database
 * 2. Which migration files exist locally
 * 3. Identifies any missing migrations
 */

import { logger } from "@/lib/telemetry/logger";
import { getTroubleshootingContext } from "@/lib/db/migration-utils";
import fs from "fs";
import path from "path";
import postgres from "postgres";

async function verifyMigrations() {
  logger.info("Checking production migration status");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error("DATABASE_URL environment variable is not set");
    throw new Error("DATABASE_URL is required");
  }

  // Use raw postgres connection like run-migrations.ts
  const sql = postgres(connectionString, { max: 1 });

  try {
    // Get applied migrations from database using raw SQL
    const appliedMigrations = await sql<
      { id: number; hash: string; created_at: number }[]
    >`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC`;

    const migrationRows = appliedMigrations;

    logger.info("Applied migrations in production", { count: migrationRows.length });

    logger.info("Recent migrations", {
      migrations: migrationRows
        .slice(0, 10)
        .map((m) => `${m.id}`)
        .join(", "),
    });

    // Get local migration journal
    const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    const localMigrations = journal.entries || [];

    logger.info("Local migrations in journal", { count: localMigrations.length });

    // Drizzle stores migrations by index (idx) starting from 1
    // So migration with idx:0 is stored as id:1, idx:1 as id:2, etc.
    const expectedIds = new Set(
      localMigrations.map((entry: { idx: number }) => String(entry.idx + 1))
    );
    const appliedIds = new Set(migrationRows.map((row) => String(row.id)));

    // Find migrations in journal but not in database
    const missingInDb = localMigrations.filter(
      (entry: { idx: number; tag: string }) => !appliedIds.has(String(entry.idx + 1))
    );

    // Find migrations in database but not in journal (orphaned)
    const orphanedInDb = migrationRows.filter((row) => !expectedIds.has(String(row.id)));

    if (missingInDb.length > 0) {
      logger.warn("Missing migrations in production", {
        count: missingInDb.length,
        migrations: missingInDb.map((e: { tag: string }) => e.tag).join(", "),
      });
      logger.info("Action required: Apply pending migrations with 'pnpm db:migrate'");
    } else {
      logger.info("All local migrations are applied in production");
    }

    if (orphanedInDb.length > 0) {
      logger.warn("Orphaned migrations in production (not in local journal)", {
        count: orphanedInDb.length,
        ids: orphanedInDb.map((row) => row.id).join(", "),
      });
      logger.info(
        "These migrations were applied but are no longer in your codebase. " +
          "This can happen if migrations were deleted or the codebase was rolled back."
      );
    }
  } catch (error) {
    logger.error("Migration verification failed", {
      error: error instanceof Error ? error.message : String(error),
      troubleshooting: getTroubleshootingContext(error),
    });
    throw error;
  } finally {
    // Always close database connection to prevent resource leaks
    await sql.end();
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
