/**
 * Operator Constants and Configuration
 *
 * Story 5.3: Define Criteria Operators
 *
 * AC-5.3.1: All Operators Available
 * - gt, lt, gte, lte, between, equals, exists
 * - Each operator has label, description, and value requirements
 *
 * Centralized operator definitions for criteria evaluation.
 */

import { AVAILABLE_OPERATORS } from "@/lib/validations/criteria-schemas";

/**
 * Criterion operator type derived from available operators
 */
export type CriterionOperator = (typeof AVAILABLE_OPERATORS)[number];

/**
 * Human-readable operator labels for display in dropdowns
 * AC-5.3.1: Enhanced labels with symbols
 */
export const OPERATOR_DISPLAY_LABELS: Record<CriterionOperator, string> = {
  gt: "Greater than (>)",
  lt: "Less than (<)",
  gte: "Greater than or equal (>=)",
  lte: "Less than or equal (<=)",
  between: "Between",
  equals: "Equals (=)",
  exists: "Has value (exists)",
};

/**
 * Short operator symbols for inline display
 */
export const OPERATOR_SYMBOLS: Record<CriterionOperator, string> = {
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  between: "between",
  equals: "=",
  exists: "exists",
};

/**
 * Operator descriptions for tooltips and help text
 * AC-5.3.1: Descriptions explain each operator's behavior
 */
export const OPERATOR_DESCRIPTIONS: Record<CriterionOperator, string> = {
  gt: "Value must be strictly greater than threshold",
  lt: "Value must be strictly less than threshold",
  gte: "Value must be greater than or equal to threshold",
  lte: "Value must be less than or equal to threshold",
  between: "Value must be within the specified range (inclusive)",
  equals: "Value must exactly match the threshold",
  exists: "Asset must have this data point available (non-null)",
};

/**
 * Operator configuration interface
 */
export interface OperatorConfig {
  /** Display label for dropdowns */
  label: string;
  /** Short symbol for inline display */
  symbol: string;
  /** Description for tooltips */
  description: string;
  /** Whether this operator requires a primary value */
  requiresValue: boolean;
  /** Whether this operator requires a second value (for ranges) */
  requiresValue2: boolean;
}

/**
 * Get complete configuration for an operator
 *
 * @param operator - The operator code
 * @returns Configuration object with label, description, and value requirements
 *
 * @example
 * const config = getOperatorConfig('between');
 * // { label: 'Between', symbol: 'between', description: '...', requiresValue: true, requiresValue2: true }
 *
 * const existsConfig = getOperatorConfig('exists');
 * // { label: 'Has value (exists)', symbol: 'exists', description: '...', requiresValue: false, requiresValue2: false }
 */
export function getOperatorConfig(operator: CriterionOperator): OperatorConfig {
  return {
    label: OPERATOR_DISPLAY_LABELS[operator],
    symbol: OPERATOR_SYMBOLS[operator],
    description: OPERATOR_DESCRIPTIONS[operator],
    requiresValue: operator !== "exists",
    requiresValue2: operator === "between",
  };
}

/**
 * Check if an operator requires a primary value
 *
 * @param operator - The operator code
 * @returns true if value is required, false for 'exists' operator
 */
export function operatorRequiresValue(operator: CriterionOperator): boolean {
  return operator !== "exists";
}

/**
 * Check if an operator requires a second value
 *
 * @param operator - The operator code
 * @returns true only for 'between' operator
 */
export function operatorRequiresSecondValue(operator: CriterionOperator): boolean {
  return operator === "between";
}

/**
 * Get all operators as an array for iteration
 */
export const ALL_OPERATORS: readonly CriterionOperator[] = AVAILABLE_OPERATORS;

/**
 * Format operator display for criterion summary
 *
 * @param operator - The operator code
 * @param value - Primary value
 * @param value2 - Secondary value (for 'between')
 * @returns Formatted string for display
 *
 * @example
 * formatOperatorDisplay('gt', '5') // "> 5"
 * formatOperatorDisplay('between', '5', '10') // "between 5 and 10"
 * formatOperatorDisplay('exists') // "exists"
 */
export function formatOperatorDisplay(
  operator: CriterionOperator,
  value?: string,
  value2?: string
): string {
  switch (operator) {
    case "exists":
      return "exists";
    case "between":
      return `between ${value ?? "?"} and ${value2 ?? "?"}`;
    default:
      return `${OPERATOR_SYMBOLS[operator]} ${value ?? "?"}`;
  }
}
