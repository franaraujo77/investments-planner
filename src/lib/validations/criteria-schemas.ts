/**
 * Criteria Validation Schemas
 *
 * Zod schemas for scoring criteria operations.
 * Story 5.1: Define Scoring Criteria
 * Story 5.3: Define Criteria Operators
 *
 * AC-5.1.1: Create new criterion
 * AC-5.1.2: Criterion form fields validation
 * AC-5.1.5: Points validation (-100 to +100)
 * AC-5.1.6: Criteria versioning (immutable)
 * AC-5.3.1: All operators available
 * AC-5.3.3: Form prevents invalid criteria (value validation by operator)
 * AC-5.3.4: Operator selection adapts form fields
 */

import { z } from "zod";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum criteria sets allowed per user per asset type
 */
export const MAX_CRITERIA_SETS_PER_USER = 50;

/**
 * Maximum criteria rules per set
 */
export const MAX_CRITERIA_PER_SET = 50;

/**
 * Criterion name constraints
 */
export const CRITERION_NAME_MIN_LENGTH = 1;
export const CRITERION_NAME_MAX_LENGTH = 100;

/**
 * Criteria set name constraints
 */
export const CRITERIA_SET_NAME_MIN_LENGTH = 1;
export const CRITERIA_SET_NAME_MAX_LENGTH = 100;

/**
 * Asset type constraints
 */
export const ASSET_TYPE_MAX_LENGTH = 50;

/**
 * Target market constraints
 */
export const TARGET_MARKET_MAX_LENGTH = 50;

/**
 * Points constraints
 * AC-5.1.5: Points are integers from -100 to +100
 */
export const POINTS_MIN = -100;
export const POINTS_MAX = 100;

/**
 * Available metrics for criteria
 * Based on tech-spec-epic-5.md
 */
export const AVAILABLE_METRICS = [
  "dividend_yield",
  "pe_ratio",
  "pb_ratio",
  "market_cap",
  "revenue",
  "earnings",
  "surplus_years",
  "roe",
  "roa",
  "debt_to_equity",
  "current_ratio",
  "gross_margin",
  "net_margin",
  "payout_ratio",
  "ev_ebitda",
] as const;

/**
 * Available operators for criteria
 * Based on tech-spec-epic-5.md
 */
export const AVAILABLE_OPERATORS = [
  "gt", // >
  "lt", // <
  "gte", // >=
  "lte", // <=
  "between", // value1 <= x <= value2
  "equals", // =
  "exists", // data exists (non-null)
] as const;

/**
 * Human-readable metric labels
 */
export const METRIC_LABELS: Record<(typeof AVAILABLE_METRICS)[number], string> = {
  dividend_yield: "Dividend Yield",
  pe_ratio: "P/E Ratio",
  pb_ratio: "P/B Ratio",
  market_cap: "Market Cap",
  revenue: "Revenue",
  earnings: "Earnings",
  surplus_years: "Surplus Years",
  roe: "Return on Equity",
  roa: "Return on Assets",
  debt_to_equity: "Debt to Equity",
  current_ratio: "Current Ratio",
  gross_margin: "Gross Margin",
  net_margin: "Net Margin",
  payout_ratio: "Payout Ratio",
  ev_ebitda: "EV/EBITDA",
};

/**
 * Human-readable operator labels
 */
export const OPERATOR_LABELS: Record<(typeof AVAILABLE_OPERATORS)[number], string> = {
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  between: "between",
  equals: "=",
  exists: "exists",
};

// =============================================================================
// MESSAGES
// =============================================================================

/**
 * Criteria validation messages
 */
