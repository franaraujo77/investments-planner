/**
 * Extended Replay Function Tests
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.5: Replay Produces Identical Results (Deterministic)
 *
 * Tests for:
 * - replayCalculation() with mock events
 * - Determinism verification
 * - Error handling for missing events
 * - Non-deterministic detection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  replay,
  verifyDeterminism,
  compareResults,
  type ScoringFunction,
} from "@/lib/events/replay";
import { EventStore } from "@/lib/events/event-store";
import type {
  InputsCapturedEvent,
  ScoresComputedEvent,
  AssetScoreResult,
} from "@/lib/events/types";

// =============================================================================
// MOCKS
// =============================================================================

// Mock the event store
vi.mock("@/lib/events/event-store", () => ({
  EventStore: vi.fn(),
  eventStore: {
    getByCorrelationId: vi.fn(),
  },
}));

// Mock the scoring engine
vi.mock("@/lib/calculations/scoring-engine", () => ({
  scoringEngine: {
    calculateFromInputs: vi.fn(),
  },
}));

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockInputsEvent: InputsCapturedEvent = {
  type: "INPUTS_CAPTURED",
  correlationId: "test-correlation-id",
  criteriaVersionId: "cv-123",
  criteria: {
    id: "cv-123",
    version: "cv-123",
    name: "Test Criteria",
    criteria: [
      {
        id: "crit-1",
        name: "P/E Ratio",
        operator: "lt",
        value: "30",
        points: 10,
        weight: 1,
      },
    ],
  },
  prices: [],
  rates: [],
  assetIds: ["asset-1", "asset-2"],
};

const mockScoresEvent: ScoresComputedEvent = {
  type: "SCORES_COMPUTED",
  correlationId: "test-correlation-id",
  results: [
    {
      assetId: "asset-1",
      symbol: "AAPL",
      score: "10.0000",
      maxPossibleScore: "10",
      percentage: "100",
      breakdown: [],
    },
    {
      assetId: "asset-2",
      symbol: "GOOGL",
      score: "5.0000",
      maxPossibleScore: "10",
      percentage: "50",
      breakdown: [],
    },
  ],
};

const mockStoredEvents = [
  {
    id: "event-1",
    correlationId: "test-correlation-id",
    userId: "user-123",
    eventType: "INPUTS_CAPTURED" as const,
    payload: mockInputsEvent,
    createdAt: new Date(),
  },
  {
    id: "event-2",
    correlationId: "test-correlation-id",
    userId: "user-123",
    eventType: "SCORES_COMPUTED" as const,
    payload: mockScoresEvent,
    createdAt: new Date(),
  },
];

// =============================================================================
// TESTS: compareResults
// =============================================================================

describe("compareResults", () => {
  it("should return matches=true for identical results", () => {
    const original: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
    ];

    const replayed: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
    ];

    const result = compareResults(original, replayed);

    expect(result.matches).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should detect score differences", () => {
    const original: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
    ];

    const replayed: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "9.0000", // Different score
        maxPossibleScore: "10",
        percentage: "90",
        breakdown: [],
      },
    ];

    const result = compareResults(original, replayed);

    expect(result.matches).toBe(false);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]).toEqual({
      assetId: "asset-1",
      originalScore: "10.0000",
      replayScore: "9.0000",
    });
  });

  it("should detect missing assets in replay", () => {
    const original: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
      {
        assetId: "asset-2",
        symbol: "GOOGL",
        score: "5.0000",
        maxPossibleScore: "10",
        percentage: "50",
        breakdown: [],
      },
    ];

    const replayed: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
      // asset-2 is missing
    ];

    const result = compareResults(original, replayed);

    expect(result.matches).toBe(false);
    // Length mismatch is detected
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });

  it("should detect length mismatch", () => {
    const original: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
    ];

    const replayed: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.0000",
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
      {
        assetId: "asset-2",
        symbol: "GOOGL",
        score: "5.0000",
        maxPossibleScore: "10",
        percentage: "50",
        breakdown: [],
      },
    ];

    const result = compareResults(original, replayed);

    expect(result.matches).toBe(false);
    expect(result.discrepancies).toContainEqual({
      assetId: "_length_mismatch",
      originalScore: "1",
      replayScore: "2",
    });
  });

  it("should compare scores using Decimal precision", () => {
    const original: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.1234567890123456789", // High precision
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
    ];

    const replayed: AssetScoreResult[] = [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "10.1234567890123456789", // Same high precision
        maxPossibleScore: "10",
        percentage: "100",
        breakdown: [],
      },
    ];

    const result = compareResults(original, replayed);

    expect(result.matches).toBe(true);
  });
});

// =============================================================================
// TESTS: replay
// =============================================================================

describe("replay", () => {
  let mockStore: { getByCorrelationId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStore = {
      getByCorrelationId: vi.fn(),
    };
  });

  it("should replay calculation and return matching results", async () => {
    mockStore.getByCorrelationId.mockResolvedValue(mockStoredEvents);

    const scoringFn: ScoringFunction = () => mockScoresEvent.results;

    const result = await replay(
      "test-correlation-id",
      scoringFn,
      mockStore as unknown as EventStore
    );

    expect(result.success).toBe(true);
    expect(result.matches).toBe(true);
    expect(result.originalResults).toEqual(mockScoresEvent.results);
    expect(result.replayResults).toEqual(mockScoresEvent.results);
  });

  it("should detect non-deterministic calculation", async () => {
    mockStore.getByCorrelationId.mockResolvedValue(mockStoredEvents);

    // Scoring function returns different results
    const scoringFn: ScoringFunction = () => [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "9.0000", // Different!
        maxPossibleScore: "10",
        percentage: "90",
        breakdown: [],
      },
      {
        assetId: "asset-2",
        symbol: "GOOGL",
        score: "5.0000",
        maxPossibleScore: "10",
        percentage: "50",
        breakdown: [],
      },
    ];

    const result = await replay(
      "test-correlation-id",
      scoringFn,
      mockStore as unknown as EventStore
    );

    expect(result.success).toBe(true);
    expect(result.matches).toBe(false);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies?.[0].assetId).toBe("asset-1");
  });

  it("should return error when no events found", async () => {
    mockStore.getByCorrelationId.mockResolvedValue([]);

    const scoringFn: ScoringFunction = () => [];

    const result = await replay(
      "missing-correlation-id",
      scoringFn,
      mockStore as unknown as EventStore
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("No events found");
  });

  it("should return error when INPUTS_CAPTURED event not found", async () => {
    mockStore.getByCorrelationId.mockResolvedValue([
      {
        id: "event-1",
        correlationId: "test-correlation-id",
        userId: "user-123",
        eventType: "CALC_STARTED",
        payload: {
          type: "CALC_STARTED",
          correlationId: "test-correlation-id",
          userId: "user-123",
          timestamp: new Date(),
        },
        createdAt: new Date(),
      },
    ]);

    const scoringFn: ScoringFunction = () => [];

    const result = await replay(
      "test-correlation-id",
      scoringFn,
      mockStore as unknown as EventStore
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("INPUTS_CAPTURED event not found");
  });

  it("should return error when SCORES_COMPUTED event not found", async () => {
    mockStore.getByCorrelationId.mockResolvedValue([
      {
        id: "event-1",
        correlationId: "test-correlation-id",
        userId: "user-123",
        eventType: "INPUTS_CAPTURED",
        payload: mockInputsEvent,
        createdAt: new Date(),
      },
    ]);

    const scoringFn: ScoringFunction = () => [];

    const result = await replay(
      "test-correlation-id",
      scoringFn,
      mockStore as unknown as EventStore
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("SCORES_COMPUTED event not found");
  });
});

// =============================================================================
// TESTS: verifyDeterminism
// =============================================================================

describe("verifyDeterminism", () => {
  let mockStore: { getByCorrelationId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStore = {
      getByCorrelationId: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it("should return verified=true for deterministic calculation", async () => {
    mockStore.getByCorrelationId.mockResolvedValue(mockStoredEvents);

    // Mock the scoring engine to return same results
    const { scoringEngine } = await import("@/lib/calculations/scoring-engine");
    vi.mocked(scoringEngine.calculateFromInputs).mockReturnValue(mockScoresEvent.results);

    const { verified, result } = await verifyDeterminism(
      "test-correlation-id",
      mockStore as unknown as EventStore
    );

    expect(verified).toBe(true);
    expect(result.matches).toBe(true);
  });

  it("should return verified=false for non-deterministic calculation", async () => {
    mockStore.getByCorrelationId.mockResolvedValue(mockStoredEvents);

    // Mock the scoring engine to return different results
    const { scoringEngine } = await import("@/lib/calculations/scoring-engine");
    vi.mocked(scoringEngine.calculateFromInputs).mockReturnValue([
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "8.0000", // Different!
        maxPossibleScore: "10",
        percentage: "80",
        breakdown: [],
      },
    ]);

    const { verified, result } = await verifyDeterminism(
      "test-correlation-id",
      mockStore as unknown as EventStore
    );

    expect(verified).toBe(false);
    expect(result.matches).toBe(false);
  });
});
