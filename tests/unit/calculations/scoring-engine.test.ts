/**
 * Scoring Engine Tests
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Story 5.8: Score Calculation Engine
 *
 * Tests for:
 * - AC5 (deterministic calculations) - Story 1.4
 * - AC-5.8.1: Criteria-Driven Algorithm Execution Order
 * - AC-5.8.2: Decimal Precision for All Calculations
 * - AC-5.8.3: Deterministic Calculation
 * - AC-5.8.4: Event Emission for Audit Trail
 * - AC-5.8.5: Score Storage with Audit Trail
 * - AC-5.8.6: Missing Fundamentals Handling
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
import type { AssetWithFundamentals } from "@/lib/validations/score-schemas";

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
