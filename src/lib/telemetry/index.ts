/**
 * Telemetry Module - OpenTelemetry Instrumentation
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * Implements ADR-002: Event-Sourced Calculations with OpenTelemetry
 *
 * This module provides:
 * - Tracer utilities for creating and managing spans
 * - Attribute helpers for timing breakdown
 * - Error handling utilities
 * - Configuration access
 *
 * Setup functions are NOT exported - they are internal and called
 * automatically via Next.js instrumentation.ts
 *
 * @module @/lib/telemetry
 */

// =============================================================================
// TRACER UTILITIES
// =============================================================================

export {
  getTracer,
  createJobSpan,
  withSpan,
  wrapWithSpan,
  SpanAttributes,
  type JobSpanAttributes,
  type WithSpanCallback,
  type SpanAttributeKey,
} from "./tracer";

// =============================================================================
// ATTRIBUTE HELPERS
// =============================================================================

export {
  addTimingAttribute,
  addJobAttributes,
  addTimingBreakdown,
  createTimingTracker,
  TimingTracker,
  type JobAttributeValues,
  type TimingBreakdown,
} from "./attributes";

// =============================================================================
// ERROR HANDLING
// =============================================================================

export { setSpanError, withErrorRecording, getSafeErrorMessage } from "./errors";

// =============================================================================
// CONFIGURATION (Read-only access)
// =============================================================================

export {
  getTracerConfig,
  isTelemetryEnabled,
  DEFAULT_SERVICE_NAME,
  DEFAULT_SERVICE_VERSION,
  ENV_VARS,
  type TracerConfig,
} from "./config";

// =============================================================================
// RE-EXPORTS FROM OPENTELEMETRY API (Convenience)
// =============================================================================

export { SpanStatusCode, type Span } from "@opentelemetry/api";

// =============================================================================
// NOTE: Setup functions are NOT exported
// =============================================================================
// setupTelemetry() and shutdownTelemetry() are internal.
// They are called automatically via src/instrumentation.ts
// which Next.js loads at server startup.
//
// If you need to check if telemetry is initialized:
//   import { isTelemetryEnabled } from '@/lib/telemetry';
//   if (isTelemetryEnabled()) { ... }
// =============================================================================
