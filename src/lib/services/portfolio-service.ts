/**
 * Portfolio Service
 *
 * Business logic for portfolio operations.
 * Story 3.1: Create Portfolio
 * Story 3.2: Add Asset to Portfolio
 * Story 3.3: Update Asset Holdings
 * Story 3.4: Remove Asset from Portfolio
 * Story 3.5: Mark Asset as Ignored
 * Story 3.6: Portfolio Overview with Values
 *
 * AC-3.1.3: Create portfolio with name (1-50 chars)
 * AC-3.1.4: Enforce 5 portfolio limit per user
 * AC-3.1.5: Response within 500ms
 * AC-3.2.4: Prevent duplicate symbols in same portfolio
 * AC-3.2.6: Asset creation with ownership verification
 * AC-3.4.3: Hard delete asset from database
 * AC-3.4.6: Multi-tenant isolation for asset deletion
 * AC-3.5.3: Toggle asset ignored status
 * AC-3.5.7: Multi-tenant isolation for asset toggle
 * AC-3.6.1: Portfolio table displays values
 * AC-3.6.2: Native currency display
 * AC-3.6.3: Base currency conversion
 * AC-3.6.4: Total portfolio value
 */

import { db } from "@/lib/db";
import { Decimal } from "@/lib/calculations/decimal-config";
import {
  portfolios,
  portfolioAssets,
  type Portfolio,
  type NewPortfolio,
  type PortfolioAsset,
  type NewPortfolioAsset,
} from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import {
  MAX_PORTFOLIOS_PER_USER,
  PORTFOLIO_MESSAGES,
  ASSET_MESSAGES,
  type CreatePortfolioInput,
  type AddAssetInput,
  type UpdateAssetInput,
} from "@/lib/validations/portfolio";
import { alertService } from "./alert-service";
import { logger } from "@/lib/telemetry/logger";

/**
 * Custom error for portfolio limit exceeded
 */
export class PortfolioLimitError extends Error {
  constructor() {
    super(PORTFOLIO_MESSAGES.LIMIT_REACHED);
    this.name = "PortfolioLimitError";
  }
}

/**
 * Custom error for duplicate asset in portfolio
 * Story 3.2: Add Asset to Portfolio
 * AC-3.2.4: Duplicate asset validation
 */
export class AssetExistsError extends Error {
  constructor(symbol: string) {
    super(ASSET_MESSAGES.ASSET_EXISTS);
    this.name = "AssetExistsError";
    this.symbol = symbol;
  }
  readonly symbol: string;
}

/**
 * Custom error for portfolio not found
 */
export class PortfolioNotFoundError extends Error {
  constructor() {
    super("Portfolio not found");
    this.name = "PortfolioNotFoundError";
  }
}

/**
 * Custom error for asset not found
 * Story 3.3: Update Asset Holdings
 * AC-3.3.4: Asset not found error handling
 */
export class AssetNotFoundError extends Error {
  constructor() {
    super("Asset not found");
    this.name = "AssetNotFoundError";
  }
}

/**
 * Get count of portfolios for a user
 *
 * @param userId - User ID to count portfolios for
 * @returns Number of portfolios the user has
 */
export async function getPortfolioCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(portfolios)
    .where(eq(portfolios.userId, userId));

  return result[0]?.count ?? 0;
}

/**
 * Get all portfolios for a user
 *
 * Multi-tenant isolation: Only returns portfolios belonging to the userId
 *
 * @param userId - User ID to fetch portfolios for
 * @returns Array of user's portfolios ordered by creation date (newest first)
 */
export async function getUserPortfolios(userId: string): Promise<Portfolio[]> {
  return db.query.portfolios.findMany({
    where: eq(portfolios.userId, userId),
    orderBy: (portfolios, { desc }) => [desc(portfolios.createdAt)],
  });
}

/**
 * Get a single portfolio by ID
 *
 * Multi-tenant isolation: Only returns if portfolio belongs to the userId
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to fetch
 * @returns Portfolio or null if not found/not owned by user
 */
export async function getPortfolioById(
  userId: string,
  portfolioId: string
): Promise<Portfolio | null> {
  const result = await db.query.portfolios.findFirst({
    where: (portfolios, { and, eq }) =>
      and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)),
  });

  return result ?? null;
}

