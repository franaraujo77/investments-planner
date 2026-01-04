#!/usr/bin/env tsx
/**
 * Verify database indexes for Story 7.13
 * This script checks that all required indexes exist and shows their definitions
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function verifyIndexes() {
  console.log("🔍 Verifying Alert Query Indexes (Story 7.13)\n");

  // Check alerts table indexes
  const alertIndexes = await sql`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'alerts'
      AND indexname LIKE 'alerts_%'
    ORDER BY indexname
  `;

  console.log("📊 Alerts Table Indexes:");
  console.log("========================");
  for (const idx of alertIndexes) {
    console.log(`\n✓ ${idx.indexname}`);
    console.log(`  ${idx.indexdef}`);
  }

  // Check dismissed_opportunity_pairs indexes
  const dismissedIndexes = await sql`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'dismissed_opportunity_pairs'
    ORDER BY indexname
  `;

  console.log("\n\n📊 Dismissed Opportunity Pairs Indexes:");
  console.log("========================================");
  for (const idx of dismissedIndexes) {
    console.log(`\n✓ ${idx.indexname}`);
    console.log(`  ${idx.indexdef}`);
  }

  // Verify specific indexes required by Story 7.13
  console.log("\n\n✅ Verification Results:");
  console.log("========================");

  const requiredIndexes = [
    "alerts_user_type_idx",
    "alerts_snoozed_until_idx",
    "dismissed_pairs_user_idx",
    "dismissed_pairs_unique_idx",
  ];

  const allIndexNames = [
    ...alertIndexes.map((i) => i.indexname),
    ...dismissedIndexes.map((i) => i.indexname),
  ];

  let allFound = true;
  for (const required of requiredIndexes) {
    const found = allIndexNames.includes(required);
    console.log(`${found ? "✅" : "❌"} ${required}: ${found ? "EXISTS" : "MISSING"}`);
    if (!found) allFound = false;
  }

  await sql.end();

  if (!allFound) {
    console.error("\n❌ Some required indexes are missing!");
    process.exit(1);
  }

  console.log("\n✅ All required indexes verified successfully!");
  process.exit(0);
}

verifyIndexes().catch((error) => {
  console.error("❌ Error verifying indexes:", error);
  process.exit(1);
});