export const CRITERIA_MESSAGES = {
  // Criterion rule messages
  CRITERION_NAME_REQUIRED: "Criterion name is required",
  CRITERION_NAME_TOO_LONG: `Criterion name must be ${CRITERION_NAME_MAX_LENGTH} characters or less`,
  INVALID_METRIC: "Invalid metric selected",
  INVALID_OPERATOR: "Invalid operator selected",
  VALUE_REQUIRED: "Value is required for this operator",
  VALUE_REQUIRED_FOR_OPERATOR: "Value is required for this operator",
  VALUE2_REQUIRED: "Second value is required for 'between' operator",
  VALUE2_REQUIRED_FOR_BETWEEN: "Max value is required for between operator",
  VALUE2_NOT_ALLOWED: "Second value is only allowed for 'between' operator",
  MIN_MUST_BE_LESS_THAN_MAX: "Min value must be less than max value",
  INVALID_VALUE: "Value must be a valid decimal number",
  // Points validation messages (Story 5.2 - AC-5.2.1)
  INVALID_POINTS: `Points must be an integer between ${POINTS_MIN} and ${POINTS_MAX}`,
  POINTS_MUST_BE_INTEGER: "Points must be a whole number (no decimals)",
  POINTS_TOO_LOW: `Points cannot be less than ${POINTS_MIN}`,
  POINTS_TOO_HIGH: `Points cannot exceed ${POINTS_MAX}`,
  INVALID_SORT_ORDER: "Sort order must be a non-negative integer",
  FUNDAMENTALS_REQUIRED: "Required fundamentals must be an array",

  // Criteria set messages
  SET_NAME_REQUIRED: "Criteria set name is required",
  SET_NAME_TOO_LONG: `Criteria set name must be ${CRITERIA_SET_NAME_MAX_LENGTH} characters or less`,
  ASSET_TYPE_REQUIRED: "Asset type is required",
  ASSET_TYPE_TOO_LONG: `Asset type must be ${ASSET_TYPE_MAX_LENGTH} characters or less`,
  TARGET_MARKET_REQUIRED: "Target market is required",
  TARGET_MARKET_TOO_LONG: `Target market must be ${TARGET_MARKET_MAX_LENGTH} characters or less`,
  CRITERIA_REQUIRED: "At least one criterion is required",
  CRITERIA_TOO_MANY: `Maximum ${MAX_CRITERIA_PER_SET} criteria per set`,

  // General messages
  NOT_FOUND: "Criteria set not found",
  LIMIT_REACHED: `Maximum criteria sets reached (${MAX_CRITERIA_SETS_PER_USER})`,
  BETWEEN_VALUE_ORDER:
    "First value must be less than or equal to second value for 'between' operator",
} as const;

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Decimal value schema
 * Validates decimal strings for criterion values
 */
const decimalValueSchema = z.string().regex(/^-?\d+(\.\d+)?$/, CRITERIA_MESSAGES.INVALID_VALUE);

/**
 * Optional decimal value schema for 'exists' operator
 * Story 5.3: AC-5.3.4 - 'exists' operator doesn't require a value
 * Allows empty string or valid decimal
 */
const optionalDecimalValueSchema = z
  .string()
  .refine((val) => val === "" || /^-?\d+(\.\d+)?$/.test(val), {
    message: CRITERIA_MESSAGES.INVALID_VALUE,
  });

/**
 * Points validation schema
 * AC-5.1.5: Points are integers from -100 to +100
 * AC-5.2.1: Enhanced descriptive error messages (Story 5.2)
 *
 * @example
 * pointsSchema.parse(50)   // Valid
 * pointsSchema.parse(-100) // Valid (boundary)
 * pointsSchema.parse(100)  // Valid (boundary)
 * pointsSchema.parse(101)  // Error: Points cannot exceed 100
 * pointsSchema.parse(10.5) // Error: Points must be a whole number
 */
export const pointsSchema = z
  .number()
  .int({ message: CRITERIA_MESSAGES.POINTS_MUST_BE_INTEGER })
  .min(POINTS_MIN, { message: CRITERIA_MESSAGES.POINTS_TOO_LOW })
  .max(POINTS_MAX, { message: CRITERIA_MESSAGES.POINTS_TOO_HIGH });

