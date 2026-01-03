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
 * Document type categories for investor relations documents
 *
 * Story 7.1, AC-7.1.3: Investor Relations Document Attribution
 */
export type DocumentType =
  | "earnings"
  | "annual-report"
  | "filing"
  | "press-release"
  | "ir-presentation";

/**
 * Document reference for investor relations publications
 *
 * Story 7.1, AC-7.1.3: Specific document attribution
 * AC-7.1.5: Independent verification support
 */
export interface DocumentReference {
  /** Document title (e.g., "Q3 2024 Earnings Report") */
  title: string;
  /** Type of document */
  type: DocumentType;
  /** When the document was published */
  publicationDate: Date;
  /** Link to original document for verification */
  url?: string;
  /** SEC/CVM/B3 filing reference ID */
  filingId?: string;
}

/**
 * Source attribution information for a data point
 *
 * AC-6.8.1: Provider name displayed for each data point
 * Story 7.1, AC-7.1.3: Extended with document reference support
 */
export interface SourceAttribution {
  /** Type of data (price, rate, fundamentals, score) */
  dataType: SourceDataType;
  /** Provider source identifier (technical or display name) */
  source: string;
  /** When the data was fetched */
  timestamp?: Date | undefined;
  /** Reference to investor relations document (Story 7.1) */
  documentRef?: DocumentReference | undefined;
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

  // Manual entry fallback (Story 7.1)
  manual: "Manual Entry",
  "Manual Entry": "Manual Entry",

  // Exchange rate providers
  "exchangerate-api": "ExchangeRate-API",
  "ExchangeRate-API": "ExchangeRate-API",
  "open-exchange-rates": "Open Exchange Rates",
  "Open Exchange Rates": "Open Exchange Rates",

  // Fundamentals providers (same as price)
  "alpha-vantage": "Alpha Vantage",
  "Alpha Vantage": "Alpha Vantage",

  // Investor Relations document providers (Story 7.1)
  "company-ir": "Company Investor Relations",
  "Company Investor Relations": "Company Investor Relations",
  "sec-filing": "SEC Filing",
  "SEC Filing": "SEC Filing",
  "cvm-filing": "CVM Filing (Brazil)",
  "CVM Filing (Brazil)": "CVM Filing (Brazil)",
  "b3-filing": "B3 Filing",
  "B3 Filing": "B3 Filing",
} as const;

/**
 * Human-readable labels for document types
 *
 * Story 7.1, AC-7.1.3: Investor Relations Document Attribution
 */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  earnings: "Earnings Report",
  "annual-report": "Annual Report",
  filing: "Filing",
  "press-release": "Press Release",
  "ir-presentation": "IR Presentation",
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

// =============================================================================
// DOCUMENT REFERENCE UTILITIES (Story 7.1)
// =============================================================================

/**
 * Get human-readable label for a document type
 *
 * Story 7.1, AC-7.1.3: Investor Relations Document Attribution
 *
 * @param type - Document type identifier
 * @returns Human-readable document type label
 *
 * @example
 * ```ts
 * getDocumentTypeLabel("earnings") // "Earnings Report"
 * getDocumentTypeLabel("annual-report") // "Annual Report"
 * getDocumentTypeLabel("filing") // "Filing"
 * ```
 */
export function getDocumentTypeLabel(type: DocumentType | string): string {
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? "Document";
}

/**
 * Format document attribution for display
 *
 * Story 7.1, AC-7.1.3: Shows specific document and publication date
 * AC-7.1.5: Includes filing ID for independent verification
 *
 * @param doc - Document reference object
 * @returns Formatted document attribution string
 *
 * @example
 * ```ts
 * formatDocumentAttribution({
 *   title: "Q3 2024 Earnings Report",
 *   type: "earnings",
 *   publicationDate: new Date("2024-10-15"),
 * })
 * // "Q3 2024 Earnings Report (Earnings Report, Oct 15, 2024)"
 *
 * formatDocumentAttribution({
 *   title: "Form 10-K",
 *   type: "filing",
 *   publicationDate: new Date("2024-02-28"),
 *   filingId: "0001234567-24-000001",
 * })
 * // "Form 10-K (Filing, Feb 28, 2024, Ref: 0001234567-24-000001)"
 * ```
 */
export function formatDocumentAttribution(doc: DocumentReference): string {
  const typeLabel = getDocumentTypeLabel(doc.type);
  const dateStr = doc.publicationDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  let result = `${doc.title} (${typeLabel}, ${dateStr}`;

  if (doc.filingId) {
    result += `, Ref: ${doc.filingId}`;
  }

  result += ")";
  return result;
}
