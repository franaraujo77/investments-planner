/**
 * Client-Side Fetch with Retry
 *
 * Provides a fetch wrapper with exponential backoff retry logic,
 * specifically handling rate limiting (429) responses.
 *
 * @module @/lib/utils/fetch-with-retry
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for retry behavior
 */
export interface FetchRetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelayMs?: number;
  /** HTTP status codes that should trigger a retry (default: [429, 503, 504]) */
  retryStatusCodes?: number[];
}

/**
 * Result of a fetch with retry operation
 */
export interface FetchRetryResult<T> {
  /** The response data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Whether the request succeeded */
  ok: boolean;
  /** HTTP status code */
  status: number;
  /** Number of retry attempts made */
  attempts: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_RETRY_CONFIG: Required<FetchRetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryStatusCodes: [429, 503, 504], // Rate limit, Service Unavailable, Gateway Timeout
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for a given retry attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffMultiplier: number,
  maxDelayMs: number,
  retryAfterHeader?: string | null
): number {
  // If server provided Retry-After header, respect it
  if (retryAfterHeader) {
    const retryAfterSeconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(retryAfterSeconds)) {
      return Math.min(retryAfterSeconds * 1000, maxDelayMs);
    }
  }

  // Otherwise use exponential backoff
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, maxDelayMs);
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Fetch with automatic retry and exponential backoff
 *
 * Handles rate limiting (429) and other transient errors with exponential backoff.
 * Respects Retry-After headers when present.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryConfig - Retry configuration
 * @returns Fetch result with data or error
 *
 * @example
 * ```typescript
 * const result = await fetchWithRetry<Portfolio>('/api/portfolios', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'My Portfolio' }),
 * });
 *
 * if (result.ok) {
 *   console.log('Created:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  retryConfig?: FetchRetryConfig
): Promise<FetchRetryResult<T>> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: string = "Unknown error";
  let lastStatus: number = 0;
  let attempts = 0;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    attempts = attempt;

    try {
      const response = await fetch(url, options);
      lastStatus = response.status;

      // Check if we should retry based on status code
      if (config.retryStatusCodes.includes(response.status) && attempt <= config.maxRetries) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = calculateDelay(
          attempt,
          config.initialDelayMs,
          config.backoffMultiplier,
          config.maxDelayMs,
          retryAfter
        );

        // Log retry in development
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console -- Dev-only logging for debugging retries
          console.warn(
            `[fetchWithRetry] ${response.status} response, retrying in ${delay}ms (attempt ${attempt}/${config.maxRetries})`
          );
        }

        await sleep(delay);
        continue;
      }

      // Parse response
      const result = await response.json();

      if (!response.ok) {
        return {
          error: result.error || `Request failed with status ${response.status}`,
          ok: false,
          status: response.status,
          attempts,
        };
      }

      return {
        data: result as T,
        ok: true,
        status: response.status,
        attempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      // Network errors should be retried
      if (attempt <= config.maxRetries) {
        const delay = calculateDelay(
          attempt,
          config.initialDelayMs,
          config.backoffMultiplier,
          config.maxDelayMs
        );

        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console -- Dev-only logging for debugging retries
          console.warn(
            `[fetchWithRetry] Network error, retrying in ${delay}ms (attempt ${attempt}/${config.maxRetries}):`,
            lastError
          );
        }

        await sleep(delay);
        continue;
      }
    }
  }

  // All retries exhausted
  return {
    error: lastError,
    ok: false,
    status: lastStatus,
    attempts,
  };
}

/**
 * Convenience function for JSON POST requests with retry
 */
export async function postWithRetry<T = unknown, D = unknown>(
  url: string,
  data: D,
  retryConfig?: FetchRetryConfig
): Promise<FetchRetryResult<T>> {
  return fetchWithRetry<T>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    retryConfig
  );
}
