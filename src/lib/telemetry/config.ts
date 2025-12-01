/**
 * Telemetry Configuration Module
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC4: Traces export to OTLP HTTP endpoint (configurable via OTEL_EXPORTER_OTLP_ENDPOINT)
 * AC5: Export is non-blocking (doesn't slow down jobs)
 *
 * Reads configuration from environment variables and provides
 * a typed configuration object for OpenTelemetry setup.
 *
 * @module @/lib/telemetry/config
 */

/**
 * Telemetry configuration interface
 *
 * Defines the configuration options for OpenTelemetry tracing.
 */
export interface TracerConfig {
  /** Service name used in traces */
  serviceName: string;
  /** OTLP HTTP endpoint URL. If undefined, export is disabled */
  endpoint: string | undefined;
  /** Whether telemetry is enabled (requires endpoint to be set) */
  enabled: boolean;
  /** Current environment (development, production, etc.) */
  environment: string;
  /** Service version from package.json or env */
  serviceVersion: string;
}

/**
 * Default service name for the application
 */
export const DEFAULT_SERVICE_NAME = "investments-planner";

/**
 * Default service version (fallback if not set via env)
 */
export const DEFAULT_SERVICE_VERSION = "0.1.0";

/**
 * Environment variable names used for configuration
 */
export const ENV_VARS = {
  /** OTLP HTTP endpoint URL */
  OTEL_EXPORTER_OTLP_ENDPOINT: "OTEL_EXPORTER_OTLP_ENDPOINT",
  /** Service name override */
  OTEL_SERVICE_NAME: "OTEL_SERVICE_NAME",
  /** Service version override */
  OTEL_SERVICE_VERSION: "OTEL_SERVICE_VERSION",
  /** Node environment */
  NODE_ENV: "NODE_ENV",
} as const;

/**
 * Gets the telemetry configuration from environment variables
 *
 * Configuration is read from:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP HTTP endpoint (required for export)
 * - OTEL_SERVICE_NAME: Service name (default: investments-planner)
 * - OTEL_SERVICE_VERSION: Service version (default: 0.1.0)
 * - NODE_ENV: Environment (default: development)
 *
 * If OTEL_EXPORTER_OTLP_ENDPOINT is not set, telemetry is disabled
 * to ensure graceful degradation per AC5.
 *
 * @returns TracerConfig - The resolved telemetry configuration
 *
 * @example
 * ```typescript
 * const config = getTracerConfig();
 * if (config.enabled) {
 *   // Initialize OpenTelemetry with config.endpoint
 * }
 * ```
 */
export function getTracerConfig(): TracerConfig {
  const endpoint = process.env[ENV_VARS.OTEL_EXPORTER_OTLP_ENDPOINT];
  const serviceName =
    process.env[ENV_VARS.OTEL_SERVICE_NAME] ?? DEFAULT_SERVICE_NAME;
  const serviceVersion =
    process.env[ENV_VARS.OTEL_SERVICE_VERSION] ?? DEFAULT_SERVICE_VERSION;
  const environment = process.env[ENV_VARS.NODE_ENV] ?? "development";

  // Telemetry is only enabled if endpoint is configured
  // This ensures graceful degradation when no collector is available
  const enabled = endpoint !== undefined && endpoint.trim() !== "";

  return {
    serviceName,
    endpoint,
    enabled,
    environment,
    serviceVersion,
  };
}

/**
 * Checks if telemetry is enabled based on current configuration
 *
 * @returns boolean - true if telemetry export is enabled
 */
export function isTelemetryEnabled(): boolean {
  return getTracerConfig().enabled;
}
