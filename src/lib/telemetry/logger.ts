/**
 * Structured Logger
 *
 * Production-ready logging utility with OpenTelemetry trace correlation.
 *
 * Features:
 * - Structured JSON output in production
 * - Human-readable output in development
 * - Trace ID correlation for distributed tracing
 * - Sensitive data redaction helpers
 *
 * @module @/lib/telemetry/logger
 */

import { trace } from "@opentelemetry/api";

// =============================================================================
// TYPES
// =============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: string | number | boolean | undefined | null;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const IS_TEST = process.env.NODE_ENV === "test";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gets current trace context for log correlation
 */
function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan();
  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Redacts email addresses for logging
 *
 * @example
 * redactEmail("user@example.com") // "use***@example.com"
 */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visibleChars = Math.min(3, local.length);
  return `${local.slice(0, visibleChars)}***@${domain}`;
}

/**
 * Redacts user ID for logging (shows first 8 chars)
 *
 * @example
 * redactUserId("550e8400-e29b-41d4-a716-446655440000") // "550e8400..."
 */
export function redactUserId(userId: string): string {
  return `${userId.slice(0, 8)}...`;
}

// =============================================================================
// CORE LOGGING
// =============================================================================

/**
 * Core log function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  // Skip debug logs in production unless explicitly enabled
  if (level === "debug" && !IS_DEVELOPMENT && !process.env.DEBUG) {
    return;
  }

  const { traceId, spanId } = getTraceContext();

  // In test mode, suppress logs unless explicitly enabled
  if (IS_TEST && !process.env.LOG_IN_TESTS) {
    return;
  }

  // Development: human-readable format
  if (IS_DEVELOPMENT) {
    const prefix = `[${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const traceStr = traceId ? ` [trace:${traceId.slice(0, 8)}]` : "";

    switch (level) {
      case "debug":
        console.debug(`${prefix}${traceStr} ${message}${contextStr}`);
        break;
      case "info":
        console.info(`${prefix}${traceStr} ${message}${contextStr}`);
        break;
      case "warn":
        console.warn(`${prefix}${traceStr} ${message}${contextStr}`);
        break;
      case "error":
        console.error(`${prefix}${traceStr} ${message}${contextStr}`);
        break;
    }
    return;
  }

  // Production: structured JSON
  // Build entry conditionally to satisfy exactOptionalPropertyTypes
  const logEntry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(traceId !== undefined && { traceId }),
    ...(spanId !== undefined && { spanId }),
    ...context,
  };

  // Use appropriate console method for log level
  const output = JSON.stringify(logEntry);
  switch (level) {
    case "debug":
    case "info":
      console.log(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Structured logger with trace correlation
 *
 * @example
 * ```typescript
 * import { logger, redactEmail } from "@/lib/telemetry/logger";
 *
 * logger.info("User logged in", { email: redactEmail(user.email) });
 * logger.error("Failed to process", { error: err.message });
 * ```
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
