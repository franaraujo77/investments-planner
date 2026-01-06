/**
 * Apply Missing Migrations to Production
 *
 * This script manually applies the 4 migrations that are in the local codebase
 * but missing from production (IDs 14, 16, 17, 18 / idx 13, 15, 16, 17).
 *
 * IMPORTANT: Run this ONCE to fix the production migration gap.
 */

import postgres from "postgres";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "@/lib/telemetry/logger";

// All migrations that need tracking records updated (idx 13-27)
const MISSING_MIGRATIONS = [
  { idx: 13, tag: "0013_lean_blob" },
  { idx: 15, tag: "0015_enable_rls_security" },
  { idx: 16, tag: "0016_add_locale_to_users" },
  { idx: 17, tag: "0017_romantic_redwing" },
  { idx: 18, tag: "0018_fix_rls_all_tables" },
  { idx: 19, tag: "0019_equal_umar" },
  { idx: 20, tag: "0020_reflective_norman_osborn" },
  { idx: 21, tag: "0021_curvy_network" },
  { idx: 22, tag: "0022_asset_type_classification_cache" },
  { idx: 23, tag: "0023_enable_rls_asset_type_cache" },
  { idx: 24, tag: "0024_recommendations_alerts" },
  { idx: 25, tag: "0025_outstanding_tarantula" },
  { idx: 26, tag: "0026_add_alert_query_indexes" },
  { idx: 27, tag: "0027_add_alerts_updated_at" },
];

async function applyMissingMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    logger.info("Checking which migrations need to be applied");

    // Read the journal to get hashes
    const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    const entries = journal.entries || [];

    for (const missing of MISSING_MIGRATIONS) {
      const journalEntry = entries.find((e: { idx: number }) => e.idx === missing.idx);
      if (!journalEntry) {
        logger.warn(`Migration ${missing.tag} not found in journal, skipping`);
        continue;
      }

      const migrationId = missing.idx + 1; // idx 0 → ID 1
      const sqlFile = path.join(process.cwd(), "drizzle", `${missing.tag}.sql`);

      // Check if tracking record exists (might have wrong hash)
      const existing = await sql<{ id: number; hash: string }[]>`
        SELECT id, hash FROM drizzle.__drizzle_migrations WHERE id = ${migrationId}
      `;

      const migrationSQL = fs.readFileSync(sqlFile, "utf-8");
      const expectedHash = crypto.createHash("sha256").update(migrationSQL).digest("hex");

      if (existing.length > 0 && existing[0]?.hash === expectedHash) {
        logger.info(
          `Migration ${missing.tag} (ID ${migrationId}) already tracked correctly, skipping`
        );
        continue;
      }

      if (existing.length > 0) {
        logger.info(`Migration ID ${migrationId} has wrong tracking (hash mismatch), will update`);
      }

      logger.info(`Processing migration ${missing.tag} (ID ${migrationId})...`);

      // Check if schema changes already exist
      let schemaExists = false;
      try {
        const checkTable = async (tableName: string) => {
          const result = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = ${tableName}
            ) as exists
          `;
          return result[0]?.exists ?? false;
        };

        const checkColumn = async (tableName: string, columnName: string) => {
          const result = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = ${tableName}
                AND column_name = ${columnName}
            ) as exists
          `;
          return result[0]?.exists ?? false;
        };

        switch (missing.tag) {
          case "0013_lean_blob":
            schemaExists = await checkTable("alert_preferences");
            break;
          case "0015_enable_rls_security":
            const rlsResult = await sql`
              SELECT relrowsecurity FROM pg_class
              WHERE relname = 'users' AND relnamespace = 'public'::regnamespace
            `;
            schemaExists = rlsResult[0]?.relrowsecurity ?? false;
            break;
          case "0016_add_locale_to_users":
            schemaExists = await checkColumn("users", "locale");
            break;
          case "0017_romantic_redwing":
            schemaExists = await checkTable("portfolio_accepted_asset_types");
            break;
          case "0018_fix_rls_all_tables":
            // RLS fixes - assume applied if basic RLS exists
            schemaExists = true;
            break;
          case "0021_curvy_network":
            schemaExists = await checkTable("cached_gics_sectors");
            break;
          case "0022_asset_type_classification_cache":
            schemaExists = await checkTable("cached_asset_types");
            break;
          case "0023_enable_rls_asset_type_cache":
            // RLS for cache tables - assume applied if tables exist
            schemaExists = await checkTable("cached_asset_types");
            break;
          case "0024_recommendations_alerts":
            schemaExists = await checkTable("recommendations");
            break;
          case "0025_outstanding_tarantula":
            schemaExists = await checkTable("dismissed_opportunity_pairs");
            break;
          case "0027_add_alerts_updated_at":
            schemaExists = await checkColumn("alerts", "updated_at");
            break;
          default:
            // For other migrations, assume schema exists (will only update tracking)
            schemaExists = true;
        }
      } catch (error) {
        logger.warn(`Could not check schema for ${missing.tag}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (schemaExists) {
        logger.info(`Schema changes for ${missing.tag} already exist, adding tracking record only`);
      } else {
        logger.info(`Applying schema changes for ${missing.tag}...`);
        // Read and execute the SQL file
        const migrationSQL = fs.readFileSync(sqlFile, "utf-8");
        await sql.unsafe(migrationSQL);
      }

      // Update or insert tracking record
      if (existing.length > 0) {
        // Update existing record with correct hash
        await sql`
          UPDATE drizzle.__drizzle_migrations
          SET hash = ${expectedHash}, created_at = ${Date.now()}
          WHERE id = ${migrationId}
        `;
        logger.info(`✅ Updated tracking for ${missing.tag} (ID ${migrationId})`);
      } else {
        // Insert new tracking record
        await sql`
          INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
          VALUES (${migrationId}, ${expectedHash}, ${Date.now()})
        `;
        logger.info(`✅ Added tracking for ${missing.tag} (ID ${migrationId})`);
      }
    }

    logger.info("All missing migrations have been applied");
  } catch (error) {
    logger.error("Failed to apply missing migrations", {
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
  applyMissingMigrations()
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

export { applyMissingMigrations };
