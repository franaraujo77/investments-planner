/**
 * Calculation Pipeline Orchestrator
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Implements ADR-002: Event-Sourced Calculations
 *
 * Orchestrates the event flow for calculation jobs:
 * CALC_STARTED → INPUTS_CAPTURED → SCORES_COMPUTED → CALC_COMPLETED
 *
 * AC1: Emits all 4 event types
 * AC2: All events share the same correlation_id
 * AC3: INPUTS_CAPTURED stores criteria version, prices, rates
 */

import { EventStore, eventStore as defaultEventStore } from "./event-store";
import { logger } from "@/lib/telemetry/logger";
import type {
  CalcStartedEvent,
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcCompletedEvent,
  AssetScoreResult,
  CriteriaConfig,
  PriceSnapshot,
  ExchangeRateSnapshot,
} from "./types";

/**
 * Input data for capturing calculation inputs
 *
 * AC3: Contains criteria version, prices snapshot, exchange rates
 */
export interface CaptureInputsData {
  criteriaVersionId: string;
  criteria: CriteriaConfig;
  prices: PriceSnapshot[];
  rates: ExchangeRateSnapshot[];
  assetIds: string[];
}

/**
 * Completion status for a calculation
 */
export type CompletionStatus = "success" | "partial" | "failed";

/**
 * Calculation Pipeline Orchestrator
 *
 * Provides a high-level API for orchestrating calculation events.
 * Ensures all events in a calculation share the same correlation_id.
 *
 * @example
 * ```typescript
 * const pipeline = new CalculationPipeline(eventStore);
 *
 * // Start calculation
 * const { correlationId, userId } = pipeline.start(userId, 'NYSE');
 *
 * // Capture inputs
 * await pipeline.captureInputs(correlationId, userId, {
 *   criteriaVersionId: 'v1',
 *   criteria: criteriaConfig,
 *   prices: priceSnapshots,
 *   rates: exchangeRates,
 *   assetIds: ['asset1', 'asset2'],
 * });
 *
 * // Record scores
 * await pipeline.recordScores(correlationId, userId, results);
 *
 * // Complete
 * await pipeline.complete(correlationId, userId, duration, assetCount, 'success');
 * ```
 */
export class CalculationPipeline {
  constructor(private eventStore: EventStore = defaultEventStore) {}

  /**
   * Starts a new calculation and emits CALC_STARTED event
   *
   * AC1: Emits CALC_STARTED event
   * AC2: Generates correlation_id linking all events
   *
   * @param userId - User ID for the calculation
   * @param market - Optional market identifier (e.g., 'NYSE', 'B3')
   * @returns Generated correlation ID
   */
  start(userId: string, market?: string): string {
    const correlationId = crypto.randomUUID();

    const event: CalcStartedEvent = {
      type: "CALC_STARTED",
      correlationId,
      userId,
      timestamp: new Date(),
      ...(market !== undefined && { market }),
    };

    // Fire and await in background - start is synchronous for correlationId return
    this.eventStore.append(userId, event).catch((error) => {
      logger.error("Failed to store CALC_STARTED event", {
        correlationId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    return correlationId;
  }

  /**
   * Starts a calculation and waits for the event to be stored
   *
   * Use this when you need to ensure the CALC_STARTED event is
   * persisted before continuing.
   *
   * @param userId - User ID for the calculation
   * @param market - Optional market identifier
   * @returns Generated correlation ID
   */
  async startAsync(userId: string, market?: string): Promise<string> {
    const correlationId = crypto.randomUUID();

    const event: CalcStartedEvent = {
      type: "CALC_STARTED",
      correlationId,
      userId,
      timestamp: new Date(),
      ...(market !== undefined && { market }),
    };

    await this.eventStore.append(userId, event);

    return correlationId;
  }

  /**
   * Captures all inputs needed for the calculation
   *
   * AC1: Emits INPUTS_CAPTURED event
   * AC2: Event linked by correlation_id
   * AC3: Stores criteria version, prices snapshot, exchange rates
   *
   * This event contains everything needed to replay the calculation.
   *
   * @param correlationId - Correlation ID from start()
   * @param userId - User ID for tenant isolation
   * @param inputs - All input data for the calculation
   */
  async captureInputs(
    correlationId: string,
    userId: string,
    inputs: CaptureInputsData
  ): Promise<void> {
    const event: InputsCapturedEvent = {
      type: "INPUTS_CAPTURED",
      correlationId,
      criteriaVersionId: inputs.criteriaVersionId,
      criteria: inputs.criteria,
      prices: inputs.prices,
      rates: inputs.rates,
      assetIds: inputs.assetIds,
    };

    await this.eventStore.append(userId, event);
  }

  /**
   * Records the computed scores for all assets
   *
   * AC1: Emits SCORES_COMPUTED event
   * AC2: Event linked by correlation_id
   *
   * @param correlationId - Correlation ID from start()
   * @param userId - User ID for tenant isolation
   * @param results - Array of score results for each asset
   */
  async recordScores(
    correlationId: string,
    userId: string,
    results: AssetScoreResult[]
  ): Promise<void> {
    const event: ScoresComputedEvent = {
      type: "SCORES_COMPUTED",
      correlationId,
      results,
    };

    await this.eventStore.append(userId, event);
  }

  /**
   * Marks the calculation as complete
   *
   * AC1: Emits CALC_COMPLETED event
   * AC2: Event linked by correlation_id
   *
   * @param correlationId - Correlation ID from start()
   * @param userId - User ID for tenant isolation
   * @param duration - Total duration in milliseconds
   * @param assetCount - Number of assets processed
   * @param status - Completion status: 'success', 'partial', or 'failed'
   * @param errorMessage - Optional error message if status is 'failed'
   */
  async complete(
    correlationId: string,
    userId: string,
    duration: number,
    assetCount: number,
    status: CompletionStatus,
    errorMessage?: string
  ): Promise<void> {
    const event: CalcCompletedEvent = {
      type: "CALC_COMPLETED",
      correlationId,
      duration,
      assetCount,
      status,
      ...(errorMessage !== undefined && { errorMessage }),
    };

    await this.eventStore.append(userId, event);
  }

  /**
   * Runs a complete calculation pipeline
   *
   * Convenience method that executes all 4 events in sequence.
   * Used primarily for testing and simple calculations.
   *
   * @param userId - User ID for the calculation
   * @param inputs - All input data
   * @param calculator - Function to compute scores from inputs
   * @param market - Optional market identifier
   * @returns Correlation ID and results
   */
  async runComplete(
    userId: string,
    inputs: CaptureInputsData,
    calculator: (inputs: CaptureInputsData) => AssetScoreResult[],
    market?: string
  ): Promise<{ correlationId: string; results: AssetScoreResult[] }> {
    const startTime = Date.now();

    // 1. Start
    const correlationId = await this.startAsync(userId, market);

    // 2. Capture inputs
    await this.captureInputs(correlationId, userId, inputs);

    // 3. Calculate and record scores
    let results: AssetScoreResult[] = [];
    let status: CompletionStatus = "success";
    let errorMessage: string | undefined;

    try {
      results = calculator(inputs);
      await this.recordScores(correlationId, userId, results);
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    // 4. Complete
    const duration = Date.now() - startTime;
    await this.complete(
      correlationId,
      userId,
      duration,
      inputs.assetIds.length,
      status,
      errorMessage
    );

    return { correlationId, results };
  }
}

/**
 * Default calculation pipeline instance using the default event store
 */
export const calculationPipeline = new CalculationPipeline();
