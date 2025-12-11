/**
 * Calculation Export Utility
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.4: Export Breakdown as JSON
 *
 * Provides functionality to export calculation breakdowns as
 * well-formatted, human-readable JSON files.
 *
 * @module @/lib/utils/export-calculation
 */

import type {
  CalculationBreakdown,
  ExportableBreakdown,
  ExportablePriceInput,
  ExportableExchangeRateInput,
  ExportableFundamentalsInput,
  ExportableCriteriaVersion,
  ExportableCriterionEvaluation,
} from "@/lib/types/calculation-breakdown";
import { calculateEvaluationSummary } from "@/lib/types/calculation-breakdown";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for JSON export
 */
export interface ExportOptions {
  /** Include indentation for human readability (default: true) */
  prettyPrint?: boolean;
  /** Indent size (default: 2) */
  indentSize?: number;
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert Date to ISO 8601 string
 */
function toISOString(date: Date | undefined | null): string {
  if (!date) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * Convert price input to exportable format
 */
function convertPriceInput(
  price: CalculationBreakdown["inputs"]["price"]
): ExportablePriceInput | null {
  if (!price) return null;

  return {
    value: price.value,
    currency: price.currency,
    source: price.source,
    fetchedAt: toISOString(price.fetchedAt),
  };
}

/**
 * Convert exchange rate input to exportable format
 */
function convertExchangeRateInput(
  rate: CalculationBreakdown["inputs"]["exchangeRate"]
): ExportableExchangeRateInput | null {
  if (!rate) return null;

  return {
    from: rate.from,
    to: rate.to,
    rate: rate.rate,
    source: rate.source,
    fetchedAt: toISOString(rate.fetchedAt),
  };
}

/**
 * Convert fundamentals input to exportable format
 */
function convertFundamentalsInput(
  fundamentals: CalculationBreakdown["inputs"]["fundamentals"]
): ExportableFundamentalsInput | null {
  if (!fundamentals) return null;

  return {
    source: fundamentals.source,
    fetchedAt: toISOString(fundamentals.fetchedAt),
    metrics: fundamentals.metrics,
  };
}

/**
 * Convert criteria version to exportable format
 */
function convertCriteriaVersion(
  version: CalculationBreakdown["criteriaVersion"]
): ExportableCriteriaVersion {
  return {
    id: version.id,
    version: version.version,
    createdAt: toISOString(version.createdAt),
    ...(version.name ? { name: version.name } : {}),
  };
}

/**
 * Convert criterion evaluation to exportable format
 */
function convertEvaluation(
  evaluation: CalculationBreakdown["evaluations"][0]
): ExportableCriterionEvaluation {
  return {
    criterionId: evaluation.criterionId,
    name: evaluation.name,
    ...(evaluation.description ? { description: evaluation.description } : {}),
    ...(evaluation.category ? { category: evaluation.category } : {}),
    operator: evaluation.operator,
    threshold: evaluation.threshold,
    actualValue: evaluation.actualValue,
    passed: evaluation.passed,
    pointsAwarded: evaluation.pointsAwarded,
    maxPoints: evaluation.maxPoints,
    skippedReason: evaluation.skippedReason,
  };
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Export calculation breakdown as JSON string
 *
 * AC-6.9.4: Export Breakdown as JSON
 * - All input values with sources
 * - All criterion evaluation results
 * - Criteria version information
 * - Calculation timestamp
 * - Final score value
 * - Well-formatted and human-readable
 *
 * @param breakdown - Complete calculation breakdown
 * @param options - Export options
 * @returns JSON string suitable for download
 *
 * @example
 * ```ts
 * const json = exportCalculationAsJSON(breakdown);
 * // Creates a downloadable JSON file with all calculation details
 * ```
 */
export function exportCalculationAsJSON(
  breakdown: CalculationBreakdown,
  options: ExportOptions = {}
): string {
  const { prettyPrint = true, indentSize = 2 } = options;

  // Calculate summary statistics
  const summary = calculateEvaluationSummary(breakdown.evaluations);

  // Build exportable structure
  const exportable: ExportableBreakdown = {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    asset: {
      id: breakdown.assetId,
      symbol: breakdown.symbol,
    },
    calculation: {
      calculatedAt: toISOString(breakdown.calculatedAt),
      correlationId: breakdown.correlationId,
    },
    inputs: {
      price: convertPriceInput(breakdown.inputs.price),
      exchangeRate: convertExchangeRateInput(breakdown.inputs.exchangeRate),
      fundamentals: convertFundamentalsInput(breakdown.inputs.fundamentals),
    },
    criteriaVersion: convertCriteriaVersion(breakdown.criteriaVersion),
    score: {
      final: breakdown.finalScore,
      maxPossible: breakdown.maxPossibleScore,
      percentage: breakdown.scorePercentage,
    },
    evaluations: breakdown.evaluations.map(convertEvaluation),
    summary,
  };

  // Convert to JSON string with optional formatting
  if (prettyPrint) {
    return JSON.stringify(exportable, null, indentSize);
  }

  return JSON.stringify(exportable);
}

/**
 * Generate filename for calculation export
 *
 * @param symbol - Asset symbol
 * @param date - Calculation date (optional, defaults to now)
 * @returns Formatted filename
 *
 * @example
 * ```ts
 * generateExportFilename("AAPL") // "calculation-AAPL-2025-12-11.json"
 * generateExportFilename("BTC", new Date("2025-01-15")) // "calculation-BTC-2025-01-15.json"
 * ```
 */
export function generateExportFilename(symbol: string, date?: Date): string {
  const dateStr = (date ?? new Date()).toISOString().split("T")[0];
  // Sanitize symbol for filename (remove invalid characters)
  const safeSymbol = symbol.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `calculation-${safeSymbol}-${dateStr}.json`;
}

/**
 * Trigger file download in browser
 *
 * @param content - JSON content to download
 * @param filename - Filename for the download
 *
 * @example
 * ```ts
 * const json = exportCalculationAsJSON(breakdown);
 * const filename = generateExportFilename(breakdown.symbol);
 * triggerDownload(json, filename);
 * ```
 */
export function triggerDownload(content: string, filename: string): void {
  // Create blob from content
  const blob = new Blob([content], { type: "application/json" });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download calculation breakdown
 *
 * Convenience function that combines export and download
 *
 * @param breakdown - Complete calculation breakdown
 * @param options - Export options
 *
 * @example
 * ```ts
 * exportAndDownload(breakdown);
 * // Downloads: calculation-AAPL-2025-12-11.json
 * ```
 */
export function exportAndDownload(
  breakdown: CalculationBreakdown,
  options: ExportOptions = {}
): void {
  const json = exportCalculationAsJSON(breakdown, options);
  const filename = generateExportFilename(breakdown.symbol, breakdown.calculatedAt);
  triggerDownload(json, filename);
}