/**
 * Sort order schema
 */
const sortOrderSchema = z
  .number()
  .int({ message: CRITERIA_MESSAGES.INVALID_SORT_ORDER })
  .min(0, { message: CRITERIA_MESSAGES.INVALID_SORT_ORDER });

/**
 * Criterion rule schema
 * Validates a single criterion rule within a criteria set
 *
 * AC-5.1.2: Criterion form fields
 * AC-5.1.5: Points validation
 * AC-5.3.3: Form prevents invalid criteria
 * AC-5.3.4: Operator selection adapts form fields ('exists' doesn't require value)
 */
export const criterionRuleSchema = z
  .object({
    id: z.string().uuid(),
    name: z
      .string()
      .transform((name) => name.trim())
      .pipe(
        z
          .string()
          .min(CRITERION_NAME_MIN_LENGTH, CRITERIA_MESSAGES.CRITERION_NAME_REQUIRED)
          .max(CRITERION_NAME_MAX_LENGTH, CRITERIA_MESSAGES.CRITERION_NAME_TOO_LONG)
      ),
    metric: z.enum(AVAILABLE_METRICS, { message: CRITERIA_MESSAGES.INVALID_METRIC }),
    operator: z.enum(AVAILABLE_OPERATORS, { message: CRITERIA_MESSAGES.INVALID_OPERATOR }),
    value: optionalDecimalValueSchema,
    value2: decimalValueSchema.optional().nullable(),
    points: pointsSchema,
    requiredFundamentals: z.array(z.string()),
    sortOrder: sortOrderSchema,
  })
  // AC-5.3.4: Value is required for all operators except 'exists'
  .refine(
    (data) => {
      if (data.operator === "exists") {
        return true; // 'exists' operator doesn't require a value
      }
      // All other operators require a non-empty value
      return data.value !== "" && data.value !== undefined;
    },
    {
      message: CRITERIA_MESSAGES.VALUE_REQUIRED_FOR_OPERATOR,
      path: ["value"],
    }
  )
  // AC-5.3.2: 'between' operator requires value2
  .refine(
    (data) => {
      if (data.operator === "between" && !data.value2) {
        return false;
      }
      return true;
    },
    {
      message: CRITERIA_MESSAGES.VALUE2_REQUIRED_FOR_BETWEEN,
      path: ["value2"],
    }
  )
  // Non-'between' operators should not have value2
  .refine(
    (data) => {
      if (data.operator !== "between" && data.value2) {
        return false;
      }
      return true;
    },
    {
      message: CRITERIA_MESSAGES.VALUE2_NOT_ALLOWED,
      path: ["value2"],
    }
  )
  // AC-5.3.3: For 'between', value must be < value2 (min < max)
  .refine(
    (data) => {
      if (data.operator === "between" && data.value2 && data.value) {
        const v1 = parseFloat(data.value);
        const v2 = parseFloat(data.value2);
        return v1 < v2;
      }
      return true;
    },
    {
      message: CRITERIA_MESSAGES.MIN_MUST_BE_LESS_THAN_MAX,
      path: ["value2"],
    }
  );

/**
 * Create criterion rule schema (without id - generated by service)
 */
export const createCriterionRuleSchema = criterionRuleSchema.omit({ id: true }).extend({
  id: z.string().uuid().optional(),
});

/**
 * Create criteria set schema
 * Used for POST /api/criteria
 *
 * AC-5.1.1: Create new criterion set
 */
