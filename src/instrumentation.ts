/**
 * Next.js Instrumentation Hook
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC4: Traces export to OTLP HTTP endpoint (configurable)
 *
 * This file is automatically loaded by Next.js at startup.
 * It initializes OpenTelemetry for server-side tracing.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * @module instrumentation
 */

/**
 * Register function called by Next.js during server startup
 *
 * This function:
 * 1. Guards against client-side execution (server only)
 * 2. Initializes OpenTelemetry SDK
 * 3. Ensures initialization happens only once
 *
 * @example
 * // Next.js automatically calls this during server startup
 * // No manual invocation required
 */
export async function register(): Promise<void> {
  // Only initialize on the server (Node.js runtime)
  // Skip in Edge runtime and client-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to ensure this only loads on server
    const { setupTelemetry } = await import("@/lib/telemetry/setup");
    setupTelemetry();
  }
}
