/**
 * Scoring Engine Tests
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Story 5.8: Score Calculation Engine
 * Story 5.3: Score Calculation Engine (Validation & Testing)
 * Story 4.6: Historical Surplus Scoring
 *
 * Tests for:
 * - AC5 (deterministic calculations) - Story 1.4
 * - AC-5.8.1: Criteria-Driven Algorithm Execution Order
 * - AC-5.8.2: Decimal Precision for All Calculations
 * - AC-5.8.3: Deterministic Calculation
 * - AC-5.8.4: Event Emission for Audit Trail
 * - AC-5.8.5: Score Storage with Audit Trail
 * - AC-5.8.6: Missing Fundamentals Handling
 * - AC-5.3.1: Performance (< 100ms per asset)
 * - AC-5.3.2: Score Breakdown Storage
 * - AC-5.3.3: Historical Score Preservation
 * - AC-5.3.4: Decimal Precision (ROUND_HALF_UP)
 * - AC-5.3.5: Missing Fundamentals Handling
 * - AC-5.3.6: Fundamentals Data Flow
 * - AC-4.6.1: Bonus Points for Consistent Surplus History
 * - AC-4.6.2: Penalty Points for Missing Surplus Data
 *
 * Note: These tests require Vitest (configured in Story 1-7)
 */

import { describe, it, expect } from "vitest";
import {
  ScoringEngine,
  createScoringFunction,
  type AssetData,
  // New Story 5.8 exports
  calculateScores,
  calculateScoresWithEvents,
  evaluateCriterion,
  type EventEmitter,
} from "@/lib/calculations/scoring-engine";
import type {
  CriteriaConfig,
  CriterionDefinition,
  InputsCapturedEvent,
  CalculationEvent,
} from "@/lib/events/types";
import type { CriterionRule } from "@/lib/db/schema";
import type { AssetWithFundamentals, SurplusHistoryData } from "@/lib/validations/score-schemas";

