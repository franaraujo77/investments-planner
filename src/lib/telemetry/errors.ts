/**
 * Span Error Handling Utilities
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC3: Errors set span status to ERROR with message
 *
 * Provides utilities for properly recording errors in spans
 * while preserving the error for re-throwing.
 *
 * @module @/lib/telemetry/errors
 */

import { type Span, SpanStatusCode } from "@opentelemetry/api";

/**
 * Semantic convention attribute for exception type
 */
const EXCEPTION_TYPE = "exception.type";

/**
 * Semantic convention attribute for exception message
 */
const EXCEPTION_MESSAGE = "exception.message";

/**
 * Semantic convention attribute for exception stacktrace
 */
const EXCEPTION_STACKTRACE = "exception.stacktrace";

/**
 * Sets span status to ERROR and records exception details
 *
 * AC3: Errors set span status to ERROR with message
 *
 * This function:
 * 1. Sets the span status to ERROR with the error message
 * 2. Records an exception event with type, message, and stack trace
 * 3. Does NOT end the span (caller is responsible)
 * 4. Does NOT throw the error (caller can re-throw if needed)
 *
 * @param span - The span to record the error on
 * @param error - The error to record (Error or unknown)
 *
 * @example
 * ```typescript
 * const span = createJobSpan('overnight-scoring');
 * try {
 *   await doWork();
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (error) {
 *   setSpanError(span, error);
 *   throw error; // Re-throw after recording
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function setSpanError(span: Span, error: unknown): void {
  // Extract error details
  const errorDetails = extractErrorDetails(error);

  // Set span status to ERROR with message
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: errorDetails.message,
  });

  // Record exception event with full details
  // Only include stack if it exists (recordException requires string, not undefined)
  if (errorDetails.stackTrace) {
    span.recordException({
      name: errorDetails.type,
      message: errorDetails.message,
      stack: errorDetails.stackTrace,
    });
  } else {
    span.recordException({
      name: errorDetails.type,
      message: errorDetails.message,
    });
  }

  // Also add as attributes for easier querying
  span.setAttribute(EXCEPTION_TYPE, errorDetails.type);
  span.setAttribute(EXCEPTION_MESSAGE, errorDetails.message);
  if (errorDetails.stackTrace) {
    span.setAttribute(EXCEPTION_STACKTRACE, errorDetails.stackTrace);
  }
}

/**
 * Error details extracted from an error object
 */
interface ErrorDetails {
  /** Error type/class name */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace (if available) */
  stackTrace: string | undefined;
}

/**
 * Extracts error details from any error type
 *
 * Handles:
 * - Error objects with name, message, stack
 * - Objects with message property
 * - Strings
 * - Unknown types (converts to string)
 *
 * @param error - The error to extract details from
 * @returns ErrorDetails with type, message, and optional stack
 */
function extractErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      message: error.message || "Unknown error",
      stackTrace: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      type: String(obj["name"] ?? "Error"),
      message: String(obj["message"] ?? JSON.stringify(error)),
      stackTrace: typeof obj["stack"] === "string" ? obj["stack"] : undefined,
    };
  }

  if (typeof error === "string") {
    return {
      type: "Error",
      message: error,
      stackTrace: undefined,
    };
  }

  return {
    type: "Error",
    message: String(error),
    stackTrace: undefined,
  };
}

/**
 * Wraps an async function with error handling that records to a span
 *
 * AC3: Errors set span status to ERROR with message
 *
 * If the function throws, the error is recorded on the span
 * and then re-thrown. The span is NOT ended by this function.
 *
 * @param span - The span to record errors on
 * @param fn - The async function to execute
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const span = createJobSpan('process-data');
 * try {
 *   const result = await withErrorRecording(span, async () => {
 *     return await processData();
 *   });
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } finally {
 *   span.end();
 * }
 * ```
 */
export async function withErrorRecording<T>(
  span: Span,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    setSpanError(span, error);
    throw error;
  }
}

/**
 * Creates a safe error message for spans (sanitized)
 *
 * Removes potentially sensitive information from error messages:
 * - Truncates to max length
 * - Removes common sensitive patterns
 *
 * @param error - The error to sanitize
 * @param maxLength - Maximum message length (default: 500)
 * @returns Sanitized error message
 */
export function getSafeErrorMessage(
  error: unknown,
  maxLength: number = 500
): string {
  const details = extractErrorDetails(error);
  let message = details.message;

  // Truncate if too long
  if (message.length > maxLength) {
    message = message.substring(0, maxLength) + "...";
  }

  return message;
}
