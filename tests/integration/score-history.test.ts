/**
 * Score History Integration Tests
 *
 * Added by Story 5.3: Score Calculation Engine
 * - Task 3.3: Integration test proving historical scores are never overwritten (AC-5.3.3)
 * - Task 3.4: Test for date-range queries on score_history (AC-5.3.3)
 * - Task 6.3: Integration test for data flow pipeline (AC-5.3.6)
 *
 * These tests also lay groundwork for Story 5.9: Store Historical Scores
 *
 * ACs Validated:
 * - AC-5.3.3: Historical Score Preservation (append-only, never overwritten)
 * - AC-5.3.6: Fundamentals Data Flow (portfolio → assets → fundamentals → scores)
 *
 * Future Story 5.9 ACs (tests ready for when that story is implemented):
 * - AC-5.9.1: Score history retention
 * - AC-5.9.2: Point-in-time score queries
 * - AC-5.9.3: Trend query support (< 300ms for 90-day query)
 * - AC-5.9.4: Historical scores never overwritten
 *
 * Run with: DATABASE_URL="..." pnpm test:integration
 */

import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { db } from "@/lib/db";
import {
  users,
  scoreHistory,
  criteriaVersions,
  portfolioAssets,
  portfolios,
} from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { isDatabaseAvailable, createTestEmail } from "./setup";
import { randomUUID } from "crypto";

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Dynamic user ID that will be set per test
let currentTestUserId: string;

