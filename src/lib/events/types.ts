/**
 * Event Sourcing Types for Calculation Pipeline
 *
 * Implements ADR-002: Event-Sourced Calculations
 *
 * All calculation steps are captured as immutable events, enabling:
 * - Perfect audit trail for regulatory/user disputes
 * - Replay capability for debugging and verification
 * - Complete transparency in calculation methodology
 *
 * Event Flow:
 * CALC_STARTED → INPUTS_CAPTURED → SCORES_COMPUTED → CALC_COMPLETED
 */

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

/**
 * Snapshot of asset price at calculation time
 */
export interface PriceSnapshot {
  assetId: string;
  symbol: string;
  price: string; // Stored as string to preserve Decimal precision
  currency: string;
  fetchedAt: Date;
  source: string;
}

/**
 * Snapshot of exchange rate at calculation time
 */
export interface ExchangeRateSnapshot {
  fromCurrency: string;
  toCurrency: string;
  rate: string; // Stored as string to preserve Decimal precision
  fetchedAt: Date;
  source: string;
}

/**
 * User-defined scoring criteria configuration
 */
export interface CriteriaConfig {
  id: string;
  version: string;
  name: string;
  criteria: CriterionDefinition[];
}

/**
 * Individual criterion definition
 */
export interface CriterionDefinition {
  id: string;
  name: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between";
  value: string | [string, string]; // Single value or range
  points: number;
  weight: number;
}

/**
 * Score breakdown for a single criterion
 */
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  rawValue: string;
  passed: boolean;
  pointsAwarded: number;
  maxPoints: number;
}

/**
 * Complete score result for an asset
 */
export interface AssetScoreResult {
  assetId: string;
  symbol: string;
  score: string; // Total score as string to preserve precision
  maxPossibleScore: string;
  percentage: string;
  breakdown: CriterionScore[];
}

// =============================================================================
// CALCULATION EVENTS (Discriminated Union)
// =============================================================================

/**
 * Event: Calculation started
 *
 * Emitted when overnight scoring job begins for a user
 */
export interface CalcStartedEvent {
  type: "CALC_STARTED";
  correlationId: string;
  userId: string;
  timestamp: Date;
  market?: string;
}

/**
 * Event: All inputs captured
 *
 * Emitted after all data is fetched and ready for calculation.
 * This single event captures everything needed for replay.
 */
export interface InputsCapturedEvent {
  type: "INPUTS_CAPTURED";
  correlationId: string;
  criteriaVersionId: string;
  criteria: CriteriaConfig;
  prices: PriceSnapshot[];
  rates: ExchangeRateSnapshot[];
  assetIds: string[];
}

/**
 * Event: Scores computed
 *
 * Emitted after all asset scores are calculated
 */
export interface ScoresComputedEvent {
  type: "SCORES_COMPUTED";
  correlationId: string;
  results: AssetScoreResult[];
}

/**
 * Event: Calculation completed
 *
 * Emitted when scoring job finishes (success, partial, or failed)
 */
export interface CalcCompletedEvent {
  type: "CALC_COMPLETED";
  correlationId: string;
  duration: number; // milliseconds
  assetCount: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
}

/**
 * Discriminated union of all calculation events
 *
 * Use this type when working with events from the calculation_events table
 */
export type CalculationEvent =
  | CalcStartedEvent
  | InputsCapturedEvent
  | ScoresComputedEvent
  | CalcCompletedEvent;

// =============================================================================
// EVENT TYPE GUARDS
// =============================================================================

export function isCalcStartedEvent(event: CalculationEvent): event is CalcStartedEvent {
  return event.type === "CALC_STARTED";
}

export function isInputsCapturedEvent(event: CalculationEvent): event is InputsCapturedEvent {
  return event.type === "INPUTS_CAPTURED";
}

export function isScoresComputedEvent(event: CalculationEvent): event is ScoresComputedEvent {
  return event.type === "SCORES_COMPUTED";
}

export function isCalcCompletedEvent(event: CalculationEvent): event is CalcCompletedEvent {
  return event.type === "CALC_COMPLETED";
}

// =============================================================================
// EVENT CONSTANTS
// =============================================================================

export const CALCULATION_EVENT_TYPES = [
  "CALC_STARTED",
  "INPUTS_CAPTURED",
  "SCORES_COMPUTED",
  "CALC_COMPLETED",
] as const;

export type CalculationEventType = (typeof CALCULATION_EVENT_TYPES)[number];
