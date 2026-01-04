#!/usr/bin/env tsx
/**
 * Manually apply index creation for Story 7.13
 * This ensures indexes are created on the target database
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function applyIndexes() {
  console.log("🔧 Applying Alert Query Indexes (Story 7.13)\n");

  try {
    // AC-7.13.1, AC-7.13.2: Composite index for user + type filtering
    console.log("Creating alerts_user_type_idx...");
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS "alerts_user_type_idx"
      ON "alerts"(user_id, type)
      WHERE is_dismissed = false;
    `);
    console.log("✅ alerts_user_type_idx created");

    // AC-7.13.3: Upgrade snoozed_until to partial index
    console.log("\nUpgrading alerts_snoozed_until_idx to partial index...");
    await sql.unsafe(`DROP INDEX IF EXISTS "alerts_snoozed_until_idx";`);
    console.log("  Dropped old index");

    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS "alerts_snoozed_until_idx"
      ON "alerts"(snoozed_until)
      WHERE snoozed_until IS NOT NULL;
    `);
    console.log("✅ alerts_snoozed_until_idx created (partial)");

    console.log("\n✅ All indexes applied successfully!");
  } catch (error) {
    console.error("❌ Error applying indexes:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyIndexes();