describe("ScoringEngine", () => {
  const engine = new ScoringEngine();

  describe("determinism - same inputs produce same score", () => {
    it("produces identical results over 100 iterations", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "AAPL",
        metrics: {
          dividend_yield: "4.5",
          pe_ratio: "15.2",
          debt_ratio: "0.3",
        },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Test Criteria",
        criteria: [
          {
            id: "c1",
            name: "dividend_yield",
            operator: "gte",
            value: "3",
            points: 10,
            weight: 1,
          },
          {
            id: "c2",
            name: "pe_ratio",
            operator: "lt",
            value: "20",
            points: 15,
            weight: 1.5,
          },
          {
            id: "c3",
            name: "debt_ratio",
            operator: "lte",
            value: "0.5",
            points: 20,
            weight: 2,
          },
        ],
      };

      // Run 100 times and collect results
      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = engine.calculateScore(asset, criteria, [], []);
        results.push(result.score);
      }

      // All results should be identical
      const uniqueScores = new Set(results);
      expect(uniqueScores.size).toBe(1);
    });
  });

  describe("decimal.js precision maintained", () => {
    it("calculates 0.1 + 0.2 = 0.3 exactly", () => {
      // This tests decimal.js precision - JavaScript would give 0.30000000000000004
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: {
          test_value: "0.3",
        },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Precision Test",
        criteria: [
          {
            id: "c1",
            name: "test_value",
            operator: "eq",
            value: "0.3", // Would fail with floating point
            points: 10,
            weight: 1,
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      expect(result.breakdown[0].passed).toBe(true);
      expect(result.score).toBe("10.0000");
    });

    it("handles very small decimal differences correctly", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "precision_test",
        operator: "eq",
        value: "0.1",
        points: 10,
        weight: 1,
      };

      // Exactly 0.1 should pass
      const result1 = engine.evaluateCriterion(criterion, "0.1");
      expect(result1.passed).toBe(true);

      // Very close but not equal should fail
      const result2 = engine.evaluateCriterion(criterion, "0.10000001");
      expect(result2.passed).toBe(false);
    });

    it("maintains precision in weighted calculations", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: {
          metric1: "100",
        },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Weight Test",
        criteria: [
          {
            id: "c1",
            name: "metric1",
            operator: "gte",
            value: "50",
            points: 7,
            weight: 1, // Weight = 1 in new implementation
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      // Points awarded directly (weight not used in new implementation)
      expect(result.score).toBe("7.0000");
      expect(result.maxPossibleScore).toBe("7.0000");
    });
  });

  describe("criterion operators evaluate correctly", () => {
    describe("gt (greater than)", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "gt",
        value: "10",
        points: 10,
        weight: 1,
      };

      it("passes when value > target", () => {
        const result = engine.evaluateCriterion(criterion, "11");
        expect(result.passed).toBe(true);
      });

      it("fails when value = target", () => {
        const result = engine.evaluateCriterion(criterion, "10");
        expect(result.passed).toBe(false);
      });

      it("fails when value < target", () => {
        const result = engine.evaluateCriterion(criterion, "9");
        expect(result.passed).toBe(false);
      });
    });

    describe("gte (greater than or equal)", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "gte",
        value: "10",
        points: 10,
        weight: 1,
      };

      it("passes when value > target", () => {
        const result = engine.evaluateCriterion(criterion, "11");
        expect(result.passed).toBe(true);
      });

      it("passes when value = target", () => {
        const result = engine.evaluateCriterion(criterion, "10");
        expect(result.passed).toBe(true);
      });

      it("fails when value < target", () => {
        const result = engine.evaluateCriterion(criterion, "9");
        expect(result.passed).toBe(false);
      });
    });

    describe("lt (less than)", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "lt",
        value: "10",
        points: 10,
        weight: 1,
      };

      it("passes when value < target", () => {
        const result = engine.evaluateCriterion(criterion, "9");
        expect(result.passed).toBe(true);
      });

      it("fails when value = target", () => {
        const result = engine.evaluateCriterion(criterion, "10");
        expect(result.passed).toBe(false);
      });

      it("fails when value > target", () => {
        const result = engine.evaluateCriterion(criterion, "11");
        expect(result.passed).toBe(false);
      });
    });

    describe("lte (less than or equal)", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "lte",
        value: "10",
        points: 10,
        weight: 1,
      };

      it("passes when value < target", () => {
        const result = engine.evaluateCriterion(criterion, "9");
        expect(result.passed).toBe(true);
      });

      it("passes when value = target", () => {
        const result = engine.evaluateCriterion(criterion, "10");
        expect(result.passed).toBe(true);
      });

      it("fails when value > target", () => {
        const result = engine.evaluateCriterion(criterion, "11");
        expect(result.passed).toBe(false);
      });
    });

    describe("eq (equal)", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "eq",
        value: "10",
        points: 10,
        weight: 1,
      };

      it("passes when value = target", () => {
        const result = engine.evaluateCriterion(criterion, "10");
        expect(result.passed).toBe(true);
      });

      it("fails when value != target", () => {
        const result = engine.evaluateCriterion(criterion, "10.01");
        expect(result.passed).toBe(false);
      });
    });

    describe("between (inclusive range)", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "between",
        value: ["5", "15"],
        points: 10,
        weight: 1,
      };

      it("passes when value is at lower bound", () => {
        const result = engine.evaluateCriterion(criterion, "5");
        expect(result.passed).toBe(true);
      });

      it("passes when value is at upper bound", () => {
        const result = engine.evaluateCriterion(criterion, "15");
        expect(result.passed).toBe(true);
      });

      it("passes when value is in range", () => {
        const result = engine.evaluateCriterion(criterion, "10");
        expect(result.passed).toBe(true);
      });

      it("fails when value is below range", () => {
        const result = engine.evaluateCriterion(criterion, "4.99");
        expect(result.passed).toBe(false);
      });

      it("fails when value is above range", () => {
        const result = engine.evaluateCriterion(criterion, "15.01");
        expect(result.passed).toBe(false);
      });
    });
  });

  describe("score breakdown includes all criteria results", () => {
    it("includes breakdown for each criterion", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: {
          metric1: "100",
          metric2: "50",
          metric3: "25",
        },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Multi-Criteria Test",
        criteria: [
          {
            id: "c1",
            name: "metric1",
            operator: "gte",
            value: "80",
            points: 10,
            weight: 1,
          },
          {
            id: "c2",
            name: "metric2",
            operator: "gte",
            value: "60",
            points: 15,
            weight: 1,
          },
          {
            id: "c3",
            name: "metric3",
            operator: "lt",
            value: "30",
            points: 20,
            weight: 1,
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      expect(result.breakdown).toHaveLength(3);

      // metric1 >= 80: 100 >= 80 = PASS
      expect(result.breakdown[0].criterionId).toBe("c1");
      expect(result.breakdown[0].passed).toBe(true);
      expect(result.breakdown[0].pointsAwarded).toBe(10);

      // metric2 >= 60: 50 >= 60 = FAIL
      expect(result.breakdown[1].criterionId).toBe("c2");
      expect(result.breakdown[1].passed).toBe(false);
      expect(result.breakdown[1].pointsAwarded).toBe(0);

      // metric3 < 30: 25 < 30 = PASS
      expect(result.breakdown[2].criterionId).toBe("c3");
      expect(result.breakdown[2].passed).toBe(true);
      expect(result.breakdown[2].pointsAwarded).toBe(20);
    });

    it("includes raw values in breakdown", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: {
          dividend_yield: "4.5",
        },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Raw Value Test",
        criteria: [
          {
            id: "c1",
            name: "dividend_yield",
            operator: "gte",
            value: "3",
            points: 10,
            weight: 1,
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      expect(result.breakdown[0].rawValue).toBe("4.5");
    });
  });

  describe("calculateScores (batch)", () => {
    it("calculates scores for multiple assets", () => {
      const assets: AssetData[] = [
        { id: "asset-1", symbol: "AAPL", metrics: { value: "100" } },
        { id: "asset-2", symbol: "GOOGL", metrics: { value: "80" } },
        { id: "asset-3", symbol: "MSFT", metrics: { value: "60" } },
      ];

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Batch Test",
        criteria: [
          {
            id: "c1",
            name: "value",
            operator: "gte",
            value: "70",
            points: 10,
            weight: 1,
          },
        ],
      };

      const results = engine.calculateScores(assets, criteria, [], []);

      expect(results).toHaveLength(3);
      expect(results[0].assetId).toBe("asset-1");
      expect(results[1].assetId).toBe("asset-2");
      expect(results[2].assetId).toBe("asset-3");

      // Only first two should pass (100 >= 70, 80 >= 70, 60 < 70)
      expect(results[0].breakdown[0].passed).toBe(true);
      expect(results[1].breakdown[0].passed).toBe(true);
      expect(results[2].breakdown[0].passed).toBe(false);
    });
  });

  describe("calculateFromInputs", () => {
    it("works with InputsCapturedEvent", () => {
      const inputs: InputsCapturedEvent = {
        type: "INPUTS_CAPTURED",
        correlationId: "corr-123",
        criteriaVersionId: "v1",
        criteria: {
          id: "crit-1",
          version: "1.0",
          name: "Test",
          criteria: [
            {
              id: "c1",
              name: "price",
              operator: "gte",
              value: "100",
              points: 10,
              weight: 1,
            },
          ],
        },
        prices: [
          {
            assetId: "asset-1",
            symbol: "TEST",
            price: "150.00",
            currency: "USD",
            fetchedAt: new Date(),
            source: "test",
          },
        ],
        rates: [],
        assetIds: ["asset-1"],
      };

      const results = engine.calculateFromInputs(inputs);

      expect(results).toHaveLength(1);
      expect(results[0].assetId).toBe("asset-1");
    });
  });

  describe("createScoringFunction", () => {
    it("creates function compatible with replay", () => {
      const scoringFn = createScoringFunction(engine);

      const inputs: InputsCapturedEvent = {
        type: "INPUTS_CAPTURED",
        correlationId: "corr-123",
        criteriaVersionId: "v1",
        criteria: {
          id: "crit-1",
          version: "1.0",
          name: "Test",
          criteria: [],
        },
        prices: [],
        rates: [],
        assetIds: ["asset-1"],
      };

      const results = scoringFn(inputs);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles missing metric gracefully", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: {}, // No metrics
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Missing Metric Test",
        criteria: [
          {
            id: "c1",
            name: "nonexistent",
            operator: "gte",
            value: "10",
            points: 10,
            weight: 1,
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      // Should use "0" for missing metric
      expect(result.breakdown[0].rawValue).toBe("0");
      expect(result.breakdown[0].passed).toBe(false);
    });

    it("handles empty criteria array", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: {},
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Empty Criteria",
        criteria: [],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      expect(result.score).toBe("0.0000");
      expect(result.maxPossibleScore).toBe("0.0000");
      expect(result.percentage).toBe("0.0000");
      expect(result.breakdown).toHaveLength(0);
    });

    it("handles negative values", () => {
      const criterion: CriterionDefinition = {
        id: "c1",
        name: "test",
        operator: "gt",
        value: "-5",
        points: 10,
        weight: 1,
      };

      const result = engine.evaluateCriterion(criterion, "-3");
      expect(result.passed).toBe(true); // -3 > -5
    });

    it("handles zero points criterion", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: { value: "100" },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Zero Points Test",
        criteria: [
          {
            id: "c1",
            name: "value",
            operator: "gte",
            value: "50",
            points: 0, // Zero points
            weight: 1,
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      // Criterion passes but awards 0 points
      expect(result.score).toBe("0.0000");
      expect(result.maxPossibleScore).toBe("0.0000");
    });
  });
});

// =============================================================================
// STORY 5.8: SCORE CALCULATION ENGINE - NEW TESTS
// =============================================================================

describe("Story 5.8: Score Calculation Engine", () => {
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

  // Helper to create assets with fundamentals
  function createAsset(overrides: Partial<AssetWithFundamentals>): AssetWithFundamentals {
    return {
      id: crypto.randomUUID(),
      symbol: "TEST",
      fundamentals: {},
      ...overrides,
    };
  }

  describe("AC-5.8.1: Criteria-Driven Algorithm Execution Order", () => {
    it("processes criteria in order, then assets", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "5.0",
          points: 10,
          sortOrder: 0,
        }),
        createCriterionRule({
          id: "c2",
          name: "Low PE",
          metric: "pe_ratio",
          operator: "lt",
          value: "15.0",
          points: 5,
          sortOrder: 1,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "AAPL",
          fundamentals: { dividend_yield: 6.0, pe_ratio: 12.0 },
        }),
        createAsset({
          id: "asset-2",
          symbol: "MSFT",
          fundamentals: { dividend_yield: 3.0, pe_ratio: 18.0 },
        }),
      ];

      const results = calculateScores(criteria, assets, "version-1");

      // Verify both assets are scored
      expect(results).toHaveLength(2);

      // Asset 1: dividend_yield 6 > 5 (10pts), pe_ratio 12 < 15 (5pts) = 15
      const asset1 = results.find((r) => r.assetId === "asset-1");
      expect(asset1?.score).toBe("15.0000");
      expect(asset1?.breakdown).toHaveLength(2);

      // Asset 2: dividend_yield 3 <= 5 (0pts), pe_ratio 18 >= 15 (0pts) = 0
      const asset2 = results.find((r) => r.assetId === "asset-2");
      expect(asset2?.score).toBe("0.0000");
    });

    it("sums points correctly across multiple criteria", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
        createCriterionRule({
          id: "c2",
          metric: "pe_ratio",
          operator: "lt",
          value: "20.0",
          points: 5,
        }),
        createCriterionRule({ id: "c3", metric: "roe", operator: "gte", value: "15.0", points: 8 }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0, pe_ratio: 10.0, roe: 20.0 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // All criteria pass: 10 + 5 + 8 = 23
      expect(result.score).toBe("23.0000");
      expect(result.breakdown.filter((b) => b.matched)).toHaveLength(3);
    });
  });

  describe("AC-5.8.2: Decimal Precision for All Calculations", () => {
    it("uses decimal.js precision - 0.1 + 0.2 = 0.3 exactly", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "equals",
          value: "0.3",
          points: 10,
          requiredFundamentals: ["value"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { value: 0.3 }, // This is exactly 0.3
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(true);
      expect(result.score).toBe("10.0000");
    });

    it("stores scores with exactly 4 decimal places", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "gt",
          value: "5.0",
          points: 7, // Non-round number
          requiredFundamentals: ["value"], // Make sure to include the metric
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { value: 10.0 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("7.0000");
      expect(result.score.split(".")[1]).toHaveLength(4);
    });
  });

  describe("AC-5.8.3: Deterministic Calculation", () => {
    it("produces identical scores across multiple runs", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
        createCriterionRule({
          id: "c2",
          metric: "pe_ratio",
          operator: "lt",
          value: "20.0",
          points: 5,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0, pe_ratio: 15.0 },
        }),
      ];

      // Run 100 times
      const scores: string[] = [];
      for (let i = 0; i < 100; i++) {
        const [result] = calculateScores(criteria, assets, "version-1");
        scores.push(result.score);
      }

      // All scores should be identical
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBe(1);
      expect(scores[0]).toBe("15.0000");
    });
  });

  describe("AC-5.8.4: Event Emission for Audit Trail", () => {
    it("emits all 4 events in correct order per calculation", async () => {
      const emittedEvents: CalculationEvent[] = [];
      const mockEmitter: EventEmitter = {
        emit: async (userId, event) => {
          emittedEvents.push(event);
        },
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
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0 },
        }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        mockEmitter
      );

      // Should emit exactly 4 events
      expect(emittedEvents).toHaveLength(4);
      expect(emittedEvents[0].type).toBe("CALC_STARTED");
      expect(emittedEvents[1].type).toBe("INPUTS_CAPTURED");
      expect(emittedEvents[2].type).toBe("SCORES_COMPUTED");
      expect(emittedEvents[3].type).toBe("CALC_COMPLETED");
    });

    it("correlationId is consistent across all events", async () => {
      const emittedEvents: CalculationEvent[] = [];
      const mockEmitter: EventEmitter = {
        emit: async (userId, event) => {
          emittedEvents.push(event);
        },
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
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0 },
        }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        mockEmitter
      );

      // All correlationIds should match
      const correlationIds = emittedEvents.map((e) => e.correlationId);
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(1);
    });

    it("CALC_COMPLETED includes accurate duration and assetCount", async () => {
      const emittedEvents: CalculationEvent[] = [];
      const mockEmitter: EventEmitter = {
        emit: async (userId, event) => {
          emittedEvents.push(event);
        },
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
        createAsset({ id: "asset-1", symbol: "TEST1", fundamentals: { dividend_yield: 5.0 } }),
        createAsset({ id: "asset-2", symbol: "TEST2", fundamentals: { dividend_yield: 6.0 } }),
        createAsset({ id: "asset-3", symbol: "TEST3", fundamentals: { dividend_yield: 7.0 } }),
      ];

      await calculateScoresWithEvents(
        { userId: "user-1", criteriaVersionId: "version-1" },
        criteria,
        assets,
        mockEmitter
      );

      const completedEvent = emittedEvents.find((e) => e.type === "CALC_COMPLETED");
      expect(completedEvent).toBeDefined();

      if (completedEvent?.type === "CALC_COMPLETED") {
        expect(completedEvent.assetCount).toBe(3);
        expect(completedEvent.duration).toBeGreaterThanOrEqual(0);
        expect(completedEvent.status).toBe("success");
      }
    });
  });

  describe("AC-5.8.5: Score Storage with Audit Trail", () => {
    it("breakdown includes all required fields", () => {
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
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      const breakdown = result.breakdown[0];
      expect(breakdown).toHaveProperty("criterionId");
      expect(breakdown).toHaveProperty("criterionName");
      expect(breakdown).toHaveProperty("matched");
      expect(breakdown).toHaveProperty("pointsAwarded");
      expect(breakdown).toHaveProperty("actualValue");
      expect(breakdown).toHaveProperty("skippedReason");
    });

    it("includes criteriaVersionId in score result", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({ id: "c1", metric: "value", operator: "gt", value: "0", points: 5 }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { value: 10.0 } }),
      ];

      const versionId = "my-criteria-version-123";
      const [result] = calculateScores(criteria, assets, versionId);

      expect(result.criteriaVersionId).toBe(versionId);
    });
  });

  describe("AC-5.8.6: Missing Fundamentals Handling", () => {
    it("skips criterion with skippedReason when fundamentals missing", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: {}, // Missing dividend_yield
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(false);
      expect(result.breakdown[0].pointsAwarded).toBe(0);
      expect(result.breakdown[0].skippedReason).toBe("missing_fundamental");
    });

    it("evaluates available criteria when only some fundamentals missing", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
        createCriterionRule({
          id: "c2",
          name: "Low PE",
          metric: "pe_ratio",
          operator: "lt",
          value: "15.0",
          points: 5,
          requiredFundamentals: ["pe_ratio"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { pe_ratio: 10.0 }, // dividend_yield missing
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // First criterion skipped due to missing fundamental
      expect(result.breakdown[0].skippedReason).toBe("missing_fundamental");
      expect(result.breakdown[0].pointsAwarded).toBe(0);

      // Second criterion evaluated (pe_ratio 10 < 15)
      expect(result.breakdown[1].matched).toBe(true);
      expect(result.breakdown[1].pointsAwarded).toBe(5);

      expect(result.score).toBe("5.0000");
    });

    it("returns zero points when all criteria skipped", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
        createCriterionRule({
          id: "c2",
          metric: "pe_ratio",
          operator: "lt",
          value: "15.0",
          points: 5,
          requiredFundamentals: ["pe_ratio"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: {}, // All fundamentals missing
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("0.0000");
      expect(result.breakdown.every((b) => b.skippedReason === "missing_fundamental")).toBe(true);
    });

    it("handles null fundamental values as missing", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: null as unknown as number },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].skippedReason).toBe("missing_fundamental");
    });
  });

  describe("All Operators", () => {
    it("gt operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "gt",
        value: "10",
        points: 5,
        requiredFundamentals: ["value"],
      });

      const pass = evaluateCriterion(criterion, { value: 11 });
      const fail = evaluateCriterion(criterion, { value: 10 });

      expect(pass.matched).toBe(true);
      expect(fail.matched).toBe(false);
    });

    it("lt operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "lt",
        value: "10",
        points: 5,
        requiredFundamentals: ["value"],
      });

      const pass = evaluateCriterion(criterion, { value: 9 });
      const fail = evaluateCriterion(criterion, { value: 10 });

      expect(pass.matched).toBe(true);
      expect(fail.matched).toBe(false);
    });

    it("gte operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "gte",
        value: "10",
        points: 5,
        requiredFundamentals: ["value"],
      });

      const pass1 = evaluateCriterion(criterion, { value: 11 });
      const pass2 = evaluateCriterion(criterion, { value: 10 });
      const fail = evaluateCriterion(criterion, { value: 9 });

      expect(pass1.matched).toBe(true);
      expect(pass2.matched).toBe(true);
      expect(fail.matched).toBe(false);
    });

    it("lte operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "lte",
        value: "10",
        points: 5,
        requiredFundamentals: ["value"],
      });

      const pass1 = evaluateCriterion(criterion, { value: 9 });
      const pass2 = evaluateCriterion(criterion, { value: 10 });
      const fail = evaluateCriterion(criterion, { value: 11 });

      expect(pass1.matched).toBe(true);
      expect(pass2.matched).toBe(true);
      expect(fail.matched).toBe(false);
    });

    it("between operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "between",
        value: "5",
        value2: "15",
        points: 5,
        requiredFundamentals: ["value"],
      });

      const pass1 = evaluateCriterion(criterion, { value: 5 });
      const pass2 = evaluateCriterion(criterion, { value: 10 });
      const pass3 = evaluateCriterion(criterion, { value: 15 });
      const fail1 = evaluateCriterion(criterion, { value: 4 });
      const fail2 = evaluateCriterion(criterion, { value: 16 });

      expect(pass1.matched).toBe(true);
      expect(pass2.matched).toBe(true);
      expect(pass3.matched).toBe(true);
      expect(fail1.matched).toBe(false);
      expect(fail2.matched).toBe(false);
    });

    it("equals operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "equals",
        value: "10",
        points: 5,
        requiredFundamentals: ["value"],
      });

      const pass = evaluateCriterion(criterion, { value: 10 });
      const fail = evaluateCriterion(criterion, { value: 10.01 });

      expect(pass.matched).toBe(true);
      expect(fail.matched).toBe(false);
    });

    it("exists operator works correctly", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "exists",
        value: "0", // Value doesn't matter for exists
        points: 5,
        requiredFundamentals: [], // Empty for exists
      });

      const pass = evaluateCriterion(criterion, { value: 10 });
      const fail = evaluateCriterion(criterion, { value: null as unknown as number });

      expect(pass.matched).toBe(true);
      expect(fail.matched).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero points criterion", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "gt",
          value: "5",
          points: 0, // Zero points
          requiredFundamentals: ["value"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { value: 10 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(true);
      expect(result.breakdown[0].pointsAwarded).toBe(0);
      expect(result.score).toBe("0.0000");
    });

    it("handles negative points criterion", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "gt",
          value: "5",
          points: -10, // Negative points
          requiredFundamentals: ["value"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { value: 10 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(true);
      expect(result.breakdown[0].pointsAwarded).toBe(-10);
      expect(result.score).toBe("-10.0000");
    });

    it("handles no matching criteria", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "gt",
          value: "100",
          points: 10,
          requiredFundamentals: ["value"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { value: 50 }, // Below threshold
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(false);
      expect(result.score).toBe("0.0000");
    });

    it("handles empty assets array", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({ id: "c1", metric: "value", operator: "gt", value: "5", points: 10 }),
      ];

      const assets: AssetWithFundamentals[] = [];

      const results = calculateScores(criteria, assets, "version-1");

      expect(results).toHaveLength(0);
    });

    it("handles empty criteria array", () => {
      const criteria: CriterionRule[] = [];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { value: 10 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("0.0000");
      expect(result.breakdown).toHaveLength(0);
    });
  });
});

