/**
 * Retry Utility
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.4: Retry Logic Applied
 *
 * Implements retry logic with exponential backoff for provider requests.
 * - 3 attempts with exponential backoff (1s, 2s, 4s)
 * - Each retry attempt is logged with attempt number
 * - Final failure is logged with all attempt details
 *
 * @module @/lib/providers/retry
 */

import { logger } from "@/lib/telemetry/logger";
import {
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ProviderError,
  PROVIDER_ERROR_CODES,
} from "./types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for retry operation
 */
export interface RetryOptions extends Partial<RetryConfig> {
  /** Operation name for logging */
  operationName?: string;
  /** Provider name for logging and error context */
  providerName?: string;
}

/**
 * Details of a single retry attempt
 */
interface AttemptDetail {
  attempt: number;
  error: string;
  duration: number;
}

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
 * Create a timeout promise that rejects after specified milliseconds
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Race operation against timeout
 */
async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([operation, createTimeout(timeoutMs)]);
}

// =============================================================================
// RETRY IMPLEMENTATION
// =============================================================================

/**
 * Execute an async operation with retry logic
 *
 * AC-6.1.4: Retry Logic Applied
 * - 3 attempts with exponential backoff (1s, 2s, 4s)
 * - Each retry attempt is logged with attempt number
 * - Final failure is logged with all attempt details
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws ProviderError if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchPrices(symbols),
 *   { providerName: 'gemini', operationName: 'fetchPrices' }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config: RetryConfig = {
    maxAttempts: options.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
    backoffMs: options.backoffMs ?? DEFAULT_RETRY_CONFIG.backoffMs,
    timeoutMs: options.timeoutMs ?? DEFAULT_RETRY_CONFIG.timeoutMs,
  };

  const operationName = options.operationName ?? "operation";
  const providerName = options.providerName ?? "unknown";

  const attemptDetails: AttemptDetail[] = [];
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const attemptStart = Date.now();

    try {
      // Execute operation with timeout
      const result = await withTimeout(operation(), config.timeoutMs);

      // Success - log if this was a retry
      if (attempt > 1) {
        logger.info("Retry succeeded", {
          provider: providerName,
          operation: operationName,
          attempt,
          totalAttempts: config.maxAttempts,
          previousFailures: attempt - 1,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - attemptStart;
      const errorMessage = error instanceof Error ? error.message : String(error);

      lastError = error instanceof Error ? error : new Error(String(error));

      // Record attempt details
      attemptDetails.push({
        attempt,
        error: errorMessage,
        duration,
      });

      // Log each retry attempt with attempt number (AC-6.1.4)
      logger.warn("Provider request failed", {
        provider: providerName,
        operation: operationName,
        attempt,
        maxAttempts: config.maxAttempts,
        errorMessage,
        durationMs: duration,
      });

      // If we have more attempts, wait before retrying
      if (attempt < config.maxAttempts) {
        // Get backoff delay for this attempt (0-indexed)
        const backoffIndex = Math.min(attempt - 1, config.backoffMs.length - 1);
        const backoffDelay = config.backoffMs[backoffIndex] ?? 1000;

        logger.info("Retrying after backoff", {
          provider: providerName,
          operation: operationName,
          nextAttempt: attempt + 1,
          maxAttempts: config.maxAttempts,
          backoffMs: backoffDelay,
        });

        await sleep(backoffDelay);
      }
    }
  }

  // All retries exhausted - log final failure with all attempt details (AC-6.1.4)
  logger.error("All retry attempts failed", {
    provider: providerName,
    operation: operationName,
    totalAttempts: config.maxAttempts,
    attemptDetails: JSON.stringify(attemptDetails),
    finalError: lastError?.message ?? "Unknown error",
  });

  // Throw ProviderError with all details
  throw new ProviderError(
    `${operationName} failed after ${config.maxAttempts} attempts: ${lastError?.message ?? "Unknown error"}`,
    PROVIDER_ERROR_CODES.PROVIDER_FAILED,
    providerName,
    {
      attempts: attemptDetails,
      totalAttempts: config.maxAttempts,
    }
  );
}

/**
 * Create a retry wrapper with pre-configured options
 *
 * Useful for creating provider-specific retry functions
 *
 * @example
 * ```typescript
 * const geminiRetry = createRetryWrapper({ providerName: 'gemini' });
 * const result = await geminiRetry(() => fetchPrices(symbols), 'fetchPrices');
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return function <T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    const effectiveOperationName = operationName ?? defaultOptions.operationName;
    return withRetry(operation, {
      ...defaultOptions,
      ...(effectiveOperationName !== undefined && { operationName: effectiveOperationName }),
    });
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_RETRY_CONFIG };
export type { RetryConfig };