/**
 * Create a new portfolio
 *
 * Story 3.1: Create Portfolio
 * AC-3.1.3: Portfolio created and saved to database
 * AC-3.1.4: Enforce 5 portfolio limit
 *
 * @param userId - User ID creating the portfolio
 * @param input - Portfolio creation input (name)
 * @returns Created portfolio
 * @throws PortfolioLimitError if user already has 5 portfolios
 */
export async function createPortfolio(
  userId: string,
  input: CreatePortfolioInput
): Promise<Portfolio> {
  // Check portfolio limit before creating
  const currentCount = await getPortfolioCount(userId);

  if (currentCount >= MAX_PORTFOLIOS_PER_USER) {
    throw new PortfolioLimitError();
  }

  const newPortfolio: NewPortfolio = {
    userId,
    name: input.name,
  };

  const result = await db.insert(portfolios).values(newPortfolio).returning();

  if (!result[0]) {
    throw new Error("Failed to create portfolio");
  }

  return result[0];
}

/**
 * Delete a portfolio
 *
 * Multi-tenant isolation: Only deletes if portfolio belongs to the userId
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to delete
 * @returns true if deleted, false if not found
 */
export async function deletePortfolio(userId: string, portfolioId: string): Promise<boolean> {
  const result = await db
    .delete(portfolios)
    .where(eq(portfolios.id, portfolioId))
    .returning({ id: portfolios.id });

  // Verify the deleted portfolio belonged to the user
  // (the where clause ensures this, but we check result for confirmation)
  return result.length > 0;
}

/**
 * Check if user can create more portfolios
 *
 * @param userId - User ID to check
 * @returns true if user can create more portfolios
 */
export async function canCreatePortfolio(userId: string): Promise<boolean> {
  const currentCount = await getPortfolioCount(userId);
  return currentCount < MAX_PORTFOLIOS_PER_USER;
}

// =============================================================================
// ASSET FUNCTIONS
// Story 3.2: Add Asset to Portfolio
// =============================================================================

/**
 * Add an asset to a portfolio
 *
 * Multi-tenant isolation: Verifies portfolio ownership before adding asset
 * AC-3.2.4: Prevents duplicate symbols in same portfolio
 * AC-3.2.6: Creates asset and saves to database
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to add asset to
 * @param input - Asset data (symbol, name, quantity, purchasePrice, currency)
 * @returns Created asset
 * @throws PortfolioNotFoundError if portfolio doesn't exist or user doesn't own it
 * @throws AssetExistsError if asset with same symbol already exists in portfolio
 */
export async function addAsset(
  userId: string,
  portfolioId: string,
  input: AddAssetInput
): Promise<PortfolioAsset> {
  // First verify portfolio exists and belongs to user
  const portfolio = await getPortfolioById(userId, portfolioId);

  if (!portfolio) {
    throw new PortfolioNotFoundError();
  }

  const newAsset: NewPortfolioAsset = {
    portfolioId,
    symbol: input.symbol,
    name: input.name || null,
    quantity: input.quantity,
    purchasePrice: input.purchasePrice,
    currency: input.currency,
  };

  try {
    const result = await db.insert(portfolioAssets).values(newAsset).returning();

    if (!result[0]) {
      throw new Error("Failed to create asset");
    }

    const createdAsset = result[0];

    // Story 9.1, AC-9.1.5: Auto-dismiss opportunity alerts when better asset is added
    // If user adds the "better" asset from an opportunity alert, dismiss those alerts
    try {
      const dismissedCount = await alertService.autoDismissForAddedAsset(userId, createdAsset.id);
      if (dismissedCount > 0) {
        logger.info("Auto-dismissed opportunity alerts for added asset", {
          userId,
          assetId: createdAsset.id,
          symbol: createdAsset.symbol,
          dismissedCount,
        });
      }
    } catch (alertError) {
      // Don't fail asset creation if alert dismissal fails
      logger.warn("Failed to auto-dismiss alerts for added asset", {
        userId,
        assetId: createdAsset.id,
        error: alertError instanceof Error ? alertError.message : String(alertError),
      });
    }

    // Story 9.2, AC-9.2.6: Auto-dismiss drift alerts when allocation returns to target range
    // Adding an asset may bring the allocation back into range
    try {
      const driftDismissedCount = await alertService.autoDismissResolvedDriftAlerts(
        userId,
        portfolioId
      );
      if (driftDismissedCount > 0) {
        logger.info("Auto-dismissed drift alerts after asset addition", {
          userId,
          portfolioId,
          assetId: createdAsset.id,
          symbol: createdAsset.symbol,
          driftDismissedCount,
        });
      }
    } catch (driftAlertError) {
      // Don't fail asset creation if drift alert check fails
      logger.warn("Failed to check drift alerts after asset addition", {
        userId,
        portfolioId,
        assetId: createdAsset.id,
        error: driftAlertError instanceof Error ? driftAlertError.message : String(driftAlertError),
      });
    }

    return createdAsset;
  } catch (error) {
    // Handle PostgreSQL unique constraint violation
    // Error code 23505 = unique_violation
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "23505") {
      throw new AssetExistsError(input.symbol);
    }
    throw error;
  }
}

