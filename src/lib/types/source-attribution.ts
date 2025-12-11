/**
 * Source Attribution Types and Utilities
 *
 * Story 6.8: Data Source Attribution
 * AC-6.8.1: Provider Name Displayed for Each Data Point
 * AC-6.8.2: Source Format String Display
 *
 * Types and utility functions for displaying data source attribution
 * with human-readable provider names and consistent formatting.
 *
 * @module @/lib/types/source-attribution
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Data type categories for source attribution
 *
 * AC-6.8.2: Format is consistent across all data types
 */
export type SourceDataType = "price" | "rate" | "fundamentals" | "score";

/**
 * Source attribution information for a data point
 *
 * AC-6.8.1: Provider name displayed for each data point
 */
export interface SourceAttribution {
  /** Type of data (price, rate, fundamentals, score) */
  dataType: SourceDataType;
  /** Provider source identifier (technical or display name) */
  source: string;
  /** When the data was fetched */
  timestamp?: Date | undefined;
}

/**
 * Calculation inputs with source attribution
 *
 * AC-6.8.3: Available in score breakdown view
 */
export interface CalculationInputSources {
  /** Price data source and value */
  price?: {
    value: string;
    currency: string;
    source: string;
    fetchedAt: Date;
  };
  /** Exchange rate data source */
  exchangeRate?: {
    from: string;
    to: string;
    rate: string;
    source: string;
    fetchedAt: Date;
  };
  /** Fundamentals data source */
  fundamentals?: {
    source: string;
    fetchedAt: Date;
    metrics: Record<string, string | null>;
  };
  /** Criteria version used for calculation */
  criteriaVersion: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Human-readable display names for data providers
 *
 * AC-6.8.1: Provider name is human-readable (not technical API names)
 *
 * Maps technical provider identifiers to user-friendly display names
 */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  // Price providers
  gemini: "Gemini API",
  "Gemini API": "Gemini API",
  yahoo: "Yahoo Finance",
  "Yahoo Finance": "Yahoo Finance",

  // Exchange rate providers
  "exchangerate-api": "ExchangeRate-API",
  "ExchangeRate-API": "ExchangeRate-API",
  "open-exchange-rates": "Open Exchange Rates",
  "Open Exchange Rates": "Open Exchange Rates",

  // Fundamentals providers (same as price)
  "alpha-vantage": "Alpha Vantage",
  "Alpha Vantage": "Alpha Vantage",
} as const;

/**
 * Human-readable labels for data types
 *
 * AC-6.8.2: Format follows pattern "Price from Gemini API"
 */
export const DATA_TYPE_LABELS: Record<SourceDataType, string> = {
  price: "Price",
  rate: "Rate",
  fundamentals: "Fundamentals",
  score: "Score",
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the human-readable display name for a provider
 *
 * AC-6.8.1: Provider name is human-readable
 *
 * If the provider is not found in the mapping, returns the source as-is
 * (graceful fallback for unknown providers)
 *
 * @param source - Technical provider identifier or display name
 * @returns Human-readable provider display name
 *
 * @example
 * ```ts
 * getProviderDisplayName("gemini") // "Gemini API"
 * getProviderDisplayName("exchangerate-api") // "ExchangeRate-API"
 * getProviderDisplayName("unknown-provider") // "unknown-provider"
 * ```
 */
export function getProviderDisplayName(source: string): string {
  if (!source) {
    return "Unknown";
  }
  return PROVIDER_DISPLAY_NAMES[source] ?? source;
}

/**
 * Format source attribution string for display
 *
 * AC-6.8.2: Format follows the pattern "Price from Gemini API", "Rate from ExchangeRate-API"
 *
 * @param dataType - Type of data (price, rate, fundamentals, score)
 * @param source - Provider source identifier
 * @returns Formatted attribution string
 *
 * @example
 * ```ts
 * formatSourceAttribution("price", "gemini") // "Price from Gemini API"
 * formatSourceAttribution("rate", "exchangerate-api") // "Rate from ExchangeRate-API"
 * formatSourceAttribution("fundamentals", "Gemini API") // "Fundamentals from Gemini API"
 * ```
 */
export function formatSourceAttribution(dataType: SourceDataType | string, source: string): string {
  const typeLabel = DATA_TYPE_LABELS[dataType as SourceDataType] ?? "Data";
  const providerName = getProviderDisplayName(source);
  return `${typeLabel} from ${providerName}`;
}

/**
 * Create a SourceAttribution object
 *
 * Helper function for creating properly typed source attribution objects
 *
 * @param dataType - Type of data
 * @param source - Provider source identifier
 * @param timestamp - Optional timestamp when data was fetched
 * @returns SourceAttribution object
 */
export function createSourceAttribution(
  dataType: SourceDataType,
  source: string,
  timestamp?: Date
): SourceAttribution {
  return {
    dataType,
    source: getProviderDisplayName(source),
    timestamp,
  };
}

/**
 * Check if a source value is valid (not null, undefined, or empty)
 *
 * AC-6.8.4: Source is never null or empty for fetched data
 *
 * @param source - Source value to validate
 * @returns True if source is valid
 */
export function isValidSource(source: string | null | undefined): source is string {
  return typeof source === "string" && source.trim().length > 0;
}

/**
 * Get source with fallback for display
 *
 * Returns "Unknown" if source is invalid, otherwise returns the display name
 *
 * @param source - Source value (may be null/undefined)
 * @returns Display-safe source string
 */
export function getSourceOrDefault(source: string | null | undefined): string {
  return isValidSource(source) ? getProviderDisplayName(source) : "Unknown";
}
