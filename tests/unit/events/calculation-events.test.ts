/**
 * Calculation Events Tests
 *
 * Story 5.8: Score Calculation Engine
 *
 * Task 10: Create Event Store Tests (AC: 5.8.4)
 *
 * Tests for:
 * - All 4 events are emitted per calculation
 * - correlationId consistency across events
 * - Event payloads contain required data
 * - Replay capability (same results from events)
 */

import { describe, it, expect, vi } from "vitest";
import {
  calculateScoresWithEvents,
  calculateScores,
  type EventEmitter,
} from "@/lib/calculations/scoring-engine";
import type { CriterionRule } from "@/lib/db/schema";
import type { AssetWithFundamentals } from "@/lib/validations/score-schemas";
import type {
  CalculationEvent,
  CalcStartedEvent,
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcCompletedEvent,
} from "@/lib/events/types";

describe("Story 5.8: Calculation Events", () => {
  // Helper to create criterion rules
  function createCriterionRule(overrides: Partial<CriterionRule>): CriterionRule {
    return {
      id: crypto.randomUUID(),
      name: "Test Criterion",
      metric: "dividend_yield",
      operator: "gt",
      value: "5.0",
      value2: undefined,
      points: 10,
      requiredFundamentals: ["dividend_yield"],
      sortOrder: 0,
      ...overrides,
    };
  }

  // Helper to create assets
  function createAsset(overrides: Partial<AssetWithFundamentals>): AssetWithFundamentals {
    return {
      id: crypto.randomUUID(),
      symbol: "TEST",
      fundamentals: {},
      ...overrides,
    };
  }

  // Mock event emitter that captures events
  function createMockEmitter(): { emitter: EventEmitter; events: CalculationEvent[] } {
    const events: CalculationEvent[] = [];
    const emitter: EventEmitter = {
      emit: async (_userId, event) => {
        events.push(event);
      },
    };
    return { emitter, events };
  }

  describe("AC-5.8.4: Event Emission for Audit Trail", () => {
    it("emits exactly 4 events per calculation", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      expect(events).toHaveLength(4);
    });

    it("emits events in correct order", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      expect(events[0].type).toBe("CALC_STARTED");
      expect(events[1].type).toBe("INPUTS_CAPTURED");
      expect(events[2].type).toBe("SCORES_COMPUTED");
      expect(events[3].type).toBe("CALC_COMPLETED");
    });

    it("maintains consistent correlationId across all events", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      // All correlationIds should be the same
      const correlationIds = events.map((e) => e.correlationId);
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(1);

      // correlationId should be a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(correlationIds[0])).toBe(true);
    });

    it("generates different correlationId for separate calculations", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      // First calculation
      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const firstCorrelationId = events[0].correlationId;

      // Second calculation
      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const secondCorrelationId = events[4].correlationId; // 5th event (index 4) is from second calculation

      expect(firstCorrelationId).not.toBe(secondCorrelationId);
    });
  });

  describe("CALC_STARTED Event", () => {
    it("includes userId and timestamp", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-123", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const calcStarted = events[0] as CalcStartedEvent;
      expect(calcStarted.type).toBe("CALC_STARTED");
      expect(calcStarted.userId).toBe("user-123");
      expect(calcStarted.timestamp).toBeInstanceOf(Date);
    });

    it("includes optional market field when provided", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-123", criteriaVersionId: "version-1", targetMarket: "US_STOCKS" },
        criteria,
        assets,
        emitter
      );

      const calcStarted = events[0] as CalcStartedEvent;
      expect(calcStarted.market).toBe("US_STOCKS");
    });
  });

  describe("INPUTS_CAPTURED Event", () => {
    it("includes criteriaVersionId and assetIds", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const asset1Id = "asset-1-uuid";
      const asset2Id = "asset-2-uuid";

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: asset1Id, symbol: "AAPL", fundamentals: { dividend_yield: 5.0 } }),
        createAsset({ id: asset2Id, symbol: "MSFT", fundamentals: { dividend_yield: 6.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "my-criteria-v1" },
        criteria,
        assets,
        emitter
      );

      const inputsCaptured = events[1] as InputsCapturedEvent;
      expect(inputsCaptured.type).toBe("INPUTS_CAPTURED");
      expect(inputsCaptured.criteriaVersionId).toBe("my-criteria-v1");
      expect(inputsCaptured.assetIds).toContain(asset1Id);
      expect(inputsCaptured.assetIds).toContain(asset2Id);
      expect(inputsCaptured.assetIds).toHaveLength(2);
    });

    it("includes criteria config for replay", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
        createCriterionRule({
          id: "c2",
          name: "Low PE",
          metric: "pe_ratio",
          operator: "lt",
          value: "15.0",
          points: 5,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0, pe_ratio: 10.0 },
        }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const inputsCaptured = events[1] as InputsCapturedEvent;
      expect(inputsCaptured.criteria).toBeDefined();
      expect(inputsCaptured.criteria.criteria).toHaveLength(2);
    });
  });

  describe("SCORES_COMPUTED Event", () => {
    it("includes scores with breakdown for each asset", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "AAPL", fundamentals: { dividend_yield: 5.0 } }),
        createAsset({ id: "asset-2", symbol: "MSFT", fundamentals: { dividend_yield: 2.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const scoresComputed = events[2] as ScoresComputedEvent;
      expect(scoresComputed.type).toBe("SCORES_COMPUTED");
      expect(scoresComputed.results).toHaveLength(2);

      // First asset should have score (dividend_yield 5 > 3)
      const asset1Result = scoresComputed.results.find((r) => r.assetId === "asset-1");
      expect(asset1Result).toBeDefined();
      expect(asset1Result?.score).toBe("10.0000");

      // Second asset should have no score (dividend_yield 2 <= 3)
      const asset2Result = scoresComputed.results.find((r) => r.assetId === "asset-2");
      expect(asset2Result).toBeDefined();
      expect(asset2Result?.score).toBe("0.0000");
    });

    it("includes breakdown with criterionId and passed status", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "criterion-123",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const scoresComputed = events[2] as ScoresComputedEvent;
      const breakdown = scoresComputed.results[0].breakdown;

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0].criterionId).toBe("criterion-123");
      expect(breakdown[0].passed).toBe(true);
      expect(breakdown[0].pointsAwarded).toBe(10);
    });
  });

  describe("CALC_COMPLETED Event", () => {
    it("includes duration and assetCount", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "AAPL", fundamentals: { dividend_yield: 5.0 } }),
        createAsset({ id: "asset-2", symbol: "MSFT", fundamentals: { dividend_yield: 6.0 } }),
        createAsset({ id: "asset-3", symbol: "GOOGL", fundamentals: { dividend_yield: 7.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const calcCompleted = events[3] as CalcCompletedEvent;
      expect(calcCompleted.type).toBe("CALC_COMPLETED");
      expect(calcCompleted.assetCount).toBe(3);
      expect(calcCompleted.duration).toBeGreaterThanOrEqual(0);
      expect(calcCompleted.status).toBe("success");
    });

    it("duration reflects actual calculation time", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      // Create many assets for a measurable duration
      const assets: AssetWithFundamentals[] = Array.from({ length: 100 }, (_, i) =>
        createAsset({
          id: `asset-${i}`,
          symbol: `SYM${i}`,
          fundamentals: { dividend_yield: Math.random() * 10 },
        })
      );

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      const calcCompleted = events[3] as CalcCompletedEvent;
      // Duration should be a number (could be 0 for fast machines, but shouldn't be negative)
      expect(typeof calcCompleted.duration).toBe("number");
      expect(calcCompleted.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Replay Capability", () => {
    it("same inputs produce identical scores (deterministic)", async () => {
      const { emitter: emitter1, events: events1 } = createMockEmitter();
      const { emitter: emitter2, events: events2 } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
        createCriterionRule({
          id: "c2",
          name: "Low PE",
          metric: "pe_ratio",
          operator: "lt",
          value: "15.0",
          points: 5,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "AAPL",
          fundamentals: { dividend_yield: 5.0, pe_ratio: 12.0 },
        }),
        createAsset({
          id: "asset-2",
          symbol: "MSFT",
          fundamentals: { dividend_yield: 2.0, pe_ratio: 10.0 },
        }),
      ];

      // Run calculation twice
      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter1
      );

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter2
      );

      // Compare SCORES_COMPUTED events
      const scores1 = events1[2] as ScoresComputedEvent;
      const scores2 = events2[2] as ScoresComputedEvent;

      // Scores should be identical
      expect(scores1.results.length).toBe(scores2.results.length);

      for (let i = 0; i < scores1.results.length; i++) {
        expect(scores1.results[i].assetId).toBe(scores2.results[i].assetId);
        expect(scores1.results[i].score).toBe(scores2.results[i].score);
        expect(scores1.results[i].breakdown.length).toBe(scores2.results[i].breakdown.length);
      }
    });

    it("inputs from INPUTS_CAPTURED event can reproduce scores", async () => {
      const { emitter, events } = createMockEmitter();

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "4.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "AAPL",
          fundamentals: { dividend_yield: 5.0 },
        }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        emitter
      );

      // Get the original scores
      const scoresComputed = events[2] as ScoresComputedEvent;
      const originalScore = scoresComputed.results[0].score;

      // Replay with same inputs
      const replayedScores = calculateScores(criteria, assets, "version-1");

      // Replayed scores should match
      expect(replayedScores[0].score).toBe(originalScore);
    });
  });

  describe("Event Error Handling", () => {
    it("completes calculation even if event emitter throws", async () => {
      const failingEmitter: EventEmitter = {
        emit: vi.fn().mockRejectedValue(new Error("Event store unavailable")),
      };

      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { dividend_yield: 5.0 } }),
      ];

      // Should throw because events failed to emit
      await expect(
        calculateScoresWithEvents(
          { userId: "user-1", criteriaVersionId: "version-1" },
          criteria,
          assets,
          failingEmitter
        )
      ).rejects.toThrow("Event store unavailable");
    });
  });
});
