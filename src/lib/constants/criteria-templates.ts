/**
 * Criteria Templates
 *
 * Story 5.2: Set Point Values
 *
 * AC-5.2.3: Cerrado Historical Surplus Scoring Support
 * - Pre-defined criterion templates for common scoring methodologies
 * - Cerrado methodology for Brazilian market analysis
 *
 * Templates can be used to quickly create criteria with proven methodologies.
 */

import type { CreateCriterionRuleInput } from "@/lib/validations/criteria-schemas";

/**
 * Template metadata for display in UI
 */
export interface CriterionTemplate {
  /** Unique identifier for the template */
  id: string;
  /** Display name shown in template selector */
  name: string;
  /** Detailed description of what this template does */
  description: string;
  /** Category for grouping templates */
  category: "dividend" | "value" | "growth" | "quality" | "risk" | "brazilian_market";
  /** The criterion values to pre-fill */
  criterion: Omit<CreateCriterionRuleInput, "sortOrder">;
}

/**
 * Cerrado Methodology - Historical Surplus Consistency
 *
 * The Cerrado methodology is used in Brazilian market analysis to evaluate
 * companies based on their historical financial surplus consistency:
 * - Companies with 5 consecutive years of surplus get maximum points
 * - Missing years result in point deductions
 *
 * Formula: points = basePoints - (missingYears × penaltyPerYear)
 * Default: +5 points for meeting threshold, -2 points per missing year
 */
export const CERRADO_SURPLUS_TEMPLATE: CriterionTemplate = {
  id: "cerrado-surplus-years",
  name: "Historical Surplus Consistency (Cerrado)",
  description:
    "Brazilian market methodology: Awards points for companies with 5 consecutive years of financial surplus. Use multiple criteria with graduated points to implement the full Cerrado methodology.",
  category: "brazilian_market",
  criterion: {
    name: "Historical Surplus Consistency (Cerrado)",
    metric: "surplus_years",
    operator: "gte",
    value: "5",
    points: 5,
    requiredFundamentals: ["surplus_history"],
  },
};

/**
 * High Dividend Yield Template
 */
export const HIGH_DIVIDEND_TEMPLATE: CriterionTemplate = {
  id: "high-dividend-yield",
  name: "High Dividend Yield",
  description: "Awards points to stocks with dividend yield above 4%",
  category: "dividend",
  criterion: {
    name: "High Dividend Yield (>4%)",
    metric: "dividend_yield",
    operator: "gt",
    value: "4.0",
    points: 10,
    requiredFundamentals: ["dividend_yield"],
  },
};

/**
 * Low P/E Ratio Template
 */
export const LOW_PE_TEMPLATE: CriterionTemplate = {
  id: "low-pe-ratio",
  name: "Low P/E Ratio",
  description: "Awards points to stocks with P/E ratio below 15 (value investing)",
  category: "value",
  criterion: {
    name: "Low P/E Ratio (<15)",
    metric: "pe_ratio",
    operator: "lt",
    value: "15",
    points: 10,
    requiredFundamentals: ["pe_ratio"],
  },
};

/**
 * High ROE Template
 */
export const HIGH_ROE_TEMPLATE: CriterionTemplate = {
  id: "high-roe",
  name: "High Return on Equity",
  description: "Awards points to companies with ROE above 15%",
  category: "quality",
  criterion: {
    name: "High ROE (>15%)",
    metric: "roe",
    operator: "gt",
    value: "15",
    points: 10,
    requiredFundamentals: ["roe"],
  },
};

/**
 * Low Debt to Equity Template
 */
export const LOW_DEBT_TEMPLATE: CriterionTemplate = {
  id: "low-debt-equity",
  name: "Low Debt to Equity",
  description: "Awards points to companies with debt/equity ratio below 1.0",
  category: "risk",
  criterion: {
    name: "Low Debt to Equity (<1.0)",
    metric: "debt_to_equity",
    operator: "lt",
    value: "1.0",
    points: 10,
    requiredFundamentals: ["debt_to_equity"],
  },
};

/**
 * High Debt Penalty Template
 */
export const HIGH_DEBT_PENALTY_TEMPLATE: CriterionTemplate = {
  id: "high-debt-penalty",
  name: "High Debt Penalty",
  description: "Deducts points from companies with high debt/equity ratio (>2.0)",
  category: "risk",
  criterion: {
    name: "High Debt Penalty (>2.0)",
    metric: "debt_to_equity",
    operator: "gt",
    value: "2.0",
    points: -15,
    requiredFundamentals: ["debt_to_equity"],
  },
};

/**
 * P/E Ratio in Range Template
 */
export const PE_IN_RANGE_TEMPLATE: CriterionTemplate = {
  id: "pe-in-range",
  name: "P/E Ratio in Range",
  description: "Awards points for P/E between 10-20 (balanced valuation)",
  category: "value",
  criterion: {
    name: "P/E in Range (10-20)",
    metric: "pe_ratio",
    operator: "between",
    value: "10",
    value2: "20",
    points: 8,
    requiredFundamentals: ["pe_ratio"],
  },
};

/**
 * All available templates
 */
export const CRITERION_TEMPLATES: CriterionTemplate[] = [
  CERRADO_SURPLUS_TEMPLATE,
  HIGH_DIVIDEND_TEMPLATE,
  LOW_PE_TEMPLATE,
  HIGH_ROE_TEMPLATE,
  LOW_DEBT_TEMPLATE,
  HIGH_DEBT_PENALTY_TEMPLATE,
  PE_IN_RANGE_TEMPLATE,
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: CriterionTemplate["category"]
): CriterionTemplate[] {
  return CRITERION_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): CriterionTemplate | undefined {
  return CRITERION_TEMPLATES.find((t) => t.id === id);
}

/**
 * Template categories for UI grouping
 */
export const TEMPLATE_CATEGORIES = [
  { value: "dividend", label: "Dividend" },
  { value: "value", label: "Value Investing" },
  { value: "growth", label: "Growth" },
  { value: "quality", label: "Quality" },
  { value: "risk", label: "Risk Management" },
  { value: "brazilian_market", label: "Brazilian Market" },
] as const;
