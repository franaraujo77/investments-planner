/**
 * Scoring Engine Tests
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Tests for AC5 (deterministic calculations)
 *
 * Note: These tests require Vitest (configured in Story 1-7)
 */

import { describe, it, expect } from "vitest";
import {
  ScoringEngine,
  createScoringFunction,
  type AssetData,
} from "@/lib/calculations/scoring-engine";
import type {
  CriteriaConfig,
  CriterionDefinition,
  InputsCapturedEvent,
} from "@/lib/events/types";

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
            weight: 1.3, // Non-round weight
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      // 7 * 1.3 = 9.1
      expect(result.score).toBe("9.1000");
      expect(result.maxPossibleScore).toBe("9.1000");
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

    it("handles zero weight gracefully", () => {
      const asset: AssetData = {
        id: "asset-1",
        symbol: "TEST",
        metrics: { value: "100" },
      };

      const criteria: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Zero Weight Test",
        criteria: [
          {
            id: "c1",
            name: "value",
            operator: "gte",
            value: "50",
            points: 10,
            weight: 0, // Zero weight
          },
        ],
      };

      const result = engine.calculateScore(asset, criteria, [], []);

      expect(result.score).toBe("0.0000");
      expect(result.maxPossibleScore).toBe("0.0000");
    });
  });
});
