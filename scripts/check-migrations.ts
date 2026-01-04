#!/usr/bin/env tsx
/**
 * Check which migrations have been applied
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function checkMigrations() {
  console.log("🔍 Checking Applied Migrations\n");

  const migrations = await sql`
    SELECT *
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log("Recent migrations:");
  for (const migration of migrations) {
    console.log(`✓ ${migration.hash} - ${migration.created_at}`);
  }

  await sql.end();
}

checkMigrations().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
