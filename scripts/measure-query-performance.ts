#!/usr/bin/env tsx
/**
 * Measure actual query performance with EXPLAIN ANALYZE
 * Story 7.13: AC-7.13.5 - Verify index usage and performance
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function measurePerformance() {
  console.log("📊 Alert Query Performance Analysis (Story 7.13)\n");
  console.log("=".repeat(80) + "\n");

  try {
    // Get a real user ID from the database
    const users = await sql`SELECT id FROM users LIMIT 1`;
    if (users.length === 0) {
      console.log("⚠️  No users in database - skipping query plan analysis");
      await sql.end();
      return;
    }
    const userId = users[0].id;
    console.log(`Using user ID: ${userId}\n`);

    // Query 1: User + Type filtering (most common pattern)
    console.log("Query 1: Filter by user_id + type (AC-7.13.1, AC-7.13.2)");
    console.log("-".repeat(80));
    const plan1 = await sql.unsafe(`
      EXPLAIN ANALYZE
      SELECT * FROM alerts
      WHERE user_id = '${userId}'
        AND type = 'opportunity'
        AND is_dismissed = false
      ORDER BY created_at DESC
      LIMIT 50;
    `);

    console.log("Expected: Index Scan using alerts_user_type_idx");
    plan1.forEach((row) => console.log(row["QUERY PLAN"]));
    console.log();

    // Query 2: Snoozed alerts filtering
    console.log("\nQuery 2: Filter snoozed alerts (AC-7.13.3)");
    console.log("-".repeat(80));
    const plan2 = await sql.unsafe(`
      EXPLAIN ANALYZE
      SELECT * FROM alerts
      WHERE user_id = '${userId}'
        AND snoozed_until IS NOT NULL
        AND snoozed_until > NOW()
      ORDER BY created_at DESC;
    `);

    console.log("Expected: Index usage for snoozed_until");
    plan2.forEach((row) => console.log(row["QUERY PLAN"]));
    console.log();

    // Query 3: User-only filtering
    console.log("\nQuery 3: Filter by user_id only (composite index prefix)");
    console.log("-".repeat(80));
    const plan3 = await sql.unsafe(`
      EXPLAIN ANALYZE
      SELECT * FROM alerts
      WHERE user_id = '${userId}'
        AND is_dismissed = false
      ORDER BY created_at DESC
      LIMIT 50;
    `);

    console.log("Expected: Index Scan using alerts_user_type_idx (prefix match)");
    plan3.forEach((row) => console.log(row["QUERY PLAN"]));
    console.log();

    // Query 4: Dismissed pairs lookup
    console.log("\nQuery 4: Dismissed opportunity pairs lookup (AC-7.13.4)");
    console.log("-".repeat(80));
    const plan4 = await sql.unsafe(`
      EXPLAIN ANALYZE
      SELECT * FROM dismissed_opportunity_pairs
      WHERE user_id = '${userId}';
    `);

    console.log("Expected: Index Scan using dismissed_pairs_user_idx");
    plan4.forEach((row) => console.log(row["QUERY PLAN"]));
    console.log();

    // Count alerts to show dataset size
    const counts = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_dismissed = false) as active,
        COUNT(*) FILTER (WHERE snoozed_until IS NOT NULL) as snoozed
      FROM alerts
      WHERE user_id = ${userId}
    `;

    console.log("\n" + "=".repeat(80));
    console.log("Dataset Statistics:");
    console.log("-".repeat(80));
    console.log(`Total alerts: ${counts[0].total}`);
    console.log(`Active alerts (is_dismissed = false): ${counts[0].active}`);
    console.log(`Snoozed alerts: ${counts[0].snoozed}`);

    console.log("\n✅ Query plan analysis complete!");
  } catch (error) {
    console.error("❌ Error measuring performance:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

measurePerformance();
