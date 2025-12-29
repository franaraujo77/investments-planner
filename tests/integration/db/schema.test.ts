/**
 * Database Schema Integration Tests
 *
 * Story 1.2 AC: 1, 2, 4, 5
 * Story 1.7: Enable All Skipped Tests
 *
 * These tests verify database behavior that cannot be mocked effectively:
 * - Migration success
 * - Foreign key cascade behavior
 * - Referential integrity
 * - Index existence
 *
 * Run with: DATABASE_URL="..." pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { users, refreshTokens, calculationEvents } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { isDatabaseAvailable, createTestEmail } from "../setup";
import { randomUUID } from "crypto";

describe("Database Integration Tests", () => {
  const shouldSkip = !isDatabaseAvailable();
  // Track test users for cleanup
  const testUserIds: string[] = [];

  beforeAll(() => {
    if (shouldSkip) {
      console.log("⚠️  Skipping Database Integration tests - requires DATABASE_URL");
    }
  });

  afterEach(async () => {
    if (shouldSkip) return;

    // Clean up all test users
    for (const userId of testUserIds) {
      try {
        await db.delete(users).where(eq(users.id, userId));
      } catch {
        // Ignore cleanup errors
      }
    }
    testUserIds.length = 0;
  });

  afterAll(async () => {
    if (shouldSkip) return;

    // Final cleanup
    for (const userId of testUserIds) {
      try {
        await db.delete(users).where(eq(users.id, userId));
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Helper to create a unique test user
  async function createTestUser(): Promise<string> {
    const userId = randomUUID();
    testUserIds.push(userId);
    await db.insert(users).values({
      id: userId,
      email: createTestEmail(),
      passwordHash: "test-hash",
      name: "Integration Test User",
      baseCurrency: "USD",
    });
    return userId;
  }

  describe("Migration Success (AC: 1)", () => {
    it.skipIf(shouldSkip)("should have all expected tables", async () => {
      // Query information_schema to verify tables exist
      const result = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      // db.execute returns an array directly for postgres driver
      const rows = Array.isArray(result) ? result : [];
      const tableNames = rows.map((row: { table_name: string }) => row.table_name);

      // Verify core tables exist
      expect(tableNames).toContain("users");
      expect(tableNames).toContain("refresh_tokens");
      expect(tableNames).toContain("calculation_events");
      expect(tableNames).toContain("portfolios");
      expect(tableNames).toContain("portfolio_assets");
      expect(tableNames).toContain("criteria_versions");
      expect(tableNames).toContain("asset_scores");
    });
  });

  describe("Foreign Key Cascade (AC: 5)", () => {
    it.skipIf(shouldSkip)("should cascade delete refresh_tokens when user is deleted", async () => {
      const userId = await createTestUser();

      // Create a refresh token for the user
      await db.insert(refreshTokens).values({
        userId,
        tokenHash: "test-token-hash-" + Date.now(),
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      });

      // Verify token exists
      const tokensBefore = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, userId));
      expect(tokensBefore).toHaveLength(1);

      // Delete the user (removes from testUserIds since we're deleting manually)
      testUserIds.splice(testUserIds.indexOf(userId), 1);
      await db.delete(users).where(eq(users.id, userId));

      // Verify token is also deleted (cascade)
      const tokensAfter = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, userId));
      expect(tokensAfter).toHaveLength(0);
    });
  });

  describe("Referential Integrity (AC: 5)", () => {
    it.skipIf(shouldSkip)(
      "should prevent creating calculation_events without valid user",
      async () => {
        // Attempt to create a calculation event with non-existent user
        const fakeUserId = randomUUID();

        await expect(
          db.insert(calculationEvents).values({
            correlationId: randomUUID(),
            userId: fakeUserId,
            eventType: "CALC_STARTED",
            payload: { type: "CALC_STARTED", timestamp: new Date().toISOString() },
          })
        ).rejects.toThrow();
      }
    );

    it.skipIf(shouldSkip)("should allow creating calculation_events with valid user", async () => {
      const userId = await createTestUser();

      // Create a calculation event for the user
      const [event] = await db
        .insert(calculationEvents)
        .values({
          correlationId: randomUUID(),
          userId,
          eventType: "CALC_STARTED",
          payload: { type: "CALC_STARTED", timestamp: new Date().toISOString() },
        })
        .returning();

      expect(event).toBeDefined();
      expect(event.userId).toBe(userId);
      expect(event.eventType).toBe("CALC_STARTED");
    });
  });

  describe("Indexes (Performance)", () => {
    it.skipIf(shouldSkip)("should have indexes on correlation_id and user_id", async () => {
      // Query pg_indexes to verify indexes exist
      const result = await db.execute(sql`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND (indexname LIKE '%correlation_id%' OR indexname LIKE '%user_id%')
        ORDER BY tablename, indexname
      `);

      // db.execute returns an array directly for postgres driver
      const rows = Array.isArray(result) ? result : [];
      const indexNames = rows.map((row: { indexname: string }) => row.indexname);

      // Verify critical indexes exist
      expect(indexNames.some((name: string) => name.includes("correlation_id"))).toBe(true);
      expect(indexNames.some((name: string) => name.includes("user_id"))).toBe(true);
    });
  });

  describe("Numeric Precision (AC: 2)", () => {
    it.skipIf(shouldSkip)("should use numeric type for monetary fields", async () => {
      // Query information_schema for column types
      const result = await db.execute(sql`
        SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name IN ('purchase_price', 'quantity', 'total_amount', 'recommended_amount')
        ORDER BY table_name, column_name
      `);

      // db.execute returns an array directly for postgres driver
      const rows = Array.isArray(result) ? result : [];

      // Verify monetary fields use numeric with appropriate precision
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row: { data_type: string; numeric_precision: number }) => {
        expect(row.data_type).toBe("numeric");
        // Precision should be at least 7 for monetary amounts
        expect(Number(row.numeric_precision)).toBeGreaterThanOrEqual(7);
      });
    });
  });
});
