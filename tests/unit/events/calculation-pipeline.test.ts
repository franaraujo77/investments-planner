/**
 * Calculation Pipeline Tests
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Tests for AC1 (4 event types), AC2 (correlation_id), AC3 (INPUTS_CAPTURED content)
 *
 * Note: These tests require Vitest (configured in Story 1-7)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CalculationPipeline } from "@/lib/events/calculation-pipeline";
import type { EventStore } from "@/lib/events/event-store";
import type { AssetScoreResult, CriteriaConfig } from "@/lib/events/types";

// Mock event store
const mockEventStore = {
  append: vi.fn().mockResolvedValue(undefined),
  appendBatch: vi.fn().mockResolvedValue(undefined),
  getByCorrelationId: vi.fn().mockResolvedValue([]),
  getByUserId: vi.fn().mockResolvedValue([]),
  getByEventType: vi.fn().mockResolvedValue([]),
  getCalcStartedEvent: vi.fn().mockResolvedValue(null),
};

describe("CalculationPipeline", () => {
  let pipeline: CalculationPipeline;
  const testUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    pipeline = new CalculationPipeline(mockEventStore as unknown as EventStore);
  });

  describe("start", () => {
    it("generates unique correlationId", () => {
      const correlationId1 = pipeline.start(testUserId);
      const correlationId2 = pipeline.start(testUserId);

      expect(correlationId1).toBeDefined();
      expect(correlationId2).toBeDefined();
      expect(correlationId1).not.toBe(correlationId2);
    });

    it("returns valid UUID format", () => {
      const correlationId = pipeline.start(testUserId);

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(correlationId).toMatch(uuidRegex);
    });

    it("emits CALC_STARTED event with correlationId", async () => {
      const correlationId = pipeline.start(testUserId);

      // Wait for async append to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "CALC_STARTED",
          correlationId,
          userId: testUserId,
        })
      );
    });

    it("includes optional market in CALC_STARTED event", async () => {
      const correlationId = pipeline.start(testUserId, "NYSE");

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "CALC_STARTED",
          correlationId,
          market: "NYSE",
        })
      );
    });
  });

  describe("startAsync", () => {
    it("waits for event to be stored", async () => {
      const correlationId = await pipeline.startAsync(testUserId);

      expect(correlationId).toBeDefined();
      expect(mockEventStore.append).toHaveBeenCalled();
    });
  });

  describe("full pipeline flow", () => {
    it("creates 4 events with same correlationId", async () => {
      const correlationId = await pipeline.startAsync(testUserId);

      // Capture inputs (AC3)
      const criteriaConfig: CriteriaConfig = {
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
        ],
      };

      await pipeline.captureInputs(correlationId, testUserId, {
        criteriaVersionId: "v1",
        criteria: criteriaConfig,
        prices: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            price: "150.00",
            currency: "USD",
            fetchedAt: new Date(),
            source: "test",
          },
        ],
        rates: [
          {
            fromCurrency: "USD",
            toCurrency: "BRL",
            rate: "5.00",
            fetchedAt: new Date(),
            source: "test",
          },
        ],
        assetIds: ["asset-1"],
      });

      // Record scores
      const results: AssetScoreResult[] = [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "10.0000",
          maxPossibleScore: "10.0000",
          percentage: "100.0000",
          breakdown: [],
        },
      ];
      await pipeline.recordScores(correlationId, testUserId, results);

      // Complete
      await pipeline.complete(
        correlationId,
        testUserId,
        1500,
        1,
        "success"
      );

      // Verify all 4 events were stored with same correlationId
      const appendCalls = mockEventStore.append.mock.calls;
      expect(appendCalls).toHaveLength(4);

      const eventTypes = appendCalls.map((call) => call[1].type);
      expect(eventTypes).toContain("CALC_STARTED");
      expect(eventTypes).toContain("INPUTS_CAPTURED");
      expect(eventTypes).toContain("SCORES_COMPUTED");
      expect(eventTypes).toContain("CALC_COMPLETED");

      // All events have same correlationId
      const correlationIds = appendCalls.map((call) => call[1].correlationId);
      expect(new Set(correlationIds).size).toBe(1);
      expect(correlationIds[0]).toBe(correlationId);
    });
  });

  describe("captureInputs", () => {
    it("includes all required fields (AC3)", async () => {
      const correlationId = "test-corr-id";
      const criteriaConfig: CriteriaConfig = {
        id: "crit-1",
        version: "1.0",
        name: "Test",
        criteria: [],
      };

      await pipeline.captureInputs(correlationId, testUserId, {
        criteriaVersionId: "v1",
        criteria: criteriaConfig,
        prices: [
          {
            assetId: "a1",
            symbol: "AAPL",
            price: "150",
            currency: "USD",
            fetchedAt: new Date(),
            source: "test",
          },
        ],
        rates: [
          {
            fromCurrency: "USD",
            toCurrency: "BRL",
            rate: "5",
            fetchedAt: new Date(),
            source: "test",
          },
        ],
        assetIds: ["a1"],
      });

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "INPUTS_CAPTURED",
          correlationId,
          criteriaVersionId: "v1",
          criteria: criteriaConfig,
          prices: expect.arrayContaining([
            expect.objectContaining({ assetId: "a1" }),
          ]),
          rates: expect.arrayContaining([
            expect.objectContaining({ fromCurrency: "USD" }),
          ]),
        })
      );
    });
  });

  describe("recordScores", () => {
    it("stores SCORES_COMPUTED event with results", async () => {
      const correlationId = "test-corr-id";
      const results: AssetScoreResult[] = [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "85.5000",
          maxPossibleScore: "100.0000",
          percentage: "85.5000",
          breakdown: [
            {
              criterionId: "c1",
              criterionName: "dividend_yield",
              rawValue: "4.5",
              passed: true,
              pointsAwarded: 10,
              maxPoints: 10,
            },
          ],
        },
      ];

      await pipeline.recordScores(correlationId, testUserId, results);

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "SCORES_COMPUTED",
          correlationId,
          results,
        })
      );
    });
  });

  describe("complete", () => {
    it("stores CALC_COMPLETED event with success status", async () => {
      const correlationId = "test-corr-id";

      await pipeline.complete(correlationId, testUserId, 1500, 10, "success");

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "CALC_COMPLETED",
          correlationId,
          duration: 1500,
          assetCount: 10,
          status: "success",
        })
      );
    });

    it("stores CALC_COMPLETED event with failed status and error", async () => {
      const correlationId = "test-corr-id";

      await pipeline.complete(
        correlationId,
        testUserId,
        500,
        0,
        "failed",
        "Connection timeout"
      );

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "CALC_COMPLETED",
          status: "failed",
          errorMessage: "Connection timeout",
        })
      );
    });

    it("stores CALC_COMPLETED event with partial status", async () => {
      const correlationId = "test-corr-id";

      await pipeline.complete(correlationId, testUserId, 2000, 5, "partial");

      expect(mockEventStore.append).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          type: "CALC_COMPLETED",
          status: "partial",
          assetCount: 5,
        })
      );
    });
  });

  describe("runComplete", () => {
    it("executes full pipeline with calculator function", async () => {
      const inputs = {
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

      const mockCalculator = vi.fn().mockReturnValue([
        {
          assetId: "asset-1",
          symbol: "TEST",
          score: "50.0000",
          maxPossibleScore: "100.0000",
          percentage: "50.0000",
          breakdown: [],
        },
      ]);

      const result = await pipeline.runComplete(
        testUserId,
        inputs,
        mockCalculator,
        "NYSE"
      );

      expect(result.correlationId).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(mockCalculator).toHaveBeenCalledWith(inputs);
      expect(mockEventStore.append).toHaveBeenCalledTimes(4);
    });

    it("handles calculator errors gracefully", async () => {
      const inputs = {
        criteriaVersionId: "v1",
        criteria: { id: "crit-1", version: "1.0", name: "Test", criteria: [] },
        prices: [],
        rates: [],
        assetIds: ["asset-1"],
      };

      const mockCalculator = vi.fn().mockImplementation(() => {
        throw new Error("Calculation failed");
      });

      const result = await pipeline.runComplete(
        testUserId,
        inputs,
        mockCalculator
      );

      expect(result.correlationId).toBeDefined();
      expect(result.results).toEqual([]);

      // Verify CALC_COMPLETED has failed status
      const completedCall = mockEventStore.append.mock.calls.find(
        (call) => call[1].type === "CALC_COMPLETED"
      );
      expect(completedCall[1].status).toBe("failed");
      expect(completedCall[1].errorMessage).toBe("Calculation failed");
    });
  });
});
