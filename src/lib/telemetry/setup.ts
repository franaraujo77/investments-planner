/**
 * OpenTelemetry SDK Setup Module
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC4: Traces export to OTLP HTTP endpoint (configurable)
 * AC5: Export is non-blocking (doesn't slow down jobs)
 *
 * Initializes the OpenTelemetry SDK with:
 * - OTLP HTTP exporter for trace export
 * - BatchSpanProcessor for non-blocking export
 * - Resource attributes for service identification
 *
 * @module @/lib/telemetry/setup
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { getTracerConfig, type TracerConfig } from "./config";

/**
 * Singleton flag to ensure SDK is only initialized once
 */
let isInitialized = false;

/**
 * Reference to the SDK instance for shutdown
 */
let sdkInstance: NodeSDK | null = null;

/**
 * Creates the OpenTelemetry Resource with service attributes
 *
 * @param config - Telemetry configuration
 * @returns Resource with service metadata
 */
function createResource(config: TracerConfig): Resource {
  return new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
  });
}

/**
 * Creates the OTLP HTTP trace exporter
 *
 * Configured with:
 * - 10 second timeout (fire-and-forget pattern)
 * - Configurable endpoint from environment
 *
 * @param endpoint - OTLP HTTP endpoint URL
 * @returns Configured OTLPTraceExporter
 */
function createExporter(endpoint: string): OTLPTraceExporter {
  return new OTLPTraceExporter({
    url: endpoint,
    // 10 second timeout - if export takes longer, we don't block
    timeoutMillis: 10000,
  });
}

/**
 * Creates the BatchSpanProcessor for non-blocking export
 *
 * AC5: Export is non-blocking (doesn't slow down jobs)
 *
 * Configured with:
 * - 5 second export interval
 * - 512 span queue size
 * - 30 second export timeout
 *
 * These settings ensure spans are batched and exported
 * asynchronously without blocking job execution.
 *
 * @param exporter - The trace exporter to use
 * @returns Configured BatchSpanProcessor
 */
function createSpanProcessor(exporter: OTLPTraceExporter): BatchSpanProcessor {
  return new BatchSpanProcessor(exporter, {
    // Export every 5 seconds or when queue is full
    scheduledDelayMillis: 5000,
    // Maximum number of spans to queue before forcing export
    maxQueueSize: 512,
    // Maximum number of spans per export batch
    maxExportBatchSize: 512,
    // Export timeout - if exceeded, spans are dropped (non-blocking)
    exportTimeoutMillis: 30000,
  });
}

/**
 * Sets up OpenTelemetry SDK with OTLP HTTP exporter
 *
 * This function:
 * 1. Reads configuration from environment variables
 * 2. If enabled, initializes the NodeSDK with BatchSpanProcessor
 * 3. Registers shutdown handlers for graceful termination
 *
 * Safe to call multiple times - only initializes once.
 *
 * @example
 * ```typescript
 * // In instrumentation.ts
 * export async function register() {
 *   setupTelemetry();
 * }
 * ```
 */
export function setupTelemetry(): void {
  // Prevent double initialization
  if (isInitialized) {
    return;
  }

  const config = getTracerConfig();

  // Graceful degradation: if not enabled, skip setup silently
  if (!config.enabled || !config.endpoint) {
    console.log(
      "[telemetry] Telemetry disabled: OTEL_EXPORTER_OTLP_ENDPOINT not set"
    );
    isInitialized = true;
    return;
  }

  try {
    const resource = createResource(config);
    const exporter = createExporter(config.endpoint);
    const spanProcessor = createSpanProcessor(exporter);

    // Initialize the SDK with our configuration
    sdkInstance = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
    });

    // Start the SDK
    sdkInstance.start();

    console.log(
      `[telemetry] OpenTelemetry initialized: ${config.serviceName} -> ${config.endpoint}`
    );

    // Register shutdown handlers for graceful termination
    registerShutdownHandlers();

    isInitialized = true;
  } catch (error) {
    // Log error but don't throw - telemetry failure shouldn't break the app
    console.error("[telemetry] Failed to initialize OpenTelemetry:", error);
    isInitialized = true; // Mark as initialized to prevent retry loops
  }
}

/**
 * Registers process shutdown handlers for graceful SDK shutdown
 *
 * Ensures all pending spans are flushed before process exit.
 */
function registerShutdownHandlers(): void {
  const shutdown = async () => {
    if (sdkInstance) {
      try {
        await sdkInstance.shutdown();
        console.log("[telemetry] OpenTelemetry SDK shut down successfully");
      } catch (error) {
        console.error("[telemetry] Error shutting down SDK:", error);
      }
    }
  };

  // Handle various termination signals
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Handle uncaught exceptions - try to flush spans
  process.on("beforeExit", shutdown);
}

/**
 * Shuts down the OpenTelemetry SDK
 *
 * Flushes any pending spans and releases resources.
 * Safe to call even if SDK was never initialized.
 *
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdkInstance) {
    await sdkInstance.shutdown();
    sdkInstance = null;
    isInitialized = false;
  }
}

/**
 * Checks if the SDK has been initialized
 *
 * @returns true if setupTelemetry() has been called
 */
export function isSetupComplete(): boolean {
  return isInitialized;
}
