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

async function verifyMigrations() {
  console.log("🔍 Checking production migration status...\n");

  try {
    // Get applied migrations from database
    const appliedMigrations = await db.execute(
      sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC`
    );

    console.log(`✅ Applied migrations in production: ${appliedMigrations.rows.length}\n`);

    console.log("Recent migrations:");
    appliedMigrations.rows.slice(0, 10).forEach((row) => {
      const migration = row as MigrationRow;
      console.log(`  - ${migration.id} (${new Date(migration.created_at).toISOString()})`);
    });

    // Get local migration files
    const migrationsDir = path.join(process.cwd(), "drizzle");
    const localFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`\n📁 Local migration files: ${localFiles.length}\n`);

    // Check for migration 0014 specifically
    const migration14Applied = appliedMigrations.rows.some((row) =>
      (row as MigrationRow).id.includes("0014")
    );

    if (migration14Applied) {
      console.log("✅ Migration 0014 (alerts updated_at) IS APPLIED");
    } else {
      console.log("❌ Migration 0014 (alerts updated_at) IS NOT APPLIED");
    }

    // Check for any missing migrations
    const appliedIds = new Set(appliedMigrations.rows.map((row) => (row as MigrationRow).id));
    const missingMigrations = localFiles.filter((f) => {
      const migrationId = f.replace(".sql", "");
      return !appliedIds.has(migrationId);
    });

    if (missingMigrations.length > 0) {
      console.log("\n⚠️  Missing migrations in production:");
      missingMigrations.forEach((m) => console.log(`  - ${m}`));
    } else {
      console.log("\n✅ All local migrations are applied in production");
    }

    // Verify updated_at column exists
    console.log("\n🔍 Checking alerts table schema...");
    const columnCheck = await db.execute(
      sql`SELECT column_name, data_type, column_default
          FROM information_schema.columns
          WHERE table_name = 'alerts'
          AND column_name = 'updated_at'`
    );

    if (columnCheck.rows.length > 0) {
      const column = columnCheck.rows[0] as ColumnRow;
      console.log("✅ Column 'updated_at' EXISTS in alerts table");
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Default: ${column.column_default}`);
    } else {
      console.log("❌ Column 'updated_at' DOES NOT EXIST in alerts table");
    }
  } catch (error) {
    console.error("❌ Error checking migrations:", error);
    process.exit(1);
  }
}

verifyMigrations()
  .then(() => {
    console.log("\n✅ Verification complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
