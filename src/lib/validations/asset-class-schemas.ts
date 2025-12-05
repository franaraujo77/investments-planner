/**
 * Asset Class and Subclass Validation Schemas
 *
 * Zod schemas for asset class and subclass operations.
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 *
 * AC-4.1.2: Asset class name validation (1-50 characters)
 * AC-4.2.2: Subclass name validation (1-50 characters)
 * AC-4.3.1: Allocation range input validation (targetMin, targetMax)
 * AC-4.3.2: Min cannot exceed max validation
 * AC-4.4.1: Subclass allocation range validation
 * AC-4.4.4: Subclass min cannot exceed max validation
 * AC-4.5.1: Max assets limit validation (integer 0-100, null = no limit)
 * Tech spec constraint: Maximum 10 asset classes per user, 10 subclasses per class
 */

import { z } from "zod";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum asset classes allowed per user
 * Per tech-spec-epic-4.md constraint
 */
export const MAX_ASSET_CLASSES_PER_USER = 10;

/**
 * Maximum subclasses allowed per asset class
 * Per tech-spec-epic-4.md constraint (mirrors asset class limit)
 */
export const MAX_SUBCLASSES_PER_CLASS = 10;

/**
 * Asset class name constraints
 */
export const ASSET_CLASS_NAME_MIN_LENGTH = 1;
export const ASSET_CLASS_NAME_MAX_LENGTH = 50;

/**
 * Icon field constraints
 */
export const ASSET_CLASS_ICON_MAX_LENGTH = 10;

// =============================================================================
// MESSAGES
// =============================================================================

/**
 * Max assets limit constraints
 * Story 4.5: Set Asset Count Limits
 */
export const MAX_ASSETS_LIMIT_MIN = 0; // 0 = no limit
export const MAX_ASSETS_LIMIT_MAX = 100; // reasonable upper bound

/**
 * Min allocation value constraints
 * Story 4.6: Set Minimum Allocation Values
 */
export const MIN_ALLOCATION_VALUE_MIN = 0; // 0 = no minimum
export const MIN_ALLOCATION_VALUE_MAX = 1000000; // reasonable upper bound

/**
 * Asset class validation messages
 */
export const ASSET_CLASS_MESSAGES = {
  NAME_REQUIRED: "Asset class name is required",
  NAME_TOO_LONG: `Asset class name must be ${ASSET_CLASS_NAME_MAX_LENGTH} characters or less`,
  ICON_TOO_LONG: `Icon must be ${ASSET_CLASS_ICON_MAX_LENGTH} characters or less`,
  LIMIT_REACHED: `Maximum asset classes reached (${MAX_ASSET_CLASSES_PER_USER})`,
  NOT_FOUND: "Asset class not found",
  HAS_ASSETS: "Cannot delete asset class with associated assets",
  MIN_EXCEEDS_MAX: "Minimum cannot exceed maximum",
  INVALID_PERCENTAGE: "Invalid percentage format (0-100, up to 2 decimal places)",
  INVALID_MAX_ASSETS: `Max assets must be an integer between ${MAX_ASSETS_LIMIT_MIN} and ${MAX_ASSETS_LIMIT_MAX}`,
  INVALID_MIN_ALLOCATION: `Minimum allocation must be between ${MIN_ALLOCATION_VALUE_MIN} and ${MIN_ALLOCATION_VALUE_MAX}`,
} as const;

/**
 * Subclass validation messages
 */
export const SUBCLASS_MESSAGES = {
  NAME_REQUIRED: "Subclass name is required",
  NAME_TOO_LONG: `Subclass name must be ${ASSET_CLASS_NAME_MAX_LENGTH} characters or less`,
  LIMIT_REACHED: `Maximum subclasses reached (${MAX_SUBCLASSES_PER_CLASS})`,
  NOT_FOUND: "Subclass not found",
  CLASS_NOT_FOUND: "Parent asset class not found",
  HAS_ASSETS: "Cannot delete subclass with associated assets",
  MIN_EXCEEDS_MAX: "Minimum cannot exceed maximum",
  INVALID_PERCENTAGE: "Invalid percentage format (0-100, up to 2 decimal places)",
  INVALID_MAX_ASSETS: `Max assets must be an integer between ${MAX_ASSETS_LIMIT_MIN} and ${MAX_ASSETS_LIMIT_MAX}`,
  INVALID_MIN_ALLOCATION: `Minimum allocation must be between ${MIN_ALLOCATION_VALUE_MIN} and ${MIN_ALLOCATION_VALUE_MAX}`,
} as const;

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Create asset class schema
 * Used for POST /api/asset-classes
 *
 * AC-4.1.2: Form with name (required) and icon (optional)
 */