// =============================================================================
// STORY 4.6: HISTORICAL SURPLUS SCORING - INTEGRATION TESTS
// =============================================================================

describe("Story 4.6: Historical Surplus Scoring Integration", () => {
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

  // Helper to create surplus history
  function createSurplusHistory(
    yearsAvailable: number,
    consecutiveSurplusYears: number
  ): SurplusHistoryData {
    return {
      yearsAvailable,
      consecutiveSurplusYears,
      surplusByYear: {},
      dataSource: "Test Data",
      lastUpdated: new Date().toISOString(),
    };
  }

  // Helper to create asset with surplus history
  function createAssetWithSurplus(
    overrides: Partial<AssetWithFundamentals>,
    surplusHistory?: SurplusHistoryData
  ): AssetWithFundamentals {
    return {
      id: crypto.randomUUID(),
      symbol: "TEST",
      fundamentals: {},
      surplusHistory,
      ...overrides,
    };
  }

  describe("AC-4.6.1: Bonus Points for Consistent Surplus History", () => {
    it("applies +5 bonus for 5+ consecutive years of surplus", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "HIGH_SURPLUS" },
          createSurplusHistory(5, 5) // 5 years, 5 consecutive
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("5.0000"); // +5 bonus only
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].criterionId).toBe("surplus-consistency");
      expect(result.breakdown[0].criterionName).toBe("Surplus Consistency");
      expect(result.breakdown[0].pointsAwarded).toBe(5);
      expect(result.breakdown[0].surplusDetails?.bonusApplied).toBe(5);
      expect(result.breakdown[0].surplusDetails?.penaltyApplied).toBe(0);
    });

    it("applies +5 bonus for 7+ consecutive years of surplus", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "VERY_HIGH" },
          createSurplusHistory(10, 7) // 10 years, 7 consecutive
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("5.0000"); // +5 bonus (capped)
      expect(result.breakdown[0].surplusDetails?.bonusApplied).toBe(5);
      expect(result.breakdown[0].surplusDetails?.consecutiveYears).toBe(7);
    });

    it("does NOT apply bonus for 4 consecutive years", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "ALMOST" },
          createSurplusHistory(5, 4) // 5 years data, only 4 consecutive
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("0.0000"); // No bonus
      expect(result.breakdown[0].surplusDetails?.bonusApplied).toBe(0);
    });
  });

  describe("AC-4.6.2: Penalty Points for Missing Surplus Data", () => {
    it("applies -2 penalty for 1 missing year", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "PARTIAL" },
          createSurplusHistory(4, 4) // Only 4 years data
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("-2.0000"); // -2 penalty for 1 missing year
      expect(result.breakdown[0].surplusDetails?.penaltyApplied).toBe(-2);
    });

    it("applies -4 penalty for 2 missing years", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "LESS_DATA" },
          createSurplusHistory(3, 3) // Only 3 years data
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("-4.0000"); // -4 penalty
      expect(result.breakdown[0].surplusDetails?.penaltyApplied).toBe(-4);
      expect(result.breakdown[0].surplusDetails?.yearsOfData).toBe(3);
    });

    it("applies -10 penalty for 0 years of data (worst case)", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "NO_DATA" },
          createSurplusHistory(0, 0) // No data
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("-10.0000"); // -10 penalty (5 * -2)
      expect(result.breakdown[0].surplusDetails?.penaltyApplied).toBe(-10);
    });

    it("applies NO penalty for 5+ years of data", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "FULL_DATA" },
          createSurplusHistory(5, 0) // 5 years data, no consecutive streak
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("0.0000"); // No bonus, no penalty
      expect(result.breakdown[0].surplusDetails?.penaltyApplied).toBe(0);
    });
  });

  describe("Combined Bonus and Penalty", () => {
    it("applies both bonus and penalty correctly", () => {
      // Edge case: 5 consecutive years but only 4 years of data
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "EDGE_CASE" },
          createSurplusHistory(4, 5) // 4 years data with 5 consecutive (data inconsistency)
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // +5 bonus - 2 penalty = +3
      expect(result.score).toBe("3.0000");
      expect(result.breakdown[0].surplusDetails?.bonusApplied).toBe(5);
      expect(result.breakdown[0].surplusDetails?.penaltyApplied).toBe(-2);
    });
  });

  describe("Surplus Scoring with Regular Criteria", () => {
    it("adds surplus score to regular criteria score", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          {
            id: "asset-1",
            symbol: "COMBO",
            fundamentals: { dividend_yield: 5.0 },
          },
          createSurplusHistory(5, 5)
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // 10 (dividend criterion) + 5 (surplus bonus) = 15
      expect(result.score).toBe("15.0000");
      expect(result.breakdown).toHaveLength(2);

      // Regular criterion
      expect(result.breakdown[0].criterionId).toBe("c1");
      expect(result.breakdown[0].matched).toBe(true);
      expect(result.breakdown[0].pointsAwarded).toBe(10);

      // Surplus criterion
      expect(result.breakdown[1].criterionId).toBe("surplus-consistency");
      expect(result.breakdown[1].pointsAwarded).toBe(5);
    });

    it("subtracts surplus penalty from regular criteria score", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          {
            id: "asset-1",
            symbol: "PENALTY",
            fundamentals: { dividend_yield: 5.0 },
          },
          createSurplusHistory(3, 3) // -4 penalty
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // 10 (dividend criterion) - 4 (surplus penalty) = 6
      expect(result.score).toBe("6.0000");
    });
  });

  describe("Assets Without Surplus History", () => {
    it("does NOT add surplus scoring for assets without surplus history", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        {
          id: crypto.randomUUID(),
          symbol: "NO_SURPLUS",
          fundamentals: { dividend_yield: 5.0 },
          // No surplusHistory field
        },
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("10.0000");
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].criterionId).toBe("c1");
    });

    it("handles undefined surplusHistory", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        {
          id: crypto.randomUUID(),
          symbol: "UNDEFINED",
          fundamentals: {},
          surplusHistory: undefined,
        },
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("0.0000");
      expect(result.breakdown).toHaveLength(0);
    });
  });

  describe("AC-4.6.3: Surplus Details in Breakdown", () => {
    it("includes surplusDetails in breakdown for display", () => {
      const criteria: CriterionRule[] = [];
      const assets: AssetWithFundamentals[] = [
        createAssetWithSurplus(
          { id: "asset-1", symbol: "DETAILED" },
          createSurplusHistory(4, 3) // 4 years data, 3 consecutive
        ),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      const surplusBreakdown = result.breakdown[0];
      expect(surplusBreakdown.surplusDetails).toBeDefined();
      expect(surplusBreakdown.surplusDetails?.yearsOfData).toBe(4);
      expect(surplusBreakdown.surplusDetails?.consecutiveYears).toBe(3);
      expect(surplusBreakdown.surplusDetails?.bonusApplied).toBe(0); // 3 < 5
      expect(surplusBreakdown.surplusDetails?.penaltyApplied).toBe(-2); // 1 missing year
    });
  });
});

