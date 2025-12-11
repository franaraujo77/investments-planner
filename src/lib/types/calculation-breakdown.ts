/**
 * Calculation Breakdown Types
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.1: View All Input Values Used
 * AC-6.9.2: View Each Criterion Evaluation Result
 * AC-6.9.3: View Criteria Version Used for Calculation
 * AC-6.9.4: Export Breakdown as JSON
 *
 * Types for complete calculation breakdown including:
 * - All input values with sources and timestamps
 * - Criterion-by-criterion evaluation results
 * - Criteria version information
 * - Exportable format for JSON download
 *
 * @module @/lib/types/calculation-breakdown
 */

// =============================================================================
// INPUT VALUE TYPES
// =============================================================================

/**
 * Price input value with source attribution
 *
 * AC-6.9.1: Price value, currency, source, and timestamp
 */
export interface PriceInputValue {
  /** Price value as decimal string for precision */
  value: string;
  /** Currency code (e.g., "USD", "BRL") */
  currency: string;
  /** Data provider source */
  source: string;
  /** When the data was fetched */
  fetchedAt: Date;
}

/**
 * Exchange rate input value with source attribution
 *
 * AC-6.9.1: Exchange rate value, source, and timestamp
 */
export interface ExchangeRateInputValue {
  /** Source currency code */
  from: string;
  /** Target currency code */
  to: string;
  /** Exchange rate value as decimal string */
  rate: string;
  /** Data provider source */
  source: string;
  /** When the data was fetched */
  fetchedAt: Date;
}

/**
 * Fundamentals input values with source attribution
 *
 * AC-6.9.1: Fundamentals data with source and timestamp
 */
export interface FundamentalsInputValue {
  /** Data provider source */
  source: string;
  /** When the data was fetched */
  fetchedAt: Date;
  /** Individual fundamental metrics */
  metrics: {
    peRatio: string | null;
    pbRatio: string | null;
    dividendYield: string | null;
    marketCap: string | null;
    revenue: string | null;
    earnings: string | null;
    [key: string]: string | null;
  };
}

/**
 * All calculation inputs with source attribution
 *
 * AC-6.9.1: All input values used in the calculation
 */
export interface CalculationInputs {
  /** Price data used in calculation */
  price: PriceInputValue | null;
  /** Exchange rate data used in calculation */
  exchangeRate: ExchangeRateInputValue | null;
  /** Fundamentals data used in calculation */
  fundamentals: FundamentalsInputValue | null;
}

// =============================================================================
// CRITERION EVALUATION TYPES
// =============================================================================

/**
 * Criterion operator types
 *
 * AC-6.9.2: Operator and threshold values
 */
export type CriterionOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "between";

/**
 * Criterion threshold value
 *
 * AC-6.9.2: Threshold values (single value or range for "between")
 */
export type CriterionThreshold = string | { min: string; max: string };

/**
 * Full criterion evaluation result
 *
 * AC-6.9.2: View each criterion evaluation result
 */
export interface CriterionEvaluation {
  /** Unique criterion identifier */
  criterionId: string;
  /** Human-readable criterion name */
  name: string;
  /** Optional description of the criterion */
  description?: string;
  /** Category/type for grouping (e.g., "valuation", "growth", "quality") */
  category?: string;
  /** Comparison operator used */
  operator: CriterionOperator;
  /** Threshold value(s) for comparison */
  threshold: CriterionThreshold;
  /** Actual value from data (null if data missing) */
  actualValue: string | null;
  /** Whether the criterion passed */
  passed: boolean;
  /** Points awarded (0 if failed or skipped) */
  pointsAwarded: number;
  /** Maximum possible points for this criterion */
  maxPoints: number;
  /** Reason if criterion was skipped (null if evaluated) */
  skippedReason: string | null;
}

// =============================================================================
// CRITERIA VERSION TYPES
// =============================================================================

/**
 * Criteria version information
 *
 * AC-6.9.3: View criteria version used for calculation
 */
export interface CriteriaVersionInfo {
  /** Unique version identifier */
  id: string;
  /** Version number or name */
  version: string;
  /** When this version was created */
  createdAt: Date;
  /** Optional name for the criteria set */
  name?: string;
}

// =============================================================================
// CALCULATION BREAKDOWN TYPES
// =============================================================================

/**
 * Complete calculation breakdown
 *
 * AC-6.9.1, AC-6.9.2, AC-6.9.3: Full breakdown with all inputs,
 * evaluations, and metadata for score transparency
 */
export interface CalculationBreakdown {
  /** Asset ID this calculation is for */
  assetId: string;
  /** Asset symbol for display */
  symbol: string;
  /** When the calculation was performed */
  calculatedAt: Date;
  /** Correlation ID for event store replay (AC-6.9.5) */
  correlationId: string;
  /** All input values used in calculation */
  inputs: CalculationInputs;
  /** Criteria version information */
  criteriaVersion: CriteriaVersionInfo;
  /** Individual criterion evaluations */
  evaluations: CriterionEvaluation[];
  /** Final calculated score */
  finalScore: string;
  /** Maximum possible score */
  maxPossibleScore: string;
  /** Score as percentage (0-100) */
  scorePercentage: string;
}

// =============================================================================
// EXPORTABLE BREAKDOWN TYPES
// =============================================================================