export const createAssetClassSchema = z.object({
  name: z
    .string()
    .transform((name) => name.trim())
    .pipe(
      z
        .string()
        .min(ASSET_CLASS_NAME_MIN_LENGTH, ASSET_CLASS_MESSAGES.NAME_REQUIRED)
        .max(ASSET_CLASS_NAME_MAX_LENGTH, ASSET_CLASS_MESSAGES.NAME_TOO_LONG)
    ),
  icon: z
    .string()
    .max(ASSET_CLASS_ICON_MAX_LENGTH, ASSET_CLASS_MESSAGES.ICON_TOO_LONG)
    .optional()
    .nullable(),
});

/**
 * Percentage validation schema
 * Validates decimal percentage format: 0-100 with up to 2 decimal places
 * Story 4.3: Set Allocation Ranges for Classes
 */
const percentageSchema = z
  .string()
  .regex(/^(100(\.00?)?|\d{1,2}(\.\d{1,2})?)$/, ASSET_CLASS_MESSAGES.INVALID_PERCENTAGE)
  .refine(
    (val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    },
    { message: ASSET_CLASS_MESSAGES.INVALID_PERCENTAGE }
  );

/**
 * Max assets validation schema
 * Validates integer for max asset count: 0-100 (0 = no limit)
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.1: Max assets must be a positive integer (0 means no limit)
 */
const maxAssetsSchema = z
  .number()
  .int({ message: ASSET_CLASS_MESSAGES.INVALID_MAX_ASSETS })
  .min(MAX_ASSETS_LIMIT_MIN, { message: ASSET_CLASS_MESSAGES.INVALID_MAX_ASSETS })
  .max(MAX_ASSETS_LIMIT_MAX, { message: ASSET_CLASS_MESSAGES.INVALID_MAX_ASSETS });

/**
 * Min allocation value validation schema
 * Validates currency amount: 0-1,000,000 (0 or null = no minimum)
 * Story 4.6: Set Minimum Allocation Values
 * AC-4.6.1: Set minimum allocation value in base currency
 * AC-4.6.4: Validation of minimum allocation value (0 to 1,000,000)
 */
const minAllocationValueSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, { message: ASSET_CLASS_MESSAGES.INVALID_MIN_ALLOCATION })
  .refine(
    (val) => {
      const num = parseFloat(val);
      return num >= MIN_ALLOCATION_VALUE_MIN && num <= MIN_ALLOCATION_VALUE_MAX;
    },
    { message: ASSET_CLASS_MESSAGES.INVALID_MIN_ALLOCATION }
  );

/**
 * Update asset class schema
 * Used for PATCH /api/asset-classes/:id
 *
 * AC-4.1.3: Edit asset class name
 * AC-4.3.1: Set allocation ranges (targetMin, targetMax)
 * AC-4.3.2: Min cannot exceed max validation
 * AC-4.5.1: Set max assets limit (Story 4.5)
 * AC-4.6.1: Set minimum allocation value (Story 4.6)
 * Allows partial updates - at least one field should be provided
 */
export const updateAssetClassSchema = z
  .object({
    name: z
      .string()
      .transform((name) => name.trim())
      .pipe(
        z
          .string()
          .min(ASSET_CLASS_NAME_MIN_LENGTH, ASSET_CLASS_MESSAGES.NAME_REQUIRED)
          .max(ASSET_CLASS_NAME_MAX_LENGTH, ASSET_CLASS_MESSAGES.NAME_TOO_LONG)
      )
      .optional(),
    icon: z
      .string()
      .max(ASSET_CLASS_ICON_MAX_LENGTH, ASSET_CLASS_MESSAGES.ICON_TOO_LONG)
      .optional()
      .nullable(),
    targetMin: percentageSchema.optional().nullable(),
    targetMax: percentageSchema.optional().nullable(),
    maxAssets: maxAssetsSchema.optional().nullable(), // Story 4.5: null or 0 = no limit
    minAllocationValue: minAllocationValueSchema.optional().nullable(), // Story 4.6: null or "0" = no minimum
  })
  .refine(
    (data) => {
      // AC-4.3.2: Min cannot exceed max
      if (data.targetMin && data.targetMax) {
        return parseFloat(data.targetMin) <= parseFloat(data.targetMax);
      }
      return true;
    },
    {
      message: ASSET_CLASS_MESSAGES.MIN_EXCEEDS_MAX,
      path: ["targetMin"],
    }
  );

/**
 * Delete asset class query params schema
 * Used for DELETE /api/asset-classes/:id
 *
 * AC-4.1.5: Force delete with assets warning
 */