export const createCriteriaSetSchema = z.object({
  assetType: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, CRITERIA_MESSAGES.ASSET_TYPE_REQUIRED)
        .max(ASSET_TYPE_MAX_LENGTH, CRITERIA_MESSAGES.ASSET_TYPE_TOO_LONG)
    ),
  targetMarket: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, CRITERIA_MESSAGES.TARGET_MARKET_REQUIRED)
        .max(TARGET_MARKET_MAX_LENGTH, CRITERIA_MESSAGES.TARGET_MARKET_TOO_LONG)
    ),
  name: z
    .string()
    .transform((name) => name.trim())
    .pipe(
      z
        .string()
        .min(CRITERIA_SET_NAME_MIN_LENGTH, CRITERIA_MESSAGES.SET_NAME_REQUIRED)
        .max(CRITERIA_SET_NAME_MAX_LENGTH, CRITERIA_MESSAGES.SET_NAME_TOO_LONG)
    ),
  criteria: z
    .array(createCriterionRuleSchema)
    .min(1, CRITERIA_MESSAGES.CRITERIA_REQUIRED)
    .max(MAX_CRITERIA_PER_SET, CRITERIA_MESSAGES.CRITERIA_TOO_MANY),
});

/**
 * Update criteria set schema
 * Used for PATCH /api/criteria/:id
 *
 * AC-5.1.6: Updates create new version (handled by service)
 */
export const updateCriteriaSetSchema = z
  .object({
    name: z
      .string()
      .transform((name) => name.trim())
      .pipe(
        z
          .string()
          .min(CRITERIA_SET_NAME_MIN_LENGTH, CRITERIA_MESSAGES.SET_NAME_REQUIRED)
          .max(CRITERIA_SET_NAME_MAX_LENGTH, CRITERIA_MESSAGES.SET_NAME_TOO_LONG)
      )
      .optional(),
    targetMarket: z
      .string()
      .transform((s) => s.trim())
      .pipe(
        z
          .string()
          .min(1, CRITERIA_MESSAGES.TARGET_MARKET_REQUIRED)
          .max(TARGET_MARKET_MAX_LENGTH, CRITERIA_MESSAGES.TARGET_MARKET_TOO_LONG)
      )
      .optional(),
    criteria: z
      .array(criterionRuleSchema)
      .min(1, CRITERIA_MESSAGES.CRITERIA_REQUIRED)
      .max(MAX_CRITERIA_PER_SET, CRITERIA_MESSAGES.CRITERIA_TOO_MANY)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one field should be provided
      return (
        data.name !== undefined ||
        data.targetMarket !== undefined ||
        data.criteria !== undefined ||
        data.isActive !== undefined
      );
    },
    { message: "At least one field must be provided for update" }
  );

/**
 * Add criterion schema
 * Used for adding a single criterion to an existing set
 */
export const addCriterionSchema = createCriterionRuleSchema;

/**
 * Update criterion schema
 * Used for updating a single criterion within a set
 */
export const updateCriterionSchema = z.object({
  name: z
    .string()
    .transform((name) => name.trim())
    .pipe(
      z
        .string()
        .min(CRITERION_NAME_MIN_LENGTH, CRITERIA_MESSAGES.CRITERION_NAME_REQUIRED)
        .max(CRITERION_NAME_MAX_LENGTH, CRITERIA_MESSAGES.CRITERION_NAME_TOO_LONG)
    )
    .optional(),
  metric: z.enum(AVAILABLE_METRICS, { message: CRITERIA_MESSAGES.INVALID_METRIC }).optional(),
  operator: z.enum(AVAILABLE_OPERATORS, { message: CRITERIA_MESSAGES.INVALID_OPERATOR }).optional(),
  value: decimalValueSchema.optional(),
  value2: decimalValueSchema.optional().nullable(),
  points: pointsSchema.optional(),
  requiredFundamentals: z.array(z.string()).optional(),
  sortOrder: sortOrderSchema.optional(),
});

/**
 * Reorder criteria schema
 * Used for PATCH /api/criteria/:id/reorder
 */
export const reorderCriteriaSchema = z.object({
  criterionIds: z.array(z.string().uuid()).min(1, "At least one criterion ID required"),
});

/**
 * Query criteria schema
 * Used for GET /api/criteria query params
 */
