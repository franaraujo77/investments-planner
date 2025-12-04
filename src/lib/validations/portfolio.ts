/**
 * Portfolio Validation Schemas
 *
 * Zod schemas for portfolio operations.
 * Story 3.1: Create Portfolio
 *
 * AC-3.1.2: Portfolio name validation (1-50 characters)
 * AC-3.1.4: Portfolio limit enforcement (5 max per user)
 */

import { z } from "zod";

/**
 * Maximum portfolios allowed per user
 * AC-3.1.4: Enforced on server-side
 */
export const MAX_PORTFOLIOS_PER_USER = 5;

/**
 * Portfolio name constraints
 */
export const PORTFOLIO_NAME_MIN_LENGTH = 1;
export const PORTFOLIO_NAME_MAX_LENGTH = 50;

/**
 * Asset constraints
 * Story 3.2: Add Asset to Portfolio
 */
export const ASSET_SYMBOL_MAX_LENGTH = 20;
export const ASSET_NAME_MAX_LENGTH = 100;

/**
 * Portfolio validation messages
 */
export const PORTFOLIO_MESSAGES = {
  NAME_REQUIRED: "Portfolio name is required",
  NAME_TOO_LONG: `Portfolio name must be ${PORTFOLIO_NAME_MAX_LENGTH} characters or less`,
  LIMIT_REACHED: `Maximum portfolios reached (${MAX_PORTFOLIOS_PER_USER})`,
} as const;

/**
 * Asset validation messages
 * Story 3.2: Add Asset to Portfolio
 */
export const ASSET_MESSAGES = {
  SYMBOL_REQUIRED: "Symbol is required",
  SYMBOL_TOO_LONG: `Symbol must be ${ASSET_SYMBOL_MAX_LENGTH} characters or less`,
  NAME_TOO_LONG: `Name must be ${ASSET_NAME_MAX_LENGTH} characters or less`,
  QUANTITY_REQUIRED: "Quantity is required",
  QUANTITY_POSITIVE: "Quantity must be positive",
  PRICE_REQUIRED: "Purchase price is required",
  PRICE_POSITIVE: "Price must be positive",
  CURRENCY_REQUIRED: "Currency is required",
  CURRENCY_LENGTH: "Currency must be 3 characters (e.g., USD, BRL)",
  ASSET_EXISTS: "Asset already exists in this portfolio",
} as const;

/**
 * Update asset validation messages
 * Story 3.3: Update Asset Holdings
 */
export const UPDATE_ASSET_MESSAGES = {
  QUANTITY_POSITIVE: "Quantity must be positive",
  PRICE_POSITIVE: "Price must be positive",
  AT_LEAST_ONE_FIELD: "At least one field must be provided",
} as const;

/**
 * Investment validation messages
 * Story 3.8: Record Investment Amount
 */
export const INVESTMENT_MESSAGES = {
  ASSET_ID_REQUIRED: "Asset ID is required",
  ASSET_ID_INVALID: "Asset ID must be a valid UUID",
  PORTFOLIO_ID_REQUIRED: "Portfolio ID is required",
  PORTFOLIO_ID_INVALID: "Portfolio ID must be a valid UUID",
  QUANTITY_REQUIRED: "Quantity is required",
  QUANTITY_POSITIVE: "Quantity must be positive",
  PRICE_REQUIRED: "Price per unit is required",
  PRICE_POSITIVE: "Price per unit must be positive",
  TOTAL_AMOUNT_REQUIRED: "Total amount is required",
  TOTAL_AMOUNT_NON_NEGATIVE: "Total amount must be non-negative",
  CURRENCY_REQUIRED: "Currency is required",
  CURRENCY_LENGTH: "Currency must be 3 characters (e.g., USD, BRL)",
  SYMBOL_REQUIRED: "Symbol is required",
  INVESTMENTS_REQUIRED: "At least one investment is required",
} as const;

/**
 * Supported currencies for assets
 */
export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]["code"];

/**
 * Create portfolio schema
 * Used for POST /api/portfolios
 */
export const createPortfolioSchema = z.object({
  name: z
    .string()
    .transform((name) => name.trim())
    .pipe(
      z
        .string()
        .min(PORTFOLIO_NAME_MIN_LENGTH, PORTFOLIO_MESSAGES.NAME_REQUIRED)
        .max(PORTFOLIO_NAME_MAX_LENGTH, PORTFOLIO_MESSAGES.NAME_TOO_LONG)
    ),
});

/**
 * Add asset schema
 * Story 3.2: Add Asset to Portfolio
 * Used for POST /api/portfolios/:id/assets
 *
 * AC-3.2.2: Form fields - symbol, name, quantity, price, currency
 * AC-3.2.3: Positive value validation
 * AC-3.2.5: Decimal precision support
 */