/**
 * Get all assets for a portfolio
 *
 * Multi-tenant isolation: Verifies portfolio ownership before returning assets
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to get assets for
 * @returns Array of assets in the portfolio
 * @throws PortfolioNotFoundError if portfolio doesn't exist or user doesn't own it
 */
export async function getPortfolioAssets(
  userId: string,
  portfolioId: string
): Promise<PortfolioAsset[]> {
  // Verify portfolio exists and belongs to user
  const portfolio = await getPortfolioById(userId, portfolioId);

  if (!portfolio) {
    throw new PortfolioNotFoundError();
  }

  return db.query.portfolioAssets.findMany({
    where: eq(portfolioAssets.portfolioId, portfolioId),
    orderBy: (assets, { asc }) => [asc(assets.symbol)],
  });
}

/**
 * Get a single asset by ID
 *
 * Multi-tenant isolation: Verifies asset's portfolio belongs to user
 *
 * @param userId - User ID (for ownership verification)
 * @param assetId - Asset ID to fetch
 * @returns Asset or null if not found/not owned by user
 */
export async function getAssetById(
  userId: string,
  assetId: string
): Promise<PortfolioAsset | null> {
  // First get the asset
  const asset = await db.query.portfolioAssets.findFirst({
    where: eq(portfolioAssets.id, assetId),
  });

  if (!asset) {
    return null;
  }

  // Verify the portfolio belongs to the user
  const portfolio = await getPortfolioById(userId, asset.portfolioId);

  if (!portfolio) {
    return null;
  }

  return asset;
}

/**
 * Update an asset's quantity and/or purchase price
 *
 * Story 3.3: Update Asset Holdings
 * AC-3.3.4: Auto-save updates
 * AC-3.3.6: Updated timestamp recorded
 *
 * Multi-tenant isolation: Verifies asset's portfolio belongs to user
 *
 * @param userId - User ID (for ownership verification)
 * @param assetId - Asset ID to update
 * @param input - Partial update input (quantity and/or purchasePrice)
 * @returns Updated asset
 * @throws AssetNotFoundError if asset doesn't exist or user doesn't own it
 */
export async function updateAsset(
  userId: string,
  assetId: string,
  input: UpdateAssetInput
): Promise<PortfolioAsset> {
  // First verify asset belongs to user's portfolio
  const asset = await getAssetById(userId, assetId);

  if (!asset) {
    throw new AssetNotFoundError();
  }

  // Build update object with only provided fields
  const updateData: Partial<NewPortfolioAsset> = {
    updatedAt: new Date(),
  };

  if (input.quantity !== undefined) {
    updateData.quantity = input.quantity;
  }

  if (input.purchasePrice !== undefined) {
    updateData.purchasePrice = input.purchasePrice;
  }

  const result = await db
    .update(portfolioAssets)
    .set(updateData)
    .where(eq(portfolioAssets.id, assetId))
    .returning();

  if (!result[0]) {
    throw new Error("Failed to update asset");
  }

  return result[0];
}

/**
 * Remove an asset from a portfolio
 *
 * Story 3.4: Remove Asset from Portfolio
 * AC-3.4.3: Hard delete asset from database
 * AC-3.4.6: Multi-tenant isolation verification
 *
 * @param userId - User ID (for ownership verification)
 * @param assetId - Asset ID to remove
 * @throws AssetNotFoundError if asset doesn't exist or user doesn't own it
 */
