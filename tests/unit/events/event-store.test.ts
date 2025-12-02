/**
 * Event Store Tests
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Tests for AC1 (4 event types) and AC2 (correlation_id linking)
 *
 * Note: These tests require Vitest (configured in Story 1-7)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventStore } from "@/lib/events/event-store";
import type {
  CalcStartedEvent,
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcCompletedEvent,
} from "@/lib/events/types";

// Mock database for unit tests
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "test-id" }]),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

describe("EventStore", () => {
  let eventStore: EventStore;
  const testUserId = "user-123";
  const testCorrelationId = "corr-456";

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset mock chain methods
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([{ id: "test-id" }]);
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    // orderBy can be terminal (getByCorrelationId) or chain to limit (getByUserId)
    // Use mockReturnThis() by default - tests that need terminal behavior use mockResolvedValueOnce
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);
    // @ts-expect-error - mock database
    eventStore = new EventStore(mockDb);
  });

  describe("append", () => {
    it("stores CALC_STARTED event with correct fields", async () => {
      const event: CalcStartedEvent = {
        type: "CALC_STARTED",
        correlationId: testCorrelationId,
        userId: testUserId,
        timestamp: new Date(),
        market: "NYSE",
      };

      await eventStore.append(testUserId, event);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: testCorrelationId,
          userId: testUserId,
          eventType: "CALC_STARTED",
          payload: event,
        })
      );
    });

    it("stores INPUTS_CAPTURED event with correct fields", async () => {
      const event: InputsCapturedEvent = {
        type: "INPUTS_CAPTURED",
        correlationId: testCorrelationId,
        criteriaVersionId: "v1",
        criteria: {
          id: "crit-1",
          version: "1.0",
          name: "Test Criteria",
          criteria: [],
        },
        prices: [],
        rates: [],
        assetIds: ["asset-1"],
      };

      await eventStore.append(testUserId, event);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "INPUTS_CAPTURED",
          payload: event,
        })
      );
    });

    it("stores SCORES_COMPUTED event with correct fields", async () => {
      const event: ScoresComputedEvent = {
        type: "SCORES_COMPUTED",
        correlationId: testCorrelationId,
        results: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "85.5000",
            maxPossibleScore: "100.0000",
            percentage: "85.5000",
            breakdown: [],
          },
        ],
      };

      await eventStore.append(testUserId, event);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SCORES_COMPUTED",
          payload: event,
        })
      );
    });

    it("stores CALC_COMPLETED event with correct fields", async () => {
      const event: CalcCompletedEvent = {
        type: "CALC_COMPLETED",
        correlationId: testCorrelationId,
        duration: 1500,
        assetCount: 10,
        status: "success",
      };

      await eventStore.append(testUserId, event);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "CALC_COMPLETED",
          payload: event,
        })
      );
    });

    it("throws error when insert fails", async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const event: CalcStartedEvent = {
        type: "CALC_STARTED",
        correlationId: testCorrelationId,
        userId: testUserId,
        timestamp: new Date(),
      };

      await expect(eventStore.append(testUserId, event)).rejects.toThrow("Failed to append event");
    });
  });

  describe("appendBatch", () => {
    it("stores multiple events atomically", async () => {
      const events: CalcStartedEvent[] = [
        {
          type: "CALC_STARTED",
          correlationId: "corr-1",
          userId: testUserId,
          timestamp: new Date(),
        },
        {
          type: "CALC_STARTED",
          correlationId: "corr-2",
          userId: testUserId,
          timestamp: new Date(),
        },
      ];

      await eventStore.appendBatch(testUserId, events);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ correlationId: "corr-1" }),
          expect.objectContaining({ correlationId: "corr-2" }),
        ])
      );
    });

    it("handles empty array without error", async () => {
      await eventStore.appendBatch(testUserId, []);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("getByCorrelationId", () => {
    it("returns events in chronological order", async () => {
      const mockEvents = [
        {
          id: "1",
          correlationId: testCorrelationId,
          userId: testUserId,
          eventType: "CALC_STARTED",
          payload: { type: "CALC_STARTED", correlationId: testCorrelationId },
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
        {
          id: "2",
          correlationId: testCorrelationId,
          userId: testUserId,
          eventType: "INPUTS_CAPTURED",
          payload: {
            type: "INPUTS_CAPTURED",
            correlationId: testCorrelationId,
          },
          createdAt: new Date("2024-01-01T00:00:01Z"),
        },
      ];
      // getByCorrelationId chain ends with orderBy, not limit
      mockDb.orderBy.mockResolvedValueOnce(mockEvents);

      const results = await eventStore.getByCorrelationId(testCorrelationId);

      expect(results).toHaveLength(2);
      expect(results[0].eventType).toBe("CALC_STARTED");
      expect(results[1].eventType).toBe("INPUTS_CAPTURED");
    });

    it("returns empty array when no events found", async () => {
      // getByCorrelationId chain ends with orderBy, not limit
      mockDb.orderBy.mockResolvedValueOnce([]);

      const results = await eventStore.getByCorrelationId("nonexistent");

      expect(results).toHaveLength(0);
    });

    it("returns events with matching correlationId", async () => {
      const mockEvent = {
        id: "1",
        correlationId: testCorrelationId,
        userId: testUserId,
        eventType: "CALC_STARTED",
        payload: { type: "CALC_STARTED", correlationId: testCorrelationId },
        createdAt: new Date(),
      };
      // getByCorrelationId chain ends with orderBy, not limit
      mockDb.orderBy.mockResolvedValueOnce([mockEvent]);

      const results = await eventStore.getByCorrelationId(testCorrelationId);

      expect(results[0].correlationId).toBe(testCorrelationId);
    });
  });

  describe("getByUserId", () => {
    it("returns user events in reverse chronological order", async () => {
      const mockEvents = [
        {
          id: "2",
          correlationId: "corr-2",
          userId: testUserId,
          eventType: "CALC_COMPLETED",
          payload: { type: "CALC_COMPLETED" },
          createdAt: new Date("2024-01-02"),
        },
        {
          id: "1",
          correlationId: "corr-1",
          userId: testUserId,
          eventType: "CALC_STARTED",
          payload: { type: "CALC_STARTED" },
          createdAt: new Date("2024-01-01"),
        },
      ];
      mockDb.limit.mockResolvedValueOnce(mockEvents);

      const results = await eventStore.getByUserId(testUserId);

      expect(results).toHaveLength(2);
      // Newest first (reverse chronological)
      expect(results[0].id).toBe("2");
    });

    it("respects limit parameter", async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await eventStore.getByUserId(testUserId, 50);

      expect(mockDb.limit).toHaveBeenCalledWith(50);
    });

    it("uses default limit of 100", async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await eventStore.getByUserId(testUserId);

      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });
  });

  describe("getByEventType", () => {
    it("filters events by type and userId", async () => {
      const mockEvents = [
        {
          id: "1",
          correlationId: "corr-1",
          userId: testUserId,
          eventType: "CALC_COMPLETED",
          payload: { type: "CALC_COMPLETED", status: "success" },
          createdAt: new Date(),
        },
      ];
      mockDb.limit.mockResolvedValueOnce(mockEvents);

      const results = await eventStore.getByEventType(testUserId, "CALC_COMPLETED");

      expect(results).toHaveLength(1);
      expect(results[0].eventType).toBe("CALC_COMPLETED");
    });
  });
});
