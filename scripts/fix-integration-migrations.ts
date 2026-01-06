/**
 * Fix Integration Database Migration Tracking
 *
 * The integration DB schema is up-to-date, but migration tracking is wrong.
 * This script:
 * 1. Deletes orphaned migration records (IDs 31-56)
 * 2. Inserts correct tracking for all 28 local migrations (IDs 1-28)
 */

import postgres from "postgres";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "@/lib/telemetry/logger";

async function fixIntegrationMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    logger.info("Fixing integration database migration tracking");

    // Step 1: Delete orphaned migrations (IDs > 28)
    const deleteResult = await sql`
      DELETE FROM drizzle.__drizzle_migrations
      WHERE id > 28
      RETURNING id
    `;
    logger.info(`Deleted ${deleteResult.length} orphaned migration records`);

    // Step 2: Read local journal
    const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    const entries = journal.entries || [];

    logger.info(`Found ${entries.length} migrations in local journal`);

    // Step 3: Insert all local migrations
    let inserted = 0;
    let updated = 0;

    for (const entry of entries) {
      const migrationId = entry.idx + 1; // idx 0 → ID 1
      const sqlFile = path.join(process.cwd(), "drizzle", `${entry.tag}.sql`);
      const sqlContent = fs.readFileSync(sqlFile, "utf-8");
      const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

      // Check if already exists
      const existing = await sql`
        SELECT id, hash FROM drizzle.__drizzle_migrations WHERE id = ${migrationId}
      `;

      if (existing.length > 0) {
        if (existing[0]?.hash !== hash) {
          // Update with correct hash
          await sql`
            UPDATE drizzle.__drizzle_migrations
            SET hash = ${hash}, created_at = ${entry.when}
            WHERE id = ${migrationId}
          `;
          updated++;
          logger.info(`Updated tracking for ${entry.tag} (ID ${migrationId})`);
        } else {
          logger.info(`${entry.tag} (ID ${migrationId}) already correct`);
        }
      } else {
        // Insert new record
        await sql`
          INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
          VALUES (${migrationId}, ${hash}, ${entry.when})
        `;
        inserted++;
        logger.info(`Added tracking for ${entry.tag} (ID ${migrationId})`);
      }
    }

    logger.info("Integration database migration tracking fixed", {
      deleted: deleteResult.length,
      inserted,
      updated,
      total: entries.length,
    });
  } catch (error) {
    logger.error("Failed to fix integration migrations", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
if (require.main === module) {
  fixIntegrationMigrations()
    .then(() => {
      logger.info("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Script failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}

export { fixIntegrationMigrations };