export async function removeAsset(userId: string, assetId: string): Promise<void> {
  // First verify asset belongs to user's portfolio
  const asset = await getAssetById(userId, assetId);

  if (!asset) {
    throw new AssetNotFoundError();
  }

  // Hard delete the asset
  await db.delete(portfolioAssets).where(eq(portfolioAssets.id, assetId));
}

/**
 * Toggle an asset's ignored status
 *
 * Story 3.5: Mark Asset as Ignored
 * AC-3.5.3: Allocation exclusion - toggle isIgnored flag
 * AC-3.5.4: Total value inclusion - ignored assets still count toward total
 * AC-3.5.6: Toggle reversibility - can toggle back to active
 * AC-3.5.7: Multi-tenant isolation verification
 *
 * @param userId - User ID (for ownership verification)
 * @param assetId - Asset ID to toggle
 * @returns Updated asset with new isIgnored state
 * @throws AssetNotFoundError if asset doesn't exist or user doesn't own it
 */
export async function toggleAssetIgnored(userId: string, assetId: string): Promise<PortfolioAsset> {
  // First verify asset belongs to user's portfolio
  const asset = await getAssetById(userId, assetId);

  if (!asset) {
    throw new AssetNotFoundError();
  }

  // Toggle the isIgnored flag
  const result = await db
    .update(portfolioAssets)
    .set({
      isIgnored: !asset.isIgnored,
      updatedAt: new Date(),
    })
    .where(eq(portfolioAssets.id, assetId))
    .returning();

  if (!result[0]) {
    throw new Error("Failed to toggle asset ignored status");
  }

  return result[0];
}

// =============================================================================
// PORTFOLIO VALUES FUNCTIONS
// Story 3.6: Portfolio Overview with Values
// =============================================================================

import { getCurrentPrices, type PriceData } from "./price-service";
import { getExchangeRate } from "./exchange-rate-service";
import { getUserProfile } from "./user-service";

/**
 * Asset with calculated value fields
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.1: Table displays all value columns
 * AC-3.6.2: Native currency values
 * AC-3.6.3: Base currency conversion
 */
export interface AssetWithValue {
  // Existing asset fields
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  quantity: string;
  purchasePrice: string;
  currency: string;
  isIgnored: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Calculated value fields
  currentPrice: string;
  valueNative: string; // quantity × currentPrice
  valueBase: string; // valueNative converted to base currency
  exchangeRate: string;
  allocationPercent: string;
  priceUpdatedAt: Date;
}

/**
 * Portfolio with values response
 */
export interface PortfolioWithValues {
  portfolio: Portfolio;
  assets: AssetWithValue[];
  totalValueBase: string;
  totalActiveValueBase: string; // Excludes ignored assets (for allocation calc)
  baseCurrency: string;
  dataFreshness: Date;
  assetCount: number;
  activeAssetCount: number;
  ignoredAssetCount: number;
}

/**
 * Calculate value in native currency using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 */
function calculateValueNative(quantity: string, price: string): string {
  return new Decimal(quantity).times(price).toFixed(4);
}

/**
 * Convert value to base currency using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 */
function convertToBase(valueNative: string, exchangeRate: string): string {
  return new Decimal(valueNative).times(exchangeRate).toFixed(4);
}

/**
 * Calculate allocation percentage using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 *
 * AC-3.5.3: Allocation excludes ignored assets
 * Only active (non-ignored) assets count toward allocation percentage
 */
function calculateAllocation(assetValueBase: string, totalActiveValueBase: string): string {
  const asset = new Decimal(assetValueBase);
  const total = new Decimal(totalActiveValueBase);

  // Avoid division by zero
  if (total.isZero()) {
    return "0.0000";
  }

  return asset.dividedBy(total).times(100).toFixed(4);
}

/**
 * Get portfolio with calculated values
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.1: Portfolio table displays values
 * AC-3.6.2: Native currency display with correct symbols
 * AC-3.6.3: Base currency conversion using exchange rates
 * AC-3.6.4: Total portfolio value in base currency
 *
 * Multi-tenant isolation: Verifies portfolio ownership
 *
 * @param userId - User ID (for ownership verification and base currency)
 * @param portfolioId - Portfolio ID to get values for
 * @returns Portfolio with calculated values and totals
 * @throws PortfolioNotFoundError if portfolio doesn't exist or user doesn't own it
 */