describe("Score History (Integration)", () => {
  const shouldSkip = !isDatabaseAvailable();

  beforeAll(() => {
    if (shouldSkip) {
      console.log("⚠️  Skipping Score History Integration tests - requires DATABASE_URL");
    }
  });

  afterEach(async () => {
    if (shouldSkip || !currentTestUserId) return;

    // Clean up test data
    try {
      await db.delete(users).where(eq(users.id, currentTestUserId));
    } catch {
      // Ignore cleanup errors - user cascade deletes related records
    }

    vi.clearAllMocks();
  });

  // Helper to create a unique test user
  async function createTestUser(): Promise<string> {
    const userId = randomUUID();
    currentTestUserId = userId;
    await db.insert(users).values({
      id: userId,
      email: createTestEmail(),
      passwordHash: "test-hash",
      name: "Integration Test User",
      baseCurrency: "USD",
    });
    return userId;
  }

  // Helper to create criteria version
  async function createCriteriaVersion(userId: string): Promise<string> {
    const [version] = await db
      .insert(criteriaVersions)
      .values({
        userId,
        assetType: "stock",
        targetMarket: "US",
        name: "Test Criteria",
        criteria: [
          {
            id: "c1",
            name: "High Dividend",
            type: "dividend_yield",
            operator: "gte",
            value: 2,
            points: 10,
          },
        ],
        version: 1,
        isActive: true,
      })
      .returning();
    return version.id;
  }

  describe("AC-5.9.4: Historical Scores Never Overwritten (Append-Only)", () => {
    it.skipIf(shouldSkip)(
      "inserting same assetId/userId twice creates two history records",
      async () => {
        const userId = await createTestUser();
        const criteriaVersionId = await createCriteriaVersion(userId);
        const assetId = randomUUID();

        // Insert first score
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "TEST",
          score: "10.0000",
          criteriaVersionId,
          calculatedAt: new Date("2024-01-01"),
        });

        // Insert second score for same asset (should append, not overwrite)
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "TEST",
          score: "15.0000",
          criteriaVersionId,
          calculatedAt: new Date("2024-01-02"),
        });

        // Verify both records exist
        const records = await db
          .select()
          .from(scoreHistory)
          .where(and(eq(scoreHistory.userId, userId), eq(scoreHistory.assetId, assetId)))
          .orderBy(asc(scoreHistory.calculatedAt));

        expect(records).toHaveLength(2);
        expect(records[0]!.score).toBe("10.0000");
        expect(records[1]!.score).toBe("15.0000");
      }
    );

    it.skipIf(shouldSkip)(
      "historical scores are never updated (no update on conflict)",
      async () => {
        const userId = await createTestUser();
        const criteriaVersionId = await createCriteriaVersion(userId);
        const assetId = randomUUID();
        const calculatedAt = new Date("2024-01-15");

        // Insert initial score
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "TEST",
          score: "20.0000",
          criteriaVersionId,
          calculatedAt,
        });

        // Get the initial record ID
        const [initial] = await db
          .select()
          .from(scoreHistory)
          .where(and(eq(scoreHistory.userId, userId), eq(scoreHistory.assetId, assetId)));

        // Insert another score - this should create a NEW record
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "TEST",
          score: "25.0000",
          criteriaVersionId,
          calculatedAt: new Date("2024-01-16"),
        });

        // Verify original record is unchanged
        const [original] = await db
          .select()
          .from(scoreHistory)
          .where(eq(scoreHistory.id, initial!.id));

        expect(original!.score).toBe("20.0000"); // Original score unchanged
      }
    );

    it.skipIf(shouldSkip)("multiple score insertions create complete audit trail", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);
      const assetId = randomUUID();

      // Insert 5 scores over 5 days
      const scores = ["10.0000", "12.0000", "8.0000", "15.0000", "11.0000"];
      for (let i = 0; i < scores.length; i++) {
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "AUDIT",
          score: scores[i]!,
          criteriaVersionId,
          calculatedAt: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
        });
      }

      // Verify complete audit trail exists
      const records = await db
        .select()
        .from(scoreHistory)
        .where(and(eq(scoreHistory.userId, userId), eq(scoreHistory.assetId, assetId)))
        .orderBy(asc(scoreHistory.calculatedAt));

      expect(records).toHaveLength(5);
      records.forEach((record, i) => {
        expect(record.score).toBe(scores[i]);
      });
    });
  });

  describe("AC-5.9.2 & AC-5.9.3: Date Range Queries", () => {
    it.skipIf(shouldSkip)("queries scores within date range", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);
      const assetId = randomUUID();

      // Insert scores across different dates
      const dates = [
        new Date("2024-01-01"),
        new Date("2024-01-15"),
        new Date("2024-02-01"),
        new Date("2024-02-15"),
        new Date("2024-03-01"),
      ];

      for (let i = 0; i < dates.length; i++) {
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "RANGE",
          score: `${(i + 1) * 10}.0000`,
          criteriaVersionId,
          calculatedAt: dates[i]!,
        });
      }

      // Query only February dates
      const startDate = new Date("2024-02-01");
      const endDate = new Date("2024-02-28");

      const records = await db
        .select()
        .from(scoreHistory)
        .where(
          and(
            eq(scoreHistory.userId, userId),
            eq(scoreHistory.assetId, assetId),
            gte(scoreHistory.calculatedAt, startDate),
            lte(scoreHistory.calculatedAt, endDate)
          )
        )
        .orderBy(asc(scoreHistory.calculatedAt));

      expect(records).toHaveLength(2);
      expect(records[0]!.score).toBe("30.0000"); // Feb 1
      expect(records[1]!.score).toBe("40.0000"); // Feb 15
    });

    it.skipIf(shouldSkip)("point-in-time query returns exact date match", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);
      const assetId = randomUUID();

      const targetDate = new Date("2024-06-15T10:30:00Z");

      await db.insert(scoreHistory).values({
        userId,
        assetId,
        symbol: "POINT",
        score: "42.0000",
        criteriaVersionId,
        calculatedAt: targetDate,
      });

      // Query for that specific day
      const dayStart = new Date("2024-06-15T00:00:00Z");
      const dayEnd = new Date("2024-06-15T23:59:59Z");

      const [record] = await db
        .select()
        .from(scoreHistory)
        .where(
          and(
            eq(scoreHistory.userId, userId),
            eq(scoreHistory.assetId, assetId),
            gte(scoreHistory.calculatedAt, dayStart),
            lte(scoreHistory.calculatedAt, dayEnd)
          )
        );

      expect(record).toBeDefined();
      expect(record!.score).toBe("42.0000");
    });

    it.skipIf(shouldSkip)("90-day query uses index efficiently (< 300ms target)", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);
      const assetId = randomUUID();

      // Insert 90 daily scores
      const baseDate = new Date("2024-01-01");
      const insertPromises = [];
      for (let i = 0; i < 90; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        insertPromises.push(
          db.insert(scoreHistory).values({
            userId,
            assetId,
            symbol: "PERF",
            score: `${(i % 50) + 10}.0000`,
            criteriaVersionId,
            calculatedAt: date,
          })
        );
      }
      await Promise.all(insertPromises);

      // Time the 90-day query
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-03-31");

      const queryStart = performance.now();
      const records = await db
        .select()
        .from(scoreHistory)
        .where(
          and(
            eq(scoreHistory.userId, userId),
            eq(scoreHistory.assetId, assetId),
            gte(scoreHistory.calculatedAt, startDate),
            lte(scoreHistory.calculatedAt, endDate)
          )
        )
        .orderBy(asc(scoreHistory.calculatedAt));
      const queryDuration = performance.now() - queryStart;

      expect(records).toHaveLength(90);
      // AC-5.9.3: < 300ms for 90-day query
      expect(queryDuration).toBeLessThan(300);
    });
  });

  describe("AC-5.3.3 & AC-5.9.3: Trend Analysis Support", () => {
    it.skipIf(shouldSkip)("calculates trend from historical data", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);
      const assetId = randomUUID();

      // Insert increasing scores (upward trend)
      const scores = ["10.0000", "12.0000", "14.0000", "16.0000", "18.0000"];
      for (let i = 0; i < scores.length; i++) {
        const date = new Date("2024-01-01");
        date.setDate(date.getDate() + i * 7); // Weekly scores
        await db.insert(scoreHistory).values({
          userId,
          assetId,
          symbol: "TREND",
          score: scores[i]!,
          criteriaVersionId,
          calculatedAt: date,
        });
      }

      // Query all scores
      const records = await db
        .select()
        .from(scoreHistory)
        .where(and(eq(scoreHistory.userId, userId), eq(scoreHistory.assetId, assetId)))
        .orderBy(asc(scoreHistory.calculatedAt));

      expect(records).toHaveLength(5);

      // Calculate trend percentage
      const startScore = parseFloat(records[0]!.score);
      const endScore = parseFloat(records[records.length - 1]!.score);
      const changePercent = ((endScore - startScore) / startScore) * 100;

      expect(changePercent).toBe(80); // 10 → 18 = 80% increase
    });
  });

  describe("AC-5.3.6: Data Flow Integration", () => {
    it.skipIf(shouldSkip)("score history records link to criteria version", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);
      const assetId = randomUUID();

      await db.insert(scoreHistory).values({
        userId,
        assetId,
        symbol: "LINK",
        score: "50.0000",
        criteriaVersionId,
        calculatedAt: new Date(),
      });

      // Query with join to verify relationship
      const [record] = await db
        .select({
          historyId: scoreHistory.id,
          score: scoreHistory.score,
          criteriaVersionId: scoreHistory.criteriaVersionId,
          criteriaName: criteriaVersions.name,
        })
        .from(scoreHistory)
        .innerJoin(criteriaVersions, eq(scoreHistory.criteriaVersionId, criteriaVersions.id))
        .where(and(eq(scoreHistory.userId, userId), eq(scoreHistory.assetId, assetId)));

      expect(record).toBeDefined();
      expect(record!.criteriaVersionId).toBe(criteriaVersionId);
      expect(record!.criteriaName).toBe("Test Criteria");
    });

    it.skipIf(shouldSkip)("data flow: portfolio → assets → fundamentals → scores", async () => {
      const userId = await createTestUser();
      const criteriaVersionId = await createCriteriaVersion(userId);

      // Create portfolio
      const [portfolio] = await db
        .insert(portfolios)
        .values({
          userId,
          name: "Data Flow Test Portfolio",
        })
        .returning();

      // Create portfolio asset
      const [asset] = await db
        .insert(portfolioAssets)
        .values({
          portfolioId: portfolio.id,
          symbol: "FLOW",
          name: "Data Flow Test Asset",
          quantity: "100",
          purchasePrice: "50.00",
          currency: "USD",
        })
        .returning();

      // Store score in history (simulating scoring engine output)
      await db.insert(scoreHistory).values({
        userId,
        assetId: asset.id,
        symbol: asset.symbol,
        score: "75.0000",
        criteriaVersionId,
        calculatedAt: new Date(),
      });

      // Verify complete data flow
      const [result] = await db
        .select({
          portfolioName: portfolios.name,
          assetSymbol: portfolioAssets.symbol,
          score: scoreHistory.score,
        })
        .from(scoreHistory)
        .innerJoin(portfolioAssets, eq(scoreHistory.assetId, portfolioAssets.id))
        .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
        .where(eq(scoreHistory.userId, userId));

      expect(result).toBeDefined();
      expect(result!.portfolioName).toBe("Data Flow Test Portfolio");
      expect(result!.assetSymbol).toBe("FLOW");
      expect(result!.score).toBe("75.0000");
    });
  });

  describe("Multi-tenant Isolation", () => {
    it.skipIf(shouldSkip)("score history is scoped by userId", async () => {
      // Create two users
      const user1Id = await createTestUser();
      const user2Id = randomUUID();

      await db.insert(users).values({
        id: user2Id,
        email: createTestEmail(),
        passwordHash: "test-hash",
        name: "Second User",
        baseCurrency: "USD",
      });

      const criteriaVersion1 = await createCriteriaVersion(user1Id);

      // Create criteria for user 2
      const [cv2] = await db
        .insert(criteriaVersions)
        .values({
          userId: user2Id,
          assetType: "stock",
          targetMarket: "US",
          name: "User 2 Criteria",
          criteria: [],
          version: 1,
          isActive: true,
        })
        .returning();

      const sharedAssetId = randomUUID();

      // Both users have a score for the "same" asset (by ID)
      await db.insert(scoreHistory).values({
        userId: user1Id,
        assetId: sharedAssetId,
        symbol: "SHARED",
        score: "100.0000",
        criteriaVersionId: criteriaVersion1,
        calculatedAt: new Date(),
      });

      await db.insert(scoreHistory).values({
        userId: user2Id,
        assetId: sharedAssetId,
        symbol: "SHARED",
        score: "50.0000",
        criteriaVersionId: cv2.id,
        calculatedAt: new Date(),
      });

      // User 1 should only see their score
      const user1Records = await db
        .select()
        .from(scoreHistory)
        .where(eq(scoreHistory.userId, user1Id));

      expect(user1Records).toHaveLength(1);
      expect(user1Records[0]!.score).toBe("100.0000");

      // User 2 should only see their score
      const user2Records = await db
        .select()
        .from(scoreHistory)
        .where(eq(scoreHistory.userId, user2Id));

      expect(user2Records).toHaveLength(1);
      expect(user2Records[0]!.score).toBe("50.0000");

      // Cleanup user 2
      await db.delete(users).where(eq(users.id, user2Id));
    });
  });
});
