/**
 * Database Availability Check Helper
 *
 * Story 7.16: Fix Integration Test Infrastructure
 * AC-7.16.5: Graceful handling of database unavailability
 *
 * Provides utilities for checking database availability in integration tests.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Checks if the database is available and accessible
 *
 * @returns true if database is available, false otherwise
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Gets a descriptive message for why database tests are being skipped
 *
 * @returns Message explaining how to enable database tests
 */
export function getDatabaseSkipMessage(): string {
  return `
Database connection unavailable. These tests require a local PostgreSQL database.

To enable these tests:
1. Start a PostgreSQL instance on localhost:5432
2. Set DATABASE_URL environment variable
3. Run migrations: pnpm db:migrate

See docs/testing/integration-tests.md for more details.
  `.trim();
}