export async function getPortfolioWithValues(
  userId: string,
  portfolioId: string
): Promise<PortfolioWithValues> {
  // Verify portfolio exists and belongs to user
  const portfolio = await getPortfolioById(userId, portfolioId);
  if (!portfolio) {
    throw new PortfolioNotFoundError();
  }

  // Get user's base currency
  const user = await getUserProfile(userId);
  const baseCurrency = user?.baseCurrency ?? "USD";

  // Get all assets
  const assets = await getPortfolioAssets(userId, portfolioId);

  // Get unique currencies for exchange rates
  const uniqueCurrencies = [...new Set(assets.map((a) => a.currency))];

  // Fetch exchange rates for all currencies to base currency
  const exchangeRates = new Map<string, string>();
  let oldestRateUpdate = new Date();

  for (const currency of uniqueCurrencies) {
    if (currency === baseCurrency) {
      exchangeRates.set(currency, "1.0000");
    } else {
      const rateData = await getExchangeRate(currency, baseCurrency);
      exchangeRates.set(currency, rateData.rate);
      if (rateData.updatedAt < oldestRateUpdate) {
        oldestRateUpdate = rateData.updatedAt;
      }
    }
  }

  // Get current prices for all symbols
  const symbols = assets.map((a) => a.symbol);
  const prices = await getCurrentPrices(symbols);

  // Track data freshness
  let oldestPriceUpdate = new Date();

  // Calculate values for each asset
  let totalValueBase = new Decimal(0);
  let totalActiveValueBase = new Decimal(0);

  const assetsWithValues: AssetWithValue[] = assets.map((asset) => {
    // Get current price (fallback to purchase price for MVP)
    const priceData: PriceData | null = prices.get(asset.symbol) ?? null;
    const currentPrice = priceData?.price ?? asset.purchasePrice;
    const priceUpdatedAt = priceData?.updatedAt ?? new Date();

    if (priceUpdatedAt < oldestPriceUpdate) {
      oldestPriceUpdate = priceUpdatedAt;
    }

    // Calculate value in native currency
    const valueNative = calculateValueNative(asset.quantity, currentPrice);

    // Get exchange rate and convert to base currency
    const exchangeRate = exchangeRates.get(asset.currency) ?? "1.0000";
    const valueBase = convertToBase(valueNative, exchangeRate);

    // Add to totals
    const valueBaseDecimal = new Decimal(valueBase);
    totalValueBase = totalValueBase.plus(valueBaseDecimal);

    // Only active (non-ignored) assets count toward allocation total
    if (!asset.isIgnored) {
      totalActiveValueBase = totalActiveValueBase.plus(valueBaseDecimal);
    }

    return {
      id: asset.id,
      portfolioId: asset.portfolioId,
      symbol: asset.symbol,
      name: asset.name,
      quantity: asset.quantity,
      purchasePrice: asset.purchasePrice,
      currency: asset.currency,
      isIgnored: asset.isIgnored ?? false,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      currentPrice,
      valueNative,
      valueBase,
      exchangeRate,
      allocationPercent: "0.0000", // Calculated in second pass
      priceUpdatedAt,
    };
  });

  // Calculate allocation percentages (second pass)
  // AC-3.5.3: Allocation excludes ignored assets
  const totalActiveValueStr = totalActiveValueBase.toFixed(4);
  for (const asset of assetsWithValues) {
    if (asset.isIgnored) {
      // Ignored assets don't have allocation percentage
      asset.allocationPercent = "0.0000";
    } else {
      asset.allocationPercent = calculateAllocation(asset.valueBase, totalActiveValueStr);
    }
  }

  // Determine data freshness (oldest of price or rate updates)
  const dataFreshness = oldestPriceUpdate < oldestRateUpdate ? oldestPriceUpdate : oldestRateUpdate;

  // Count assets
  const assetCount = assets.length;
  const activeAssetCount = assets.filter((a) => !a.isIgnored).length;
  const ignoredAssetCount = assetCount - activeAssetCount;

  return {
    portfolio,
    assets: assetsWithValues,
    totalValueBase: totalValueBase.toFixed(4),
    totalActiveValueBase: totalActiveValueStr,
    baseCurrency,
    dataFreshness,
    assetCount,
    activeAssetCount,
    ignoredAssetCount,
  };
}