export const deleteAssetClassQuerySchema = z.object({
  force: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

// =============================================================================
// SUBCLASS SCHEMAS (Story 4.2)
// =============================================================================

/**
 * Create subclass schema
 * Used for POST /api/asset-classes/:id/subclasses
 *
 * AC-4.2.2: Form with name (required, max 50 chars)
 */
export const createSubclassSchema = z.object({
  name: z
    .string()
    .transform((name) => name.trim())
    .pipe(
      z
        .string()
        .min(ASSET_CLASS_NAME_MIN_LENGTH, SUBCLASS_MESSAGES.NAME_REQUIRED)
        .max(ASSET_CLASS_NAME_MAX_LENGTH, SUBCLASS_MESSAGES.NAME_TOO_LONG)
    ),
});

/**
 * Percentage validation schema for subclasses
 * Validates decimal percentage format: 0-100 with up to 2 decimal places
 * Story 4.4: Set Allocation Ranges for Subclasses
 */
const subclassPercentageSchema = z
  .string()
  .regex(/^(100(\.00?)?|\d{1,2}(\.\d{1,2})?)$/, SUBCLASS_MESSAGES.INVALID_PERCENTAGE)
  .refine(
    (val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    },
    { message: SUBCLASS_MESSAGES.INVALID_PERCENTAGE }
  );

/**
 * Max assets validation schema for subclasses
 * Story 4.5: Set Asset Count Limits
 */
const subclassMaxAssetsSchema = z
  .number()
  .int({ message: SUBCLASS_MESSAGES.INVALID_MAX_ASSETS })
  .min(MAX_ASSETS_LIMIT_MIN, { message: SUBCLASS_MESSAGES.INVALID_MAX_ASSETS })
  .max(MAX_ASSETS_LIMIT_MAX, { message: SUBCLASS_MESSAGES.INVALID_MAX_ASSETS });

/**
 * Min allocation value validation schema for subclasses
 * Story 4.6: Set Minimum Allocation Values
 */
const subclassMinAllocationValueSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, { message: SUBCLASS_MESSAGES.INVALID_MIN_ALLOCATION })
  .refine(
    (val) => {
      const num = parseFloat(val);
      return num >= MIN_ALLOCATION_VALUE_MIN && num <= MIN_ALLOCATION_VALUE_MAX;
    },
    { message: SUBCLASS_MESSAGES.INVALID_MIN_ALLOCATION }
  );

/**
 * Update subclass schema
 * Used for PATCH /api/asset-subclasses/:id
 *
 * AC-4.2.3: Edit subclass name
 * AC-4.4.1: Set allocation ranges (targetMin, targetMax)
 * AC-4.4.4: Min cannot exceed max validation
 * AC-4.5.1: Set max assets limit (Story 4.5)
 * AC-4.6.1: Set minimum allocation value (Story 4.6)
 * Allows partial updates
 */
export const updateSubclassSchema = z
  .object({
    name: z
      .string()
      .transform((name) => name.trim())
      .pipe(
        z
          .string()
          .min(ASSET_CLASS_NAME_MIN_LENGTH, SUBCLASS_MESSAGES.NAME_REQUIRED)
          .max(ASSET_CLASS_NAME_MAX_LENGTH, SUBCLASS_MESSAGES.NAME_TOO_LONG)
      )
      .optional(),
    targetMin: subclassPercentageSchema.optional().nullable(),
    targetMax: subclassPercentageSchema.optional().nullable(),
    maxAssets: subclassMaxAssetsSchema.optional().nullable(), // Story 4.5: null or 0 = no limit
    minAllocationValue: subclassMinAllocationValueSchema.optional().nullable(), // Story 4.6: null or "0" = no minimum
  })
  .refine(
    (data) => {
      // AC-4.4.4: Min cannot exceed max
      if (data.targetMin && data.targetMax) {
        return parseFloat(data.targetMin) <= parseFloat(data.targetMax);
      }
      return true;
    },
    {
      message: SUBCLASS_MESSAGES.MIN_EXCEEDS_MAX,
      path: ["targetMin"],
    }
  );

/**
 * Delete subclass query params schema
 * Used for DELETE /api/asset-subclasses/:id
 *
 * AC-4.2.5: Force delete with assets warning
 */
export const deleteSubclassQuerySchema = z.object({
  force: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Type exports inferred from schemas
 */
export type CreateAssetClassInput = z.infer<typeof createAssetClassSchema>;
export type UpdateAssetClassInput = z.infer<typeof updateAssetClassSchema>;
export type DeleteAssetClassQuery = z.infer<typeof deleteAssetClassQuerySchema>;

// Subclass type exports
export type CreateSubclassInput = z.infer<typeof createSubclassSchema>;
export type UpdateSubclassInput = z.infer<typeof updateSubclassSchema>;
export type DeleteSubclassQuery = z.infer<typeof deleteSubclassQuerySchema>;