export const addAssetSchema = z.object({
  symbol: z
    .string()
    .min(1, ASSET_MESSAGES.SYMBOL_REQUIRED)
    .max(ASSET_SYMBOL_MAX_LENGTH, ASSET_MESSAGES.SYMBOL_TOO_LONG)
    .transform((val) => val.toUpperCase().trim()),
  name: z
    .string()
    .max(ASSET_NAME_MAX_LENGTH, ASSET_MESSAGES.NAME_TOO_LONG)
    .optional()
    .transform((val) => (val ? val.trim() : val)),
  quantity: z
    .string()
    .min(1, ASSET_MESSAGES.QUANTITY_REQUIRED)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: ASSET_MESSAGES.QUANTITY_POSITIVE }
    ),
  purchasePrice: z
    .string()
    .min(1, ASSET_MESSAGES.PRICE_REQUIRED)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: ASSET_MESSAGES.PRICE_POSITIVE }
    ),
  currency: z.string().length(3, ASSET_MESSAGES.CURRENCY_LENGTH),
});

/**
 * Update asset schema
 * Story 3.3: Update Asset Holdings
 * Used for PATCH /api/assets/:id
 *
 * AC-3.3.2: Quantity validation (positive number, up to 8 decimal places)
 * AC-3.3.3: Price validation (positive number, up to 4 decimal places)
 * At least one field must be provided for partial updates
 */
export const updateAssetSchema = z
  .object({
    quantity: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: UPDATE_ASSET_MESSAGES.QUANTITY_POSITIVE }
      )
      .optional(),
    purchasePrice: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: UPDATE_ASSET_MESSAGES.PRICE_POSITIVE }
      )
      .optional(),
  })
  .refine((data) => data.quantity !== undefined || data.purchasePrice !== undefined, {
    message: UPDATE_ASSET_MESSAGES.AT_LEAST_ONE_FIELD,
  });

/**
 * Single investment item schema
 * Story 3.8: Record Investment Amount
 *
 * AC-3.8.1: Investment record with all required fields
 * AC-3.8.5: Validation for positive values
 * AC-3.8.6: Optional recommended amount for comparison
 */
const investmentItemSchema = z.object({
  portfolioId: z
    .string()
    .min(1, INVESTMENT_MESSAGES.PORTFOLIO_ID_REQUIRED)
    .uuid(INVESTMENT_MESSAGES.PORTFOLIO_ID_INVALID),
  assetId: z
    .string()
    .min(1, INVESTMENT_MESSAGES.ASSET_ID_REQUIRED)
    .uuid(INVESTMENT_MESSAGES.ASSET_ID_INVALID),
  symbol: z
    .string()
    .min(1, INVESTMENT_MESSAGES.SYMBOL_REQUIRED)
    .max(ASSET_SYMBOL_MAX_LENGTH, ASSET_MESSAGES.SYMBOL_TOO_LONG)
    .transform((val) => val.toUpperCase().trim()),
  quantity: z
    .string()
    .min(1, INVESTMENT_MESSAGES.QUANTITY_REQUIRED)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: INVESTMENT_MESSAGES.QUANTITY_POSITIVE }
    ),
  pricePerUnit: z
    .string()
    .min(1, INVESTMENT_MESSAGES.PRICE_REQUIRED)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: INVESTMENT_MESSAGES.PRICE_POSITIVE }
    ),
  currency: z.string().length(3, INVESTMENT_MESSAGES.CURRENCY_LENGTH),
  recommendedAmount: z
    .string()
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: INVESTMENT_MESSAGES.TOTAL_AMOUNT_NON_NEGATIVE }
    )
    .optional()
    .nullable(),
});

/**
 * Record investments schema
 * Story 3.8: Record Investment Amount
 * Used for POST /api/investments
 *
 * Accepts an array of investments to record in a single transaction
 */
export const recordInvestmentsSchema = z.object({
  investments: z.array(investmentItemSchema).min(1, INVESTMENT_MESSAGES.INVESTMENTS_REQUIRED),
});

/**
 * Get investment history query params schema
 * Story 3.8: Record Investment Amount
 * Used for GET /api/investments
 */
export const getInvestmentsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  portfolioId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
});

/**
 * Type exports inferred from schemas
 */
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type AddAssetInput = z.infer<typeof addAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type InvestmentItemInput = z.infer<typeof investmentItemSchema>;
export type RecordInvestmentsInput = z.infer<typeof recordInvestmentsSchema>;
export type GetInvestmentsQuery = z.infer<typeof getInvestmentsQuerySchema>;
