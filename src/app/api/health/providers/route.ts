/**
 * Provider Health Check API Route
 *
 * GET /api/health/providers
 *
 * Returns the health status of all configured providers without exposing
 * sensitive configuration details like API keys.
 *
 * Response (200):
 * {
 *   "data": {
 *     "providers": {
 *       "gemini-api": {
 *         "configured": true,
 *         "circuitState": "closed",
 *         "consecutiveFailures": 0
 *       },
 *       "yahoo-finance": {
 *         "configured": false,
 *         "circuitState": "closed",
 *         "consecutiveFailures": 0
 *       }
 *     },
 *     "timestamp": "2025-12-11T10:00:00Z"
 *   }
 * }
 *
 * @module @/app/api/health/providers
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/telemetry/logger";
import { isEnvSet } from "@/lib/utils/env";
import { circuitBreakerRegistry, type CircuitState } from "@/lib/providers/circuit-breaker";

// =============================================================================
// TYPES
// =============================================================================

interface ProviderStatus {
  /** Whether the provider has required configuration (API key, etc.) */
  configured: boolean;
  /** Current circuit breaker state */
  circuitState: CircuitState;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** When the circuit will transition to half-open (if open) */
  nextAttemptAt?: string;
}

interface HealthResponse {
  data: {
    providers: Record<string, ProviderStatus>;
    timestamp: string;
  };
}

// =============================================================================
// PROVIDER CONFIGURATION MAP
// =============================================================================

/**
 * Map of provider names to their required environment variables
 *
 * This allows the health check to verify if providers are properly configured
 * without exposing the actual API key values.
 */
const PROVIDER_CONFIG_MAP: Record<string, string[]> = {
  "gemini-api": ["GEMINI_API_KEY"],
  "yahoo-finance": ["YAHOO_FINANCE_API_KEY"],
  "exchangerate-api": ["EXCHANGE_RATE_API_KEY"],
  "open-exchange-rates": ["OPEN_EXCHANGE_RATES_APP_ID"],
};

// =============================================================================
// GET /api/health/providers
// =============================================================================

/**
 * GET /api/health/providers
 *
 * Returns health status for all providers including:
 * - Configuration status (without exposing keys)
 * - Circuit breaker state
 * - Failure counts
 *
 * This endpoint is intentionally public (no auth) for monitoring tools.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  logger.debug("Provider health check requested");

  const providers: Record<string, ProviderStatus> = {};

  // Check each provider's configuration and circuit state
  for (const [providerName, requiredEnvVars] of Object.entries(PROVIDER_CONFIG_MAP)) {
    // Check if all required env vars are set
    const configured = requiredEnvVars.every((envVar) => isEnvSet(envVar));

    // Get circuit breaker state (creates one if doesn't exist)
    const breaker = circuitBreakerRegistry.getBreaker(providerName);
    const circuitState = breaker.getState();

    const status: ProviderStatus = {
      configured,
      circuitState: circuitState.state,
      consecutiveFailures: circuitState.failures,
    };

    // Add next attempt time if circuit is open
    if (circuitState.nextAttemptAt) {
      status.nextAttemptAt = circuitState.nextAttemptAt.toISOString();
    }

    providers[providerName] = status;
  }

  // Log summary for monitoring
  const configuredCount = Object.values(providers).filter((p) => p.configured).length;
  const openCircuits = Object.entries(providers)
    .filter(([, p]) => p.circuitState === "open")
    .map(([name]) => name);

  logger.info("Provider health check completed", {
    totalProviders: Object.keys(providers).length,
    configuredProviders: configuredCount,
    openCircuits: openCircuits.length > 0 ? openCircuits.join(",") : "none",
  });

  return NextResponse.json<HealthResponse>({
    data: {
      providers,
      timestamp: new Date().toISOString(),
    },
  });
}
