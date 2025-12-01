/**
 * Calculation Replay Function
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Implements ADR-002: Event-Sourced Calculations
 *
 * Replays a calculation using stored events to verify determinism.
 * Loads INPUTS_CAPTURED event, re-executes scoring, compares with original.
 *
 * AC4: Any calculation can be replayed using replay(correlationId)
 * AC5: Replay produces identical results (deterministic)
 */

import { EventStore, eventStore as defaultEventStore } from "./event-store";
import {
  isInputsCapturedEvent,
  isScoresComputedEvent,
  type AssetScoreResult,
  type InputsCapturedEvent,
  type ScoresComputedEvent,
} from "./types";
import { Decimal } from "@/lib/calculations/decimal-config";

/**
 * Result of a calculation replay
 *
 * AC4, AC5: Contains original and replayed results for comparison
 */
export interface ReplayResult {
  /** Whether the replay completed without errors */
  success: boolean;
  /** Correlation ID of the replayed calculation */
  correlationId: string;
  /** Original results from SCORES_COMPUTED event */
  originalResults: AssetScoreResult[];
  /** Results from replaying the calculation */
  replayResults: AssetScoreResult[];
  /** Whether original and replay results match exactly */
  matches: boolean;
  /** Details of any mismatches found */
  discrepancies?: Array<{
    assetId: string;
    originalScore: string;
    replayScore: string;
  }>;
  /** Error message if replay failed */
  error?: string;
}

/**
 * Scoring function type for replay
 *
 * Takes the inputs from INPUTS_CAPTURED and returns score results.
 * Must be deterministic - same inputs = same outputs.
 */
export type ScoringFunction = (
  inputs: InputsCapturedEvent
) => AssetScoreResult[];

/**
 * Replays a calculation and compares with original results
 *
 * AC4: Loads events by correlation_id and re-executes
 * AC5: Compares results to verify determinism
 *
 * @param correlationId - Correlation ID of the calculation to replay
 * @param scoringFn - Function to re-calculate scores from inputs
 * @param store - Event store instance (optional, uses default)
 * @returns Replay result with match status
 *
 * @example
 * ```typescript
 * const result = await replay(correlationId, (inputs) => {
 *   return scoringEngine.calculateScores(inputs);
 * });
 *
 * if (!result.matches) {
 *   console.error('Non-deterministic calculation!', result.discrepancies);
 * }
 * ```
 */
export async function replay(
  correlationId: string,
  scoringFn: ScoringFunction,
  store: EventStore = defaultEventStore
): Promise<ReplayResult> {
  try {
    // Load all events for this calculation
    const events = await store.getByCorrelationId(correlationId);

    if (events.length === 0) {
      return {
        success: false,
        correlationId,
        originalResults: [],
        replayResults: [],
        matches: false,
        error: `No events found for correlation ID: ${correlationId}`,
      };
    }

    // Find INPUTS_CAPTURED event
    const inputsEvent = events.find((e) =>
      isInputsCapturedEvent(e.payload)
    )?.payload;

    if (!inputsEvent || !isInputsCapturedEvent(inputsEvent)) {
      return {
        success: false,
        correlationId,
        originalResults: [],
        replayResults: [],
        matches: false,
        error: "INPUTS_CAPTURED event not found",
      };
    }

    // Find original SCORES_COMPUTED event
    const scoresEvent = events.find((e) =>
      isScoresComputedEvent(e.payload)
    )?.payload;

    if (!scoresEvent || !isScoresComputedEvent(scoresEvent)) {
      return {
        success: false,
        correlationId,
        originalResults: [],
        replayResults: [],
        matches: false,
        error: "SCORES_COMPUTED event not found",
      };
    }

    const originalResults = scoresEvent.results;

    // Re-execute scoring with same inputs
    const replayResults = scoringFn(inputsEvent);

    // Compare results
    const { matches, discrepancies } = compareResults(
      originalResults,
      replayResults
    );

    const result: ReplayResult = {
      success: true,
      correlationId,
      originalResults,
      replayResults,
      matches,
    };

    if (discrepancies.length > 0) {
      result.discrepancies = discrepancies;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      correlationId,
      originalResults: [],
      replayResults: [],
      matches: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Compares two sets of score results for equality
 *
 * AC5: Verifies determinism by comparing scores
 *
 * Uses Decimal comparison for precise matching.
 *
 * @param original - Original results from SCORES_COMPUTED
 * @param replayed - Results from replay execution
 * @returns Match status and any discrepancies
 */
function compareResults(
  original: AssetScoreResult[],
  replayed: AssetScoreResult[]
): {
  matches: boolean;
  discrepancies: Array<{
    assetId: string;
    originalScore: string;
    replayScore: string;
  }>;
} {
  const discrepancies: Array<{
    assetId: string;
    originalScore: string;
    replayScore: string;
  }> = [];

  // Check for length mismatch
  if (original.length !== replayed.length) {
    // Add placeholder discrepancy for length mismatch
    discrepancies.push({
      assetId: "_length_mismatch",
      originalScore: String(original.length),
      replayScore: String(replayed.length),
    });
    return { matches: false, discrepancies };
  }

  // Create map of replayed results by assetId for O(1) lookup
  const replayedMap = new Map(replayed.map((r) => [r.assetId, r]));

  for (const origResult of original) {
    const replayResult = replayedMap.get(origResult.assetId);

    if (!replayResult) {
      discrepancies.push({
        assetId: origResult.assetId,
        originalScore: origResult.score,
        replayScore: "_missing",
      });
      continue;
    }

    // Compare scores using Decimal for precision
    const origScore = new Decimal(origResult.score);
    const replayScore = new Decimal(replayResult.score);

    if (!origScore.equals(replayScore)) {
      discrepancies.push({
        assetId: origResult.assetId,
        originalScore: origResult.score,
        replayScore: replayResult.score,
      });
    }
  }

  return {
    matches: discrepancies.length === 0,
    discrepancies,
  };
}

/**
 * Replays multiple calculations and returns summary
 *
 * Useful for batch verification of calculation determinism.
 *
 * @param correlationIds - Array of correlation IDs to replay
 * @param scoringFn - Function to re-calculate scores
 * @param store - Event store instance
 * @returns Summary of all replays
 */
export async function replayBatch(
  correlationIds: string[],
  scoringFn: ScoringFunction,
  store: EventStore = defaultEventStore
): Promise<{
  total: number;
  successful: number;
  matching: number;
  results: ReplayResult[];
}> {
  const results: ReplayResult[] = [];

  for (const correlationId of correlationIds) {
    const result = await replay(correlationId, scoringFn, store);
    results.push(result);
  }

  return {
    total: results.length,
    successful: results.filter((r) => r.success).length,
    matching: results.filter((r) => r.matches).length,
    results,
  };
}
