/**
 * Tracer Utilities Module
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC1: Job execution creates a span with: job name, user_id, duration, asset_count
 * AC2: Span attributes capture timing breakdown
 * AC3: Errors set span status to ERROR with message
 *
 * Provides helper functions for creating and managing spans
 * in a job-level instrumentation pattern (per ADR-002).
 *
 * @module @/lib/telemetry/tracer
 */

import {
  trace,
  Span,
  SpanStatusCode,
  type Tracer,
  type SpanOptions,
  type Attributes,
} from "@opentelemetry/api";
import { DEFAULT_SERVICE_NAME } from "./config";

/**
 * Standard attribute keys for job spans
 *
 * These follow OpenTelemetry semantic conventions where applicable.
 * Custom attributes use snake_case for consistency.
 */
export const SpanAttributes = {
  /** Job/operation name */
  JOB_NAME: "job.name",
  /** User ID (UUID) */
  USER_ID: "user.id",
  /** Number of assets processed */
  ASSET_COUNT: "asset.count",
  /** Market identifier (e.g., 'NYSE', 'B3') */
  MARKET: "market",
  /** Total job duration in milliseconds */
  DURATION_MS: "duration_ms",
  /** Time spent fetching exchange rates (ms) */
  FETCH_RATES_MS: "fetch_rates_ms",
  /** Time spent fetching asset prices (ms) */
  FETCH_PRICES_MS: "fetch_prices_ms",
  /** Time spent computing scores (ms) */
  COMPUTE_SCORES_MS: "compute_scores_ms",
  /** Total duration in milliseconds */
  TOTAL_DURATION_MS: "total_duration_ms",
} as const;

/**
 * Type for span attribute keys
 */
export type SpanAttributeKey = (typeof SpanAttributes)[keyof typeof SpanAttributes];

/**
 * Gets a tracer instance with the specified name
 *
 * @param name - Tracer name (default: service name from config)
 * @returns OpenTelemetry Tracer instance
 *
 * @example
 * ```typescript
 * const tracer = getTracer('overnight-scoring');
 * tracer.startSpan('process-user');
 * ```
 */
export function getTracer(name: string = DEFAULT_SERVICE_NAME): Tracer {
  return trace.getTracer(name);
}

/**
 * Job attributes for span creation
 */
export interface JobSpanAttributes {
  /** User ID being processed */
  userId?: string;
  /** Number of assets */
  assetCount?: number;
  /** Market identifier */
  market?: string;
  /** Additional custom attributes */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Creates a new span for a job operation
 *
 * AC1: Job execution creates a span with: job name, user_id, duration, asset_count
 *
 * @param name - Span name (typically the job name)
 * @param attributes - Initial span attributes
 * @param options - Additional span options
 * @returns The created Span
 *
 * @example
 * ```typescript
 * const span = createJobSpan('overnight-scoring', {
 *   userId: 'user-123',
 *   assetCount: 50,
 *   market: 'NYSE'
 * });
 * try {
 *   // ... do work
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createJobSpan(
  name: string,
  attributes?: JobSpanAttributes,
  options?: SpanOptions
): Span {
  const tracer = getTracer();

  // Convert JobSpanAttributes to OpenTelemetry Attributes
  const spanAttrs: Attributes = {
    [SpanAttributes.JOB_NAME]: name,
  };

  if (attributes) {
    if (attributes.userId !== undefined) {
      spanAttrs[SpanAttributes.USER_ID] = attributes.userId;
    }
    if (attributes.assetCount !== undefined) {
      spanAttrs[SpanAttributes.ASSET_COUNT] = attributes.assetCount;
    }
    if (attributes.market !== undefined) {
      spanAttrs[SpanAttributes.MARKET] = attributes.market;
    }

    // Add any additional custom attributes
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && !["userId", "assetCount", "market"].includes(key)) {
        spanAttrs[key] = value;
      }
    }
  }

  return tracer.startSpan(name, {
    ...options,
    attributes: spanAttrs,
  });
}

/**
 * Result type for withSpan callback
 */
export type WithSpanCallback<T> = (span: Span) => Promise<T>;

/**
 * Executes an async function within a span context
 *
 * AC1: Job execution creates a span with job name
 * AC3: Errors set span status to ERROR
 *
 * This helper:
 * 1. Creates a span with the given name
 * 2. Executes the callback with span access
 * 3. Sets span status to OK on success
 * 4. Sets span status to ERROR on failure (preserves error)
 * 5. Always ends the span
 *
 * @param name - Span name
 * @param fn - Async function to execute within span context
 * @param attributes - Optional initial attributes
 * @returns Promise resolving to the callback result
 *
 * @example
 * ```typescript
 * const result = await withSpan('overnight-scoring', async (span) => {
 *   span.setAttribute('user.id', userId);
 *
 *   const t0 = Date.now();
 *   const rates = await fetchRates();
 *   span.setAttribute('fetch_rates_ms', Date.now() - t0);
 *
 *   return computeScores(rates);
 * });
 * ```
 */
export async function withSpan<T>(
  name: string,
  fn: WithSpanCallback<T>,
  attributes?: JobSpanAttributes
): Promise<T> {
  const span = createJobSpan(name, attributes);

  try {
    const result = await fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    // AC3: Errors set span status to ERROR with message
    const message = error instanceof Error ? error.message : String(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Wraps a function to automatically create a span around its execution
 *
 * Useful for instrumenting existing functions without modifying them.
 *
 * @param name - Span name
 * @param fn - Function to wrap
 * @param attributes - Optional initial attributes
 * @returns Wrapped function that creates a span on each call
 *
 * @example
 * ```typescript
 * const instrumentedScoreJob = wrapWithSpan(
 *   'score-calculation',
 *   scoreCalculation,
 *   { market: 'NYSE' }
 * );
 *
 * // Each call creates a new span
 * await instrumentedScoreJob(userId, assets);
 * ```
 */
export function wrapWithSpan<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  attributes?: JobSpanAttributes
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return withSpan(name, () => fn(...args), attributes);
  };
}
