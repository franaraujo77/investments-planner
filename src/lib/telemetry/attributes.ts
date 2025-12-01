/**
 * Span Attribute Helpers Module
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC1: Job execution creates a span with: job name, user_id, duration, asset_count
 * AC2: Span attributes capture timing breakdown (fetch_rates_ms, fetch_prices_ms, compute_scores_ms)
 *
 * Provides type-safe helpers for setting span attributes,
 * especially timing attributes for performance breakdown.
 *
 * @module @/lib/telemetry/attributes
 */

import type { Span } from "@opentelemetry/api";
import { SpanAttributes } from "./tracer";

/**
 * Adds a timing attribute to a span
 *
 * AC2: Span attributes capture timing breakdown
 *
 * Calculates the duration from a start time to now and sets it as an attribute.
 * Uses Date.now() for simplicity and compatibility.
 *
 * @param span - The span to add the attribute to
 * @param name - Attribute name (e.g., 'fetch_rates_ms')
 * @param startTime - Start time from Date.now()
 *
 * @example
 * ```typescript
 * const t0 = Date.now();
 * const rates = await fetchRates();
 * addTimingAttribute(span, 'fetch_rates_ms', t0);
 * ```
 */
export function addTimingAttribute(
  span: Span,
  name: string,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  span.setAttribute(name, duration);
}

/**
 * Job attributes for bulk setting
 */
export interface JobAttributeValues {
  /** User ID (UUID) */
  userId?: string;
  /** Number of assets processed */
  assetCount?: number;
  /** Market identifier */
  market?: string;
  /** Total duration in milliseconds */
  durationMs?: number;
}

/**
 * Adds common job attributes to a span
 *
 * AC1: Job execution creates a span with: job name, user_id, duration, asset_count
 *
 * Sets multiple job-related attributes at once using the standard attribute keys.
 *
 * @param span - The span to add attributes to
 * @param attributes - Job attribute values to set
 *
 * @example
 * ```typescript
 * addJobAttributes(span, {
 *   userId: 'user-123',
 *   assetCount: 50,
 *   market: 'NYSE',
 *   durationMs: 1500
 * });
 * ```
 */
export function addJobAttributes(
  span: Span,
  attributes: JobAttributeValues
): void {
  if (attributes.userId !== undefined) {
    span.setAttribute(SpanAttributes.USER_ID, attributes.userId);
  }
  if (attributes.assetCount !== undefined) {
    span.setAttribute(SpanAttributes.ASSET_COUNT, attributes.assetCount);
  }
  if (attributes.market !== undefined) {
    span.setAttribute(SpanAttributes.MARKET, attributes.market);
  }
  if (attributes.durationMs !== undefined) {
    span.setAttribute(SpanAttributes.DURATION_MS, attributes.durationMs);
  }
}

/**
 * Timing breakdown attributes for overnight jobs
 */
export interface TimingBreakdown {
  /** Time spent fetching exchange rates (ms) */
  fetchRatesMs?: number;
  /** Time spent fetching asset prices (ms) */
  fetchPricesMs?: number;
  /** Time spent computing scores (ms) */
  computeScoresMs?: number;
  /** Total job duration (ms) */
  totalDurationMs?: number;
}

/**
 * Adds timing breakdown attributes to a span
 *
 * AC2: Span attributes capture timing breakdown
 *
 * Sets multiple timing attributes at once for performance analysis.
 * Per ADR-002, we use attributes for timing breakdown, not nested spans.
 *
 * @param span - The span to add attributes to
 * @param timing - Timing breakdown values
 *
 * @example
 * ```typescript
 * addTimingBreakdown(span, {
 *   fetchRatesMs: 150,
 *   fetchPricesMs: 800,
 *   computeScoresMs: 250,
 *   totalDurationMs: 1200
 * });
 * ```
 */
export function addTimingBreakdown(span: Span, timing: TimingBreakdown): void {
  if (timing.fetchRatesMs !== undefined) {
    span.setAttribute(SpanAttributes.FETCH_RATES_MS, timing.fetchRatesMs);
  }
  if (timing.fetchPricesMs !== undefined) {
    span.setAttribute(SpanAttributes.FETCH_PRICES_MS, timing.fetchPricesMs);
  }
  if (timing.computeScoresMs !== undefined) {
    span.setAttribute(SpanAttributes.COMPUTE_SCORES_MS, timing.computeScoresMs);
  }
  if (timing.totalDurationMs !== undefined) {
    span.setAttribute(SpanAttributes.TOTAL_DURATION_MS, timing.totalDurationMs);
  }
}

/**
 * Creates a timing tracker for measuring operation durations
 *
 * Provides a convenient API for tracking multiple timing measurements
 * and adding them all to a span at once.
 *
 * @param span - The span to track timing for
 * @returns Timing tracker with start/stop methods
 *
 * @example
 * ```typescript
 * const timer = createTimingTracker(span);
 *
 * timer.start('fetch_rates');
 * await fetchRates();
 * timer.stop('fetch_rates');
 *
 * timer.start('fetch_prices');
 * await fetchPrices();
 * timer.stop('fetch_prices');
 *
 * timer.finalize(); // Adds all timing attributes to span
 * ```
 */
export function createTimingTracker(span: Span): TimingTracker {
  return new TimingTracker(span);
}

/**
 * Timing tracker class for measuring multiple operations
 */
export class TimingTracker {
  private startTimes: Map<string, number> = new Map();
  private durations: Map<string, number> = new Map();
  private overallStart: number;

  constructor(private span: Span) {
    this.overallStart = Date.now();
  }

  /**
   * Starts timing for a named operation
   * @param name - Operation name (becomes attribute suffix)
   */
  start(name: string): void {
    this.startTimes.set(name, Date.now());
  }

  /**
   * Stops timing for a named operation and records duration
   * @param name - Operation name
   */
  stop(name: string): void {
    const startTime = this.startTimes.get(name);
    if (startTime !== undefined) {
      const duration = Date.now() - startTime;
      this.durations.set(name, duration);
      this.startTimes.delete(name);
    }
  }

  /**
   * Gets the duration for a completed operation
   * @param name - Operation name
   * @returns Duration in ms, or undefined if not tracked
   */
  getDuration(name: string): number | undefined {
    return this.durations.get(name);
  }

  /**
   * Adds all tracked durations as span attributes
   *
   * Each operation is added as `{name}_ms` attribute.
   * Also adds `total_duration_ms` for overall time.
   */
  finalize(): void {
    for (const [name, duration] of this.durations) {
      this.span.setAttribute(`${name}_ms`, duration);
    }
    this.span.setAttribute(
      SpanAttributes.TOTAL_DURATION_MS,
      Date.now() - this.overallStart
    );
  }
}