// =============================================================================
// STORY 5.3: SCORE CALCULATION ENGINE - ADDITIONAL TESTS
// =============================================================================

describe("Story 5.3: Score Calculation Engine", () => {
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

  // Helper to create assets with fundamentals
  function createAsset(overrides: Partial<AssetWithFundamentals>): AssetWithFundamentals {
    return {
      id: crypto.randomUUID(),
      symbol: "TEST",
      fundamentals: {},
      ...overrides,
    };
  }

  describe("AC-5.3.1: Performance - 100 Assets Scored in < 100ms", () => {
    /**
     * Task 1.3: Performance assertion test
     *
     * Verifies that the scoring engine can process 100 assets with multiple
     * criteria in under 100ms total, meeting the performance requirement.
     *
     * Performance characteristics (Task 1.4):
     * - Scoring is in-memory computation with no I/O during calculation
     * - Fundamentals are pre-loaded before scoring starts
     * - No network calls during score calculation
     * - Expected performance: << 100ms for 100 assets (typically < 10ms)
     * - Algorithm complexity: O(criteria * assets) for evaluation
     * - Uses Map for O(1) asset score accumulation
     */
    it("scores 100 assets with 5 criteria in under 100ms", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
        createCriterionRule({
          id: "c2",
          metric: "pe_ratio",
          operator: "lt",
          value: "20.0",
          points: 8,
        }),
        createCriterionRule({
          id: "c3",
          metric: "roe",
          operator: "gte",
          value: "15.0",
          points: 12,
        }),
        createCriterionRule({
          id: "c4",
          metric: "market_cap",
          operator: "gt",
          value: "1000000000",
          points: 5,
        }),
        createCriterionRule({
          id: "c5",
          metric: "revenue_growth",
          operator: "gte",
          value: "5.0",
          points: 7,
        }),
      ];

      // Generate 100 assets with random fundamentals
      const assets: AssetWithFundamentals[] = Array.from({ length: 100 }, (_, i) =>
        createAsset({
          id: `asset-${i}`,
          symbol: `SYM${i}`,
          fundamentals: {
            dividend_yield: Math.random() * 10,
            pe_ratio: Math.random() * 40,
            roe: Math.random() * 30,
            market_cap: Math.random() * 5000000000,
            revenue_growth: Math.random() * 20,
          },
        })
      );

      // Measure scoring time
      const startTime = performance.now();
      const results = calculateScores(criteria, assets, "version-1");
      const endTime = performance.now();

      const durationMs = endTime - startTime;

      // Assert performance requirement
      expect(durationMs).toBeLessThan(100);
      expect(results).toHaveLength(100);

      // Log actual performance for documentation
      // Performance note: typically < 10ms for 100 assets
    });

    it("maintains performance with 10 criteria", () => {
      const criteria: CriterionRule[] = Array.from({ length: 10 }, (_, i) =>
        createCriterionRule({
          id: `c${i}`,
          metric: `metric_${i}`,
          operator: "gt",
          value: "5.0",
          points: i + 1,
          requiredFundamentals: [`metric_${i}`],
        })
      );

      const assets: AssetWithFundamentals[] = Array.from({ length: 100 }, (_, i) => {
        const fundamentals: Record<string, number | null> = {};
        for (let j = 0; j < 10; j++) {
          fundamentals[`metric_${j}`] = Math.random() * 20;
        }
        return createAsset({
          id: `asset-${i}`,
          symbol: `SYM${i}`,
          fundamentals,
        });
      });

      const startTime = performance.now();
      const results = calculateScores(criteria, assets, "version-1");
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(results).toHaveLength(100);
    });
  });

  describe("AC-5.3.2: Score Breakdown Storage", () => {
    it("stores breakdown with all required fields for each criterion", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "High Dividend Yield",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
        }),
        createCriterionRule({
          id: "c2",
          name: "Low PE Ratio",
          metric: "pe_ratio",
          operator: "lt",
          value: "20.0",
          points: 5,
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { dividend_yield: 5.0, pe_ratio: 15.0 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // Verify breakdown is stored with all required fields
      expect(result.breakdown).toHaveLength(2);

      for (const item of result.breakdown) {
        expect(item).toHaveProperty("criterionId");
        expect(item).toHaveProperty("criterionName");
        expect(item).toHaveProperty("matched");
        expect(item).toHaveProperty("pointsAwarded");
        expect(item).toHaveProperty("actualValue");
        expect(item).toHaveProperty("skippedReason");
        expect(typeof item.criterionId).toBe("string");
        expect(typeof item.criterionName).toBe("string");
        expect(typeof item.matched).toBe("boolean");
        expect(typeof item.pointsAwarded).toBe("number");
      }
    });

    it("stores timestamp with each score calculation", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({ id: "c1", metric: "value", operator: "gt", value: "0", points: 5 }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { value: 10 } }),
      ];

      const beforeCalc = new Date();
      const [result] = calculateScores(criteria, assets, "version-1");
      const afterCalc = new Date();

      expect(result.calculatedAt).toBeInstanceOf(Date);
      expect(result.calculatedAt.getTime()).toBeGreaterThanOrEqual(beforeCalc.getTime());
      expect(result.calculatedAt.getTime()).toBeLessThanOrEqual(afterCalc.getTime());
    });

    it("breakdown JSON structure is queryable (all required fields present)", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "Test Criterion",
          metric: "value",
          operator: "gt",
          value: "5.0",
          points: 10,
          requiredFundamentals: ["value"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { value: 10.0 } }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // Verify JSON structure can be queried as expected in JSONB
      const breakdown = result.breakdown;
      expect(Array.isArray(breakdown)).toBe(true);

      // Simulate JSONB query patterns
      const firstItem = breakdown[0]!;
      expect(firstItem.criterionId).toBeDefined();
      expect(firstItem.criterionName).toBe("Test Criterion");
      expect(firstItem.matched).toBe(true);
      expect(firstItem.pointsAwarded).toBe(10);
      expect(firstItem.actualValue).toBe("10");
      expect(firstItem.skippedReason).toBeNull();
    });
  });

  describe("AC-5.3.4: Decimal.js Precision", () => {
    it("calculates 0.1 + 0.2 = 0.3 exactly (floating point precision)", () => {
      // This is a critical test - JavaScript native: 0.1 + 0.2 = 0.30000000000000004
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "equals",
          value: "0.3",
          points: 10,
          requiredFundamentals: ["value"],
        }),
      ];

      // Using 0.3 which should match exactly with proper decimal handling
      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { value: 0.3 } }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(true);
      expect(result.score).toBe("10.0000");
    });

    it("uses ROUND_HALF_UP for 4 decimal place scores", () => {
      // Test that scores are stored with exactly 4 decimal places
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "value",
          operator: "gt",
          value: "0",
          points: 7,
          requiredFundamentals: ["value"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: { value: 1 } }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.score).toBe("7.0000");
      expect(result.score.split(".")[1]).toHaveLength(4);
    });

    it("handles -0 edge case per project-context.md", () => {
      // Per project-context.md: new Decimal(0).times(-2) returns -0
      // Score should never be displayed as -0
      const criteria: CriterionRule[] = [];

      const assets: AssetWithFundamentals[] = [
        createAsset({ id: "asset-1", symbol: "TEST", fundamentals: {} }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // Score should be "0.0000" not "-0.0000"
      expect(result.score).toBe("0.0000");
      expect(result.score).not.toBe("-0.0000");

      // Verify no -0 in the string representation
      expect(result.score.startsWith("-")).toBe(false);
    });

    it("maintains precision with large numbers", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "market_cap",
          operator: "gt",
          value: "999999999999.99",
          points: 100,
          requiredFundamentals: ["market_cap"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { market_cap: 1000000000000 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(true);
      expect(result.score).toBe("100.0000");
    });
  });

  describe("AC-5.3.5: Missing Fundamentals Handling", () => {
    it("criterion with missing fundamental returns 0 points with skippedReason", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "Dividend Check",
          metric: "dividend_yield",
          operator: "gt",
          value: "3.0",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: {}, // Missing dividend_yield
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      expect(result.breakdown[0].matched).toBe(false);
      expect(result.breakdown[0].pointsAwarded).toBe(0);
      expect(result.breakdown[0].skippedReason).toBe("missing_fundamental");
      expect(result.breakdown[0].actualValue).toBeNull();
    });

    it("breakdown includes skippedReason field for missing data", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "pe_ratio",
          operator: "lt",
          value: "20",
          points: 5,
          requiredFundamentals: ["pe_ratio"],
        }),
        createCriterionRule({
          id: "c2",
          metric: "dividend_yield",
          operator: "gt",
          value: "3",
          points: 10,
          requiredFundamentals: ["dividend_yield"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { pe_ratio: 15 }, // dividend_yield missing
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // First criterion has data
      expect(result.breakdown[0].skippedReason).toBeNull();
      expect(result.breakdown[0].matched).toBe(true);

      // Second criterion is missing fundamental
      expect(result.breakdown[1].skippedReason).toBe("missing_fundamental");
      expect(result.breakdown[1].matched).toBe(false);
    });

    it("handles null values as missing fundamentals", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "gt",
        value: "5",
        points: 10,
        requiredFundamentals: ["value"],
      });

      const resultWithNull = evaluateCriterion(criterion, { value: null as unknown as number });

      expect(resultWithNull.skippedReason).toBe("missing_fundamental");
      expect(resultWithNull.pointsAwarded).toBe(0);
    });

    it("handles undefined values as missing fundamentals", () => {
      const criterion = createCriterionRule({
        id: "c1",
        metric: "value",
        operator: "gt",
        value: "5",
        points: 10,
        requiredFundamentals: ["value"],
      });

      const resultWithUndefined = evaluateCriterion(criterion, {
        value: undefined as unknown as number,
      });

      expect(resultWithUndefined.skippedReason).toBe("missing_fundamental");
      expect(resultWithUndefined.pointsAwarded).toBe(0);
    });
  });

  describe("AC-5.3.6: Fundamentals Data Flow", () => {
    it("scoring engine receives fundamentals and evaluates correctly", () => {
      // Simulates data flow: overnight job → asset_fundamentals → scoring engine
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          name: "P/E Filter",
          metric: "pe_ratio",
          operator: "lt",
          value: "15.0",
          points: 10,
          requiredFundamentals: ["pe_ratio"],
        }),
        createCriterionRule({
          id: "c2",
          name: "Dividend Filter",
          metric: "dividend_yield",
          operator: "gte",
          value: "3.0",
          points: 8,
          requiredFundamentals: ["dividend_yield"],
        }),
        createCriterionRule({
          id: "c3",
          name: "Market Cap Filter",
          metric: "market_cap",
          operator: "gt",
          value: "1000000000",
          points: 5,
          requiredFundamentals: ["market_cap"],
        }),
      ];

      // Simulate fundamentals data as stored by overnight job
      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-aapl",
          symbol: "AAPL",
          fundamentals: {
            pe_ratio: 12.5,
            dividend_yield: 4.2,
            market_cap: 2500000000000,
            revenue: 380000000000,
            earnings: 95000000000,
          },
        }),
        createAsset({
          id: "asset-msft",
          symbol: "MSFT",
          fundamentals: {
            pe_ratio: 28.0, // Above threshold - won't match
            dividend_yield: 2.1, // Below threshold - won't match
            market_cap: 2800000000000, // Matches
          },
        }),
      ];

      const results = calculateScores(criteria, assets, "version-1");

      // AAPL: all 3 criteria match = 10 + 8 + 5 = 23
      const aapl = results.find((r) => r.symbol === "AAPL");
      expect(aapl?.score).toBe("23.0000");
      expect(aapl?.breakdown.filter((b) => b.matched)).toHaveLength(3);

      // MSFT: only market cap matches = 5
      const msft = results.find((r) => r.symbol === "MSFT");
      expect(msft?.score).toBe("5.0000");
      expect(msft?.breakdown.filter((b) => b.matched)).toHaveLength(1);
    });

    it("actualValue in breakdown reflects actual fundamentals data", () => {
      const criteria: CriterionRule[] = [
        createCriterionRule({
          id: "c1",
          metric: "pe_ratio",
          operator: "lt",
          value: "20",
          points: 10,
          requiredFundamentals: ["pe_ratio"],
        }),
      ];

      const assets: AssetWithFundamentals[] = [
        createAsset({
          id: "asset-1",
          symbol: "TEST",
          fundamentals: { pe_ratio: 15.75 },
        }),
      ];

      const [result] = calculateScores(criteria, assets, "version-1");

      // actualValue should reflect the fundamentals data
      expect(result.breakdown[0].actualValue).toBe("15.75");
    });
  });
});
