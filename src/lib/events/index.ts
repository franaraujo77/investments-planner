/**
 * Events Module - Event Sourcing for Calculation Pipeline
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Implements ADR-002: Event-Sourced Calculations
 *
 * This module provides:
 * - Event store for persisting calculation events
 * - Pipeline orchestrator for managing event flow
 * - Replay function for deterministic verification
 * - Type definitions for all events
 *
 * @module @/lib/events
 */

// =============================================================================
// EVENT STORE
// =============================================================================

export { EventStore, eventStore, type StoredEvent } from "./event-store";

// =============================================================================
// CALCULATION PIPELINE
// =============================================================================

export {
  CalculationPipeline,
  calculationPipeline,
  type CaptureInputsData,
  type CompletionStatus,
} from "./calculation-pipeline";

// =============================================================================
// REPLAY
// =============================================================================

export { replay, replayBatch, type ReplayResult, type ScoringFunction } from "./replay";

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Supporting types
  PriceSnapshot,
  ExchangeRateSnapshot,
  CriteriaConfig,
  CriterionDefinition,
  CriterionScore,
  AssetScoreResult,
  // Event types
  CalcStartedEvent,
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcCompletedEvent,
  CalculationEvent,
  CalculationEventType,
} from "./types";

// =============================================================================
// TYPE GUARDS
// =============================================================================

export {
  isCalcStartedEvent,
  isInputsCapturedEvent,
  isScoresComputedEvent,
  isCalcCompletedEvent,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

export { CALCULATION_EVENT_TYPES } from "./types";