/**
 * Serializable date format for JSON export
 */
type ISODateString = string;

/**
 * Price input value for export (dates as ISO strings)
 */
export interface ExportablePriceInput {
  value: string;
  currency: string;
  source: string;
  fetchedAt: ISODateString;
}

/**
 * Exchange rate input value for export (dates as ISO strings)
 */
export interface ExportableExchangeRateInput {
  from: string;
  to: string;
  rate: string;
  source: string;
  fetchedAt: ISODateString;
}

/**
 * Fundamentals input value for export (dates as ISO strings)
 */
export interface ExportableFundamentalsInput {
  source: string;
  fetchedAt: ISODateString;
  metrics: Record<string, string | null>;
}

/**
 * Exportable calculation inputs (dates as ISO strings)
 */
export interface ExportableInputs {
  price: ExportablePriceInput | null;
  exchangeRate: ExportableExchangeRateInput | null;
  fundamentals: ExportableFundamentalsInput | null;
}

/**
 * Exportable criteria version (dates as ISO strings)
 */
export interface ExportableCriteriaVersion {
  id: string;
  version: string;
  createdAt: ISODateString;
  name?: string;
}

/**
 * Exportable criterion evaluation
 */
export interface ExportableCriterionEvaluation {
  criterionId: string;
  name: string;
  description?: string;
  category?: string;
  operator: CriterionOperator;
  threshold: CriterionThreshold;
  actualValue: string | null;
  passed: boolean;
  pointsAwarded: number;
  maxPoints: number;
  skippedReason: string | null;
}

/**
 * Exportable breakdown format for JSON download
 *
 * AC-6.9.4: Export breakdown as JSON
 * All dates are ISO 8601 strings, all numbers are decimal strings
 */
export interface ExportableBreakdown {
  /** Export format version for future compatibility */
  exportVersion: "1.0";
  /** When this export was generated */
  exportedAt: ISODateString;
  /** Asset information */
  asset: {
    id: string;
    symbol: string;
  };
  /** Calculation metadata */
  calculation: {
    calculatedAt: ISODateString;
    correlationId: string;
  };
  /** Input values with sources */
  inputs: ExportableInputs;
  /** Criteria version used */
  criteriaVersion: ExportableCriteriaVersion;
  /** Score results */
  score: {
    final: string;
    maxPossible: string;
    percentage: string;
  };
  /** Criterion-by-criterion evaluations */
  evaluations: ExportableCriterionEvaluation[];
  /** Summary statistics */
  summary: {
    totalCriteria: number;
    criteriaEvaluated: number;
    criteriaPassed: number;
    criteriaFailed: number;
    criteriaSkipped: number;
  };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for range threshold (between operator)
 */
export function isRangeThreshold(
  threshold: CriterionThreshold
): threshold is { min: string; max: string } {
  return (
    typeof threshold === "object" && threshold !== null && "min" in threshold && "max" in threshold
  );
}

/**
 * Type guard for single value threshold
 */
export function isSingleThreshold(threshold: CriterionThreshold): threshold is string {
  return typeof threshold === "string";
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format threshold for display
 *
 * @param operator - Comparison operator
 * @param threshold - Threshold value(s)
 * @returns Human-readable threshold string
 *
 * @example
 * ```ts
 * formatThreshold("gt", "10") // "> 10"
 * formatThreshold("between", { min: "5", max: "10" }) // "5 - 10"
 * formatThreshold("eq", "100") // "= 100"
 * ```
 */
export function formatThreshold(
  operator: CriterionOperator,
  threshold: CriterionThreshold
): string {
  if (operator === "between" && isRangeThreshold(threshold)) {
    return `${threshold.min} - ${threshold.max}`;
  }

  const value = isSingleThreshold(threshold) ? threshold : String(threshold);

  const operatorSymbols: Record<CriterionOperator, string> = {
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    eq: "=",
    between: "", // Handled above
  };

  return `${operatorSymbols[operator]} ${value}`;
}

/**
 * Get human-readable operator label
 *
 * @param operator - Comparison operator
 * @returns Human-readable label
 */
export function getOperatorLabel(operator: CriterionOperator): string {
  const labels: Record<CriterionOperator, string> = {
    gt: "Greater than",
    gte: "Greater than or equal to",
    lt: "Less than",
    lte: "Less than or equal to",
    eq: "Equal to",
    between: "Between",
  };

  return labels[operator];
}

/**
 * Calculate summary statistics from evaluations
 *
 * @param evaluations - Array of criterion evaluations
 * @returns Summary statistics
 */
export function calculateEvaluationSummary(evaluations: CriterionEvaluation[]): {
  totalCriteria: number;
  criteriaEvaluated: number;
  criteriaPassed: number;
  criteriaFailed: number;
  criteriaSkipped: number;
} {
  const skipped = evaluations.filter((e) => e.skippedReason !== null);
  const evaluated = evaluations.filter((e) => e.skippedReason === null);
  const passed = evaluated.filter((e) => e.passed);
  const failed = evaluated.filter((e) => !e.passed);

  return {
    totalCriteria: evaluations.length,
    criteriaEvaluated: evaluated.length,
    criteriaPassed: passed.length,
    criteriaFailed: failed.length,
    criteriaSkipped: skipped.length,
  };
}