export const queryCriteriaSchema = z.object({
  assetType: z.string().optional(),
  targetMarket: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
});

/**
 * Copy criteria schema
 * Used for POST /api/criteria/:id/copy
 *
 * Story 5.5: Copy Criteria Set
 * AC-5.5.2: Target Market Selection
 * AC-5.5.3: Copied Criteria Naming
 */
export const copyCriteriaSchema = z.object({
  name: z
    .string()
    .transform((name) => name.trim())
    .pipe(z.string().max(CRITERIA_SET_NAME_MAX_LENGTH, CRITERIA_MESSAGES.SET_NAME_TOO_LONG))
    .optional(),
  targetMarket: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(TARGET_MARKET_MAX_LENGTH, CRITERIA_MESSAGES.TARGET_MARKET_TOO_LONG))
    .optional(),
});

/**
 * Compare criteria schema
 * Used for POST /api/criteria/compare
 *
 * Story 5.6: Compare Criteria Sets
 * AC-5.6.1: Select Two Criteria Sets for Comparison
 */
export const compareCriteriaSchema = z
  .object({
    setAId: z.string().uuid({ message: "Set A ID must be a valid UUID" }),
    setBId: z.string().uuid({ message: "Set B ID must be a valid UUID" }),
  })
  .refine((data) => data.setAId !== data.setBId, {
    message: "Cannot compare a criteria set with itself",
    path: ["setBId"],
  });

/**
 * Preview criteria schema (relaxed version for API preview)
 * Used for POST /api/criteria/preview
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 * AC-5.7.1: Preview Impact Button Available During Editing
 * AC-5.7.2: Preview Shows Top 10 Scoring Assets
 *
 * This schema is more relaxed than criterionRuleSchema because:
 * - We accept criteria from the client that may have temporary IDs
 * - We want to preview unsaved criteria configurations
 */
export const previewCriterionRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, CRITERIA_MESSAGES.CRITERION_NAME_REQUIRED),
  metric: z.enum(AVAILABLE_METRICS, { message: CRITERIA_MESSAGES.INVALID_METRIC }),
  operator: z.enum(AVAILABLE_OPERATORS, { message: CRITERIA_MESSAGES.INVALID_OPERATOR }),
  value: z.string(),
  value2: z.string().optional().nullable(),
  points: pointsSchema,
  requiredFundamentals: z.array(z.string()),
  sortOrder: z.number().int().min(0),
});

/**
 * Preview criteria request schema
 * Used for POST /api/criteria/preview
 */
export const previewCriteriaSchema = z.object({
  criteria: z
    .array(previewCriterionRuleSchema)
    .min(1, "At least one criterion is required for preview"),
  savedVersionId: z.string().uuid({ message: "Saved version ID must be a valid UUID" }).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Type exports inferred from schemas
 */
export type CriterionRule = z.infer<typeof criterionRuleSchema>;
export type CreateCriterionRuleInput = z.infer<typeof createCriterionRuleSchema>;
export type CreateCriteriaSetInput = z.infer<typeof createCriteriaSetSchema>;
export type UpdateCriteriaSetInput = z.infer<typeof updateCriteriaSetSchema>;
export type AddCriterionInput = z.infer<typeof addCriterionSchema>;
export type UpdateCriterionInput = z.infer<typeof updateCriterionSchema>;
export type ReorderCriteriaInput = z.infer<typeof reorderCriteriaSchema>;
export type QueryCriteriaInput = z.infer<typeof queryCriteriaSchema>;
export type CopyCriteriaInput = z.infer<typeof copyCriteriaSchema>;
export type CompareCriteriaInput = z.infer<typeof compareCriteriaSchema>;
export type PreviewCriteriaInput = z.infer<typeof previewCriteriaSchema>;
export type PreviewCriterionRule = z.infer<typeof previewCriterionRuleSchema>;
