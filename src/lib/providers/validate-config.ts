/**
 * Provider Configuration Validation
 *
 * Validates that required API keys are configured for production environments.
 * Logs warnings when mock providers will be used due to missing configuration.
 *
 * @module @/lib/providers/validate-config
 */

import { logger } from "@/lib/telemetry/logger";
import { isEnvSet } from "@/lib/utils/env";

// =============================================================================
// TYPES
// =============================================================================

interface ProviderConfigStatus {
  name: string;
  envVar: string;
  configured: boolean;
  required: boolean;
  description: string;
  getKeyUrl: string;
}

interface ValidationResult {
  isProduction: boolean;
  usingMockProviders: boolean;
  providers: ProviderConfigStatus[];
  warnings: string[];
}

// =============================================================================
// PROVIDER REQUIREMENTS
// =============================================================================

/**
 * Provider configuration requirements
 *
 * Each provider has:
 * - envVar: The environment variable that enables it
 * - required: Whether it's needed for core functionality
 * - description: What data it provides
 * - getKeyUrl: Where to get the API key
 */
const PROVIDER_REQUIREMENTS: Omit<ProviderConfigStatus, "configured">[] = [
  {
    name: "Gemini API",
    envVar: "GEMINI_API_KEY",
    required: true,
    description: "Stock prices, fundamentals (P/E, dividend yield, market cap)",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    name: "ExchangeRate-API",
    envVar: "EXCHANGE_RATE_API_KEY",
    required: true,
    description: "Currency exchange rates for portfolio valuation",
    getKeyUrl: "https://www.exchangerate-api.com/",
  },
  {
    name: "Yahoo Finance",
    envVar: "YAHOO_FINANCE_API_KEY",
    required: false,
    description: "Fallback price provider",
    getKeyUrl: "https://rapidapi.com/apidojo/api/yahoo-finance1",
  },
  {
    name: "Open Exchange Rates",
    envVar: "OPEN_EXCHANGE_RATES_APP_ID",
    required: false,
    description: "Fallback exchange rates provider",
    getKeyUrl: "https://openexchangerates.org/signup",
  },
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate provider configuration
 *
 * Checks all provider environment variables and returns status for each.
 *
 * @returns ValidationResult with provider status and warnings
 */
export function validateProviderConfig(): ValidationResult {
  const isProduction = process.env.NODE_ENV === "production";

  const providers: ProviderConfigStatus[] = PROVIDER_REQUIREMENTS.map((req) => ({
    ...req,
    configured: isEnvSet(req.envVar),
  }));

  const warnings: string[] = [];
  const missingRequired = providers.filter((p) => p.required && !p.configured);
  const usingMockProviders = missingRequired.length > 0;

  // Generate warnings for missing required providers
  for (const provider of missingRequired) {
    warnings.push(
      `${provider.envVar} not set - using MOCK ${provider.name}. ` +
        `Get key from: ${provider.getKeyUrl}`
    );
  }

  return {
    isProduction,
    usingMockProviders,
    providers,
    warnings,
  };
}

/**
 * Log provider configuration status on startup
 *
 * Should be called during application initialization to alert operators
 * if mock providers are being used in production.
 *
 * @example
 * ```typescript
 * // In instrumentation.ts or app initialization
 * import { logProviderConfigStatus } from "@/lib/providers/validate-config";
 * logProviderConfigStatus();
 * ```
 */
export function logProviderConfigStatus(): void {
  const result = validateProviderConfig();

  // Always log the configuration status
  const configuredProviders = result.providers.filter((p) => p.configured).map((p) => p.name);

  const mockProviders = result.providers
    .filter((p) => !p.configured && p.required)
    .map((p) => p.name);

  if (result.usingMockProviders) {
    if (result.isProduction) {
      // CRITICAL: Production using mock providers
      logger.error("PRODUCTION USING MOCK PROVIDERS - Data refresh will return fake data", {
        configuredProviders: configuredProviders.join(", ") || "none",
        mockProviders: mockProviders.join(", "),
        warningCount: result.warnings.length,
        action: "Set required API keys in environment variables",
      });
    } else {
      // Development mode - just info
      logger.info("Development mode: Using mock providers", {
        configuredProviders: configuredProviders.join(", ") || "none",
        mockProviders: mockProviders.join(", "),
      });
    }
  } else {
    // All required providers configured
    logger.info("All required data providers configured", {
      configuredProviders: configuredProviders.join(", "),
    });
  }
}

/**
 * Check if the application is using mock providers
 *
 * Useful for displaying warnings in the UI or admin panels.
 *
 * @returns true if any required provider is using mock implementation
 */
export function isUsingMockProviders(): boolean {
  return validateProviderConfig().usingMockProviders;
}

/**
 * Get a summary of provider configuration for health checks
 *
 * @returns Object with provider names and their configured status
 */
export function getProviderConfigSummary(): Record<string, boolean> {
  const result = validateProviderConfig();
  return Object.fromEntries(result.providers.map((p) => [p.envVar, p.configured]));
}
