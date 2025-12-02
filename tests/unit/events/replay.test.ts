/**
 * Replay Function Tests
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Tests for AC4 (replay capability) and AC5 (deterministic results)
 *
 * Note: These tests require Vitest (configured in Story 1-7)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { replay, replayBatch } from "@/lib/events/replay";
import type { EventStore, StoredEvent } from "@/lib/events/event-store";
import type {
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcStartedEvent,
  CalcCompletedEvent,
  AssetScoreResult,
} from "@/lib/events/types";

// Helper to create mock stored events
function createStoredEvent(
  payload: CalcStartedEvent | InputsCapturedEvent | ScoresComputedEvent | CalcCompletedEvent,
  id: string
): StoredEvent {
  return {
    id,
    correlationId: payload.correlationId,
    userId: "user-123",
    eventType: payload.type,
    payload,
    createdAt: new Date(),
  };
}

describe("replay", () => {
  const testCorrelationId = "corr-123";
  const testUserId = "user-123";

  // Sample events for a complete calculation
  const calcStartedEvent: CalcStartedEvent = {
    type: "CALC_STARTED",
    correlationId: testCorrelationId,
    userId: testUserId,
    timestamp: new Date(),
  };

  const inputsCapturedEvent: InputsCapturedEvent = {
    type: "INPUTS_CAPTURED",
    correlationId: testCorrelationId,
    criteriaVersionId: "v1",
    criteria: {
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
    },
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
    rates: [],
    assetIds: ["asset-1"],
  };

  const originalResults: AssetScoreResult[] = [
    {
      assetId: "asset-1",
      symbol: "AAPL",
      score: "10.0000",
      maxPossibleScore: "10.0000",
      percentage: "100.0000",
      breakdown: [],
    },
  ];

  const scoresComputedEvent: ScoresComputedEvent = {
    type: "SCORES_COMPUTED",
    correlationId: testCorrelationId,
    results: originalResults,
  };

  const calcCompletedEvent: CalcCompletedEvent = {
    type: "CALC_COMPLETED",
    correlationId: testCorrelationId,
    duration: 1500,
    assetCount: 1,
    status: "success",
  };

  const fullEventSet: StoredEvent[] = [
    createStoredEvent(calcStartedEvent, "1"),
    createStoredEvent(inputsCapturedEvent, "2"),
    createStoredEvent(scoresComputedEvent, "3"),
    createStoredEvent(calcCompletedEvent, "4"),
  ];

  let mockEventStore: Partial<EventStore>;

  beforeEach(() => {
    mockEventStore = {
      getByCorrelationId: vi.fn().mockResolvedValue(fullEventSet),
    };
  });

  describe("loads events for correlationId", () => {
    it("retrieves events from event store", async () => {
      const scoringFn = vi.fn().mockReturnValue(originalResults);

      await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(mockEventStore.getByCorrelationId).toHaveBeenCalledWith(testCorrelationId);
    });

    it("returns error when no events found", async () => {
      mockEventStore.getByCorrelationId = vi.fn().mockResolvedValue([]);
      const scoringFn = vi.fn();

      const result = await replay("nonexistent", scoringFn, mockEventStore as EventStore);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No events found");
    });
  });

  describe("produces identical results (deterministic)", () => {
    it("returns matches=true when results are identical", async () => {
      const scoringFn = vi.fn().mockReturnValue(originalResults);

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.success).toBe(true);
      expect(result.matches).toBe(true);
      expect(result.discrepancies).toBeUndefined();
    });

    it("returns matches=false when results differ", async () => {
      const differentResults: AssetScoreResult[] = [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "8.0000", // Different from original
          maxPossibleScore: "10.0000",
          percentage: "80.0000",
          breakdown: [],
        },
      ];
      const scoringFn = vi.fn().mockReturnValue(differentResults);

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.success).toBe(true);
      expect(result.matches).toBe(false);
      expect(result.discrepancies).toBeDefined();
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies![0]).toEqual({
        assetId: "asset-1",
        originalScore: "10.0000",
        replayScore: "8.0000",
      });
    });

    it("detects missing assets in replay", async () => {
      const scoringFn = vi.fn().mockReturnValue([]); // Empty results

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.matches).toBe(false);
      expect(result.discrepancies).toBeDefined();
    });
  });

  describe("handles missing events gracefully", () => {
    it("returns error when INPUTS_CAPTURED not found", async () => {
      mockEventStore.getByCorrelationId = vi
        .fn()
        .mockResolvedValue([
          createStoredEvent(calcStartedEvent, "1"),
          createStoredEvent(scoresComputedEvent, "3"),
        ]);
      const scoringFn = vi.fn();

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.success).toBe(false);
      expect(result.error).toContain("INPUTS_CAPTURED event not found");
    });

    it("returns error when SCORES_COMPUTED not found", async () => {
      mockEventStore.getByCorrelationId = vi
        .fn()
        .mockResolvedValue([
          createStoredEvent(calcStartedEvent, "1"),
          createStoredEvent(inputsCapturedEvent, "2"),
        ]);
      const scoringFn = vi.fn();

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.success).toBe(false);
      expect(result.error).toContain("SCORES_COMPUTED event not found");
    });

    it("handles scoring function errors", async () => {
      const scoringFn = vi.fn().mockImplementation(() => {
        throw new Error("Scoring failed");
      });

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Scoring failed");
    });
  });

  describe("calls scoring function with correct inputs", () => {
    it("passes INPUTS_CAPTURED event to scoring function", async () => {
      const scoringFn = vi.fn().mockReturnValue(originalResults);

      await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(scoringFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "INPUTS_CAPTURED",
          correlationId: testCorrelationId,
          criteriaVersionId: "v1",
        })
      );
    });
  });

  describe("returns complete result structure", () => {
    it("includes correlationId in result", async () => {
      const scoringFn = vi.fn().mockReturnValue(originalResults);

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.correlationId).toBe(testCorrelationId);
    });

    it("includes original and replay results", async () => {
      const scoringFn = vi.fn().mockReturnValue(originalResults);

      const result = await replay(testCorrelationId, scoringFn, mockEventStore as EventStore);

      expect(result.originalResults).toEqual(originalResults);
      expect(result.replayResults).toEqual(originalResults);
    });
  });
});

describe("replayBatch", () => {
  it("replays multiple calculations", async () => {
    const correlationIds = ["corr-1", "corr-2", "corr-3"];
    const scoringFn = vi.fn().mockReturnValue([]);

    const mockStore = {
      getByCorrelationId: vi.fn().mockResolvedValue([]),
    };

    const result = await replayBatch(correlationIds, scoringFn, mockStore as unknown as EventStore);

    expect(result.total).toBe(3);
    expect(result.results).toHaveLength(3);
  });

  it("returns summary statistics", async () => {
    const mockStore = {
      getByCorrelationId: vi.fn().mockResolvedValue([]),
    };
    const scoringFn = vi.fn();

    const result = await replayBatch(
      ["corr-1", "corr-2"],
      scoringFn,
      mockStore as unknown as EventStore
    );

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("successful");
    expect(result).toHaveProperty("matching");
    expect(result).toHaveProperty("results");
  });
});
