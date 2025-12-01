/**
 * Example: Instrumented Job Pattern
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * Reference implementation showing the complete job-level span pattern.
 *
 * This example demonstrates:
 * - AC1: Job execution creates a span with: job name, user_id, duration, asset_count
 * - AC2: Span attributes capture timing breakdown
 * - AC3: Errors set span status to ERROR with message
 *
 * Per ADR-002: Use job-level spans with attributes for timing breakdown,
 * NOT nested spans per operation.
 *
 * @example
 * // Use as a reference pattern for real job implementations
 * import { withSpan, addTimingAttribute, setSpanError } from '@/lib/telemetry';
 *
 * @module @/lib/telemetry/examples
 */

import {
  withSpan,
  createJobSpan,
  addTimingAttribute,
  addJobAttributes,
  addTimingBreakdown,
  setSpanError,
  createTimingTracker,
  SpanAttributes,
  SpanStatusCode,
  type Span,
} from "@/lib/telemetry";

// =============================================================================
// PATTERN 1: Using withSpan helper (RECOMMENDED)
// =============================================================================

/**
 * Example overnight job using the withSpan helper
 *
 * This is the RECOMMENDED pattern for most jobs.
 * The helper automatically handles span lifecycle and error recording.
 *
 * @param userId - User ID to process
 * @returns Computed scores
 */
export async function runOvernightJobWithHelper(
  userId: string
): Promise<unknown[]> {
  // withSpan creates span, handles errors, and ends span automatically
  return withSpan(
    "overnight-scoring",
    async (span: Span) => {
      // AC1: Set job attributes
      span.setAttribute(SpanAttributes.USER_ID, userId);

      // AC2: Capture timing breakdown using attributes (not nested spans)
      const t0 = Date.now();

      // Fetch exchange rates
      const rates = await mockFetchExchangeRates();
      addTimingAttribute(span, SpanAttributes.FETCH_RATES_MS, t0);

      // Fetch prices
      const t1 = Date.now();
      const prices = await mockFetchPrices();
      addTimingAttribute(span, SpanAttributes.FETCH_PRICES_MS, t1);

      // Set asset count after fetching
      span.setAttribute(SpanAttributes.ASSET_COUNT, prices.length);

      // Compute scores
      const t2 = Date.now();
      const scores = await mockComputeScores(prices, rates);
      addTimingAttribute(span, SpanAttributes.COMPUTE_SCORES_MS, t2);

      // Total duration
      span.setAttribute(SpanAttributes.TOTAL_DURATION_MS, Date.now() - t0);

      // Span status is automatically set to OK by withSpan on success
      return scores;
    },
    { userId } // Initial attributes
  );
}

// =============================================================================
// PATTERN 2: Manual span management (for complex flows)
// =============================================================================

/**
 * Example overnight job with manual span management
 *
 * Use this pattern when you need more control over the span lifecycle,
 * such as when the span needs to be passed to multiple functions.
 *
 * @param userId - User ID to process
 * @param market - Market identifier
 * @returns Computed scores
 */
export async function runOvernightJobManual(
  userId: string,
  market: string
): Promise<unknown[]> {
  // Create span manually
  const span = createJobSpan("overnight-scoring", {
    userId,
    market,
  });

  try {
    // Use timing tracker for cleaner code
    const timer = createTimingTracker(span);

    // Fetch exchange rates
    timer.start("fetch_rates");
    const rates = await mockFetchExchangeRates();
    timer.stop("fetch_rates");

    // Fetch prices
    timer.start("fetch_prices");
    const prices = await mockFetchPrices();
    timer.stop("fetch_prices");

    // Update asset count
    addJobAttributes(span, { assetCount: prices.length });

    // Compute scores
    timer.start("compute_scores");
    const scores = await mockComputeScores(prices, rates);
    timer.stop("compute_scores");

    // Finalize timing (adds all timing attributes to span)
    timer.finalize();

    // Set success status
    span.setStatus({ code: SpanStatusCode.OK });

    return scores;
  } catch (error) {
    // AC3: Record error on span
    setSpanError(span, error);
    throw error;
  } finally {
    // ALWAYS end the span
    span.end();
  }
}

// =============================================================================
// PATTERN 3: Bulk attribute setting
// =============================================================================

/**
 * Example showing bulk attribute setting
 *
 * Use this pattern when you have all timing information available at once.
 *
 * @param userId - User ID to process
 * @returns Computed scores
 */
export async function runOvernightJobBulk(userId: string): Promise<unknown[]> {
  const span = createJobSpan("overnight-scoring", { userId });

  try {
    const startTime = Date.now();

    // Do all the work and track timings
    const t0 = Date.now();
    const rates = await mockFetchExchangeRates();
    const fetchRatesMs = Date.now() - t0;

    const t1 = Date.now();
    const prices = await mockFetchPrices();
    const fetchPricesMs = Date.now() - t1;

    const t2 = Date.now();
    const scores = await mockComputeScores(prices, rates);
    const computeScoresMs = Date.now() - t2;

    // Set all attributes at once
    addJobAttributes(span, {
      assetCount: prices.length,
      durationMs: Date.now() - startTime,
    });

    addTimingBreakdown(span, {
      fetchRatesMs,
      fetchPricesMs,
      computeScoresMs,
      totalDurationMs: Date.now() - startTime,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return scores;
  } catch (error) {
    setSpanError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

// =============================================================================
// MOCK FUNCTIONS (for example purposes)
// =============================================================================

async function mockFetchExchangeRates(): Promise<Record<string, number>> {
  // Simulate network latency
  await sleep(50);
  return { "USD/BRL": 5.0, "EUR/BRL": 5.5 };
}

async function mockFetchPrices(): Promise<Array<{ symbol: string; price: number }>> {
  // Simulate network latency
  await sleep(100);
  return [
    { symbol: "PETR4", price: 35.5 },
    { symbol: "VALE3", price: 68.2 },
    { symbol: "ITUB4", price: 32.1 },
  ];
}

async function mockComputeScores(
  _prices: Array<{ symbol: string; price: number }>,
  _rates: Record<string, number>
): Promise<Array<{ symbol: string; score: number }>> {
  // Simulate computation
  await sleep(30);
  return [
    { symbol: "PETR4", score: 85 },
    { symbol: "VALE3", score: 72 },
    { symbol: "ITUB4", score: 68 },
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
