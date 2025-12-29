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
  portfolioAcceptedAssetTypes,
  type Portfolio,
  type NewPortfolio,
  type PortfolioAsset,
  type NewPortfolioAsset,
  type NewPortfolioAcceptedAssetType,
} from "@/lib/db/schema";
import { eq, count, and, ne, inArray } from "drizzle-orm";
import {
  MAX_PORTFOLIOS_PER_USER,
  PORTFOLIO_MESSAGES,
  ASSET_MESSAGES,
  type CreatePortfolioInput,
  type UpdatePortfolioInput,
  type AddAssetInput,
  type UpdateAssetInput,
  type AssetType,
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
 * Portfolio with accepted asset types
 * Story 2.1: Create Portfolio
 */
export interface PortfolioWithAssetTypes extends Portfolio {
  acceptedAssetTypes: AssetType[];
}

/**
 * Create a new portfolio
 *
 * Story 2.1: Create Portfolio
 * Story 3.1: Create Portfolio (legacy)
 * AC-2.1.1: Portfolio creation with all fields
 * AC-2.1.2: Industry sector tagging
 * AC-2.1.3: Asset types selection
 * AC-3.1.3: Portfolio created and saved to database
 * AC-3.1.4: Enforce 5 portfolio limit
 *
 * @param userId - User ID creating the portfolio
 * @param input - Portfolio creation input (name, baseCurrency, industrySector, assetTypes)
 * @returns Created portfolio with asset types
 * @throws PortfolioLimitError if user already has 5 portfolios
 */
export async function createPortfolio(
  userId: string,
  input: CreatePortfolioInput
): Promise<PortfolioWithAssetTypes> {
  // Check portfolio limit before creating
  const currentCount = await getPortfolioCount(userId);

  if (currentCount >= MAX_PORTFOLIOS_PER_USER) {
    throw new PortfolioLimitError();
  }

  const newPortfolio: NewPortfolio = {
    userId,
    name: input.name,
    baseCurrency: input.baseCurrency,
    industrySector: input.industrySector,
  };

  // Use transaction to create portfolio and asset types together
  const result = await db.transaction(async (tx) => {
    // Insert portfolio
    const portfolioResult = await tx.insert(portfolios).values(newPortfolio).returning();

    const createdPortfolio = portfolioResult[0];
    if (!createdPortfolio) {
      throw new Error("Failed to create portfolio");
    }

    // Insert accepted asset types
    const assetTypeRecords: NewPortfolioAcceptedAssetType[] = input.assetTypes.map((assetType) => ({
      portfolioId: createdPortfolio.id,
      assetType,
    }));

    await tx.insert(portfolioAcceptedAssetTypes).values(assetTypeRecords);

    logger.info("Portfolio created", {
      userId,
      portfolioId: createdPortfolio.id,
      name: createdPortfolio.name,
      industrySector: createdPortfolio.industrySector,
      baseCurrency: createdPortfolio.baseCurrency,
      assetTypesCount: input.assetTypes.length,
    });

    return {
      ...createdPortfolio,
      acceptedAssetTypes: input.assetTypes,
    };
  });

  return result;
}

// =============================================================================
// UPDATE PORTFOLIO FUNCTIONS
// Story 2.3: Edit Portfolio
// =============================================================================

/**
 * Impact analysis result for portfolio updates
 * Story 2.3: Edit Portfolio - AC-2.3.3, AC-2.3.4
 */
export interface ImpactAnalysisResult {
  assetsToRemove: Array<{
    id: string;
    symbol: string;
    name: string | null;
    assetType: string;
  }>;
  removedAssetCount: number;
  hasImpact: boolean;
}

/**
 * Analyze impact of proposed portfolio changes
 *
 * Story 2.3: Edit Portfolio - AC-2.3.3, AC-2.3.4
 *
 * Currently, the portfolio_assets table does NOT have an asset_type column,
 * so we cannot determine which assets would be impacted by asset type changes.
 *
 * For now, this function returns an empty impact since:
 * - Industry sector is metadata-only (Option A from Dev Notes)
 * - Asset type filtering requires an asset_type column on portfolio_assets
 *
 * If the schema is updated to include asset_type on portfolio_assets,
 * this function should be updated to query impacted assets.
 *
 * @param userId - User ID for ownership verification
 * @param portfolioId - Portfolio ID to analyze
 * @param newAssetTypes - Optional new asset types to check against
 * @returns Impact analysis result
 * @throws PortfolioNotFoundError if portfolio doesn't exist or user doesn't own it
 */
export async function getImpactedAssets(
  userId: string,
  portfolioId: string,
  newAssetTypes?: AssetType[]
): Promise<ImpactAnalysisResult> {
  // Verify portfolio exists and belongs to user
  const portfolio = await getPortfolioById(userId, portfolioId);
  if (!portfolio) {
    throw new PortfolioNotFoundError();
  }

  // Currently, we cannot determine asset type impact without asset_type column on portfolio_assets
  // This is documented in Dev Notes - a follow-up story should add this field if needed
  if (newAssetTypes) {
    logger.info("Impact analysis requested but asset_type column not present on portfolio_assets", {
      userId,
      portfolioId,
      newAssetTypesCount: newAssetTypes.length,
    });
  }

  // Return no impact since we cannot query by asset type
  return {
    assetsToRemove: [],
    removedAssetCount: 0,
    hasImpact: false,
  };
}

/**
 * Update portfolio result
 * Story 2.3: Edit Portfolio
 */
export interface UpdatePortfolioResult {
  portfolio: PortfolioWithAssetTypes;
  removedAssetCount: number;
}

/**
 * Update a portfolio
 *
 * Story 2.3: Edit Portfolio
 * AC-2.3.2: Update name with success toast
 * AC-2.3.5: Remove incompatible assets if confirmed
 * AC-2.3.7: Currency change recalculates values
 *
 * Uses a transaction for atomic update + asset removal.
 *
 * @param userId - User ID for ownership verification
 * @param portfolioId - Portfolio ID to update
 * @param input - Update data (all fields optional, at least one required)
 * @param assetIdsToRemove - Optional array of asset IDs to remove (from impact confirmation)
 * @returns Updated portfolio with asset types
 * @throws PortfolioNotFoundError if portfolio doesn't exist or user doesn't own it
 */
export async function updatePortfolio(
  userId: string,
  portfolioId: string,
  input: UpdatePortfolioInput,
  assetIdsToRemove?: string[]
): Promise<UpdatePortfolioResult> {
  // Verify portfolio exists and belongs to user
  const existingPortfolio = await getPortfolioById(userId, portfolioId);
  if (!existingPortfolio) {
    throw new PortfolioNotFoundError();
  }

  const result = await db.transaction(async (tx) => {
    let removedAssetCount = 0;

    // Step 1: Delete impacted assets if any
    if (assetIdsToRemove && assetIdsToRemove.length > 0) {
      const deleteResult = await tx
        .delete(portfolioAssets)
        .where(
          and(
            eq(portfolioAssets.portfolioId, portfolioId),
            inArray(portfolioAssets.id, assetIdsToRemove)
          )
        )
        .returning({ id: portfolioAssets.id });

      removedAssetCount = deleteResult.length;

      logger.info("Removed assets from portfolio during update", {
        userId,
        portfolioId,
        removedAssetCount,
        assetIdsCount: assetIdsToRemove.length,
      });
    }

    // Step 2: Update portfolio fields
    const updateData: Partial<{
      name: string;
      baseCurrency: string;
      industrySector: string;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.baseCurrency !== undefined) {
      updateData.baseCurrency = input.baseCurrency;
    }
    if (input.industrySector !== undefined) {
      updateData.industrySector = input.industrySector;
    }

    const portfolioResult = await tx
      .update(portfolios)
      .set(updateData)
      .where(eq(portfolios.id, portfolioId))
      .returning();

    const updatedPortfolio = portfolioResult[0];
    if (!updatedPortfolio) {
      throw new Error("Failed to update portfolio");
    }

    // Step 3: Update asset types if provided
    let acceptedAssetTypes: AssetType[];

    if (input.assetTypes !== undefined) {
      // Delete existing asset types
      await tx
        .delete(portfolioAcceptedAssetTypes)
        .where(eq(portfolioAcceptedAssetTypes.portfolioId, portfolioId));

      // Insert new asset types
      const assetTypeRecords: NewPortfolioAcceptedAssetType[] = input.assetTypes.map(
        (assetType) => ({
          portfolioId,
          assetType,
        })
      );

      await tx.insert(portfolioAcceptedAssetTypes).values(assetTypeRecords);

      acceptedAssetTypes = input.assetTypes;
    } else {
      // Fetch current asset types if not updating
      const currentAssetTypes = await tx.query.portfolioAcceptedAssetTypes.findMany({
        where: eq(portfolioAcceptedAssetTypes.portfolioId, portfolioId),
      });
      acceptedAssetTypes = currentAssetTypes.map((at) => at.assetType as AssetType);
    }

    logger.info("Portfolio updated", {
      userId,
      portfolioId,
      name: updatedPortfolio.name,
      baseCurrency: updatedPortfolio.baseCurrency,
      industrySector: updatedPortfolio.industrySector,
      assetTypesCount: acceptedAssetTypes.length,
      removedAssetCount,
    });

    return {
      portfolio: {
        ...updatedPortfolio,
        acceptedAssetTypes,
      },
      removedAssetCount,
    };
  });

  return result;
}

/**
 * Delete a portfolio
 *
 * Story 2.4: Delete Portfolio
 * AC-2.4.7: Multi-tenant isolation - Only deletes if portfolio belongs to the userId
 * AC-2.4.4: Cascade deletes holdings via FK constraint
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to delete
 * @returns true if deleted, false if not found or not owned by user
 */
export async function deletePortfolio(userId: string, portfolioId: string): Promise<boolean> {
  // AC-2.4.7: Verify ownership in WHERE clause
  const result = await db
    .delete(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)))
    .returning({ id: portfolios.id });

  const deleted = result.length > 0;

  if (deleted) {
    logger.info("Portfolio deleted", {
      userId,
      portfolioId,
    });
  } else {
    logger.warn("Portfolio deletion failed - not found or not owned", {
      userId,
      portfolioId,
    });
  }

  return deleted;
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

/**
 * Similar portfolio name result
 * Story 2.1: Create Portfolio - AC-2.1.4
 */
export interface SimilarPortfolioResult {
  id: string;
  name: string;
  similarity: "exact" | "similar";
}

/**
 * Check for similar portfolio names
 *
 * Story 2.1: Create Portfolio - AC-2.1.4
 * Returns portfolios with similar names (case-insensitive match or fuzzy match)
 *
 * @param userId - User ID to check portfolios for
 * @param name - Name to check for similarity
 * @param excludePortfolioId - Optional portfolio ID to exclude (for edit scenarios)
 * @returns Array of similar portfolios
 */
export async function checkSimilarPortfolioName(
  userId: string,
  name: string,
  excludePortfolioId?: string
): Promise<SimilarPortfolioResult[]> {
  const trimmedName = name.trim().toLowerCase();

  if (!trimmedName) {
    return [];
  }

  // Get all user portfolios
  const userPortfolios = await db.query.portfolios.findMany({
    where: excludePortfolioId
      ? and(eq(portfolios.userId, userId), ne(portfolios.id, excludePortfolioId))
      : eq(portfolios.userId, userId),
    columns: {
      id: true,
      name: true,
    },
  });

  const results: SimilarPortfolioResult[] = [];

  for (const portfolio of userPortfolios) {
    const portfolioNameLower = portfolio.name.toLowerCase();

    // Check for exact match (case-insensitive)
    if (portfolioNameLower === trimmedName) {
      results.push({
        id: portfolio.id,
        name: portfolio.name,
        similarity: "exact",
      });
      continue;
    }

    // Check for substring match (name contains input or input contains name)
    if (portfolioNameLower.includes(trimmedName) || trimmedName.includes(portfolioNameLower)) {
      results.push({
        id: portfolio.id,
        name: portfolio.name,
        similarity: "similar",
      });
      continue;
    }

    // Check for Levenshtein distance (simple fuzzy match)
    const distance = levenshteinDistance(trimmedName, portfolioNameLower);
    const maxLength = Math.max(trimmedName.length, portfolioNameLower.length);
    const similarity = 1 - distance / maxLength;

    // Consider similar if more than 70% similar
    if (similarity > 0.7) {
      results.push({
        id: portfolio.id,
        name: portfolio.name,
        similarity: "similar",
      });
    }
  }

  return results;
}

/**
 * Levenshtein distance calculation for fuzzy matching
 * Used for AC-2.1.4 duplicate name detection
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    if (matrix[0]) {
      matrix[0][j] = j;
    }
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const charB = b.charAt(i - 1);
      const charA = a.charAt(j - 1);

      if (charB === charA) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Get all portfolios for a user with their accepted asset types
 *
 * Story 2.1: Create Portfolio
 * Multi-tenant isolation: Only returns portfolios belonging to the userId
 *
 * @param userId - User ID to fetch portfolios for
 * @returns Array of user's portfolios with asset types, ordered by creation date (newest first)
 */
export async function getUserPortfoliosWithAssetTypes(
  userId: string
): Promise<PortfolioWithAssetTypes[]> {
  const userPortfolios = await db.query.portfolios.findMany({
    where: eq(portfolios.userId, userId),
    orderBy: (portfolios, { desc }) => [desc(portfolios.createdAt)],
    with: {
      acceptedAssetTypes: true,
    },
  });

  return userPortfolios.map((portfolio) => ({
    ...portfolio,
    acceptedAssetTypes: portfolio.acceptedAssetTypes.map((at) => at.assetType as AssetType),
  }));
}

/**
 * Get a single portfolio with its accepted asset types
 *
 * Story 2.1: Create Portfolio
 * Multi-tenant isolation: Only returns if portfolio belongs to the userId
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to fetch
 * @returns Portfolio with asset types or null if not found/not owned by user
 */
export async function getPortfolioWithAssetTypes(
  userId: string,
  portfolioId: string
): Promise<PortfolioWithAssetTypes | null> {
  const result = await db.query.portfolios.findFirst({
    where: and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)),
    with: {
      acceptedAssetTypes: true,
    },
  });

  if (!result) {
    return null;
  }

  return {
    ...result,
    acceptedAssetTypes: result.acceptedAssetTypes.map((at) => at.assetType as AssetType),
  };
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

    // Story 2.5, AC-2.5.9: Audit trail logging for asset addition
    logger.info("Asset added to portfolio", {
      userId,
      portfolioId,
      assetId: createdAsset.id,
      symbol: createdAsset.symbol,
      name: createdAsset.name,
      quantity: createdAsset.quantity,
      currency: createdAsset.currency,
    });

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

  const updatedAsset = result[0];

  // Story 2.6, AC-2.6.2: Audit trail logging for asset updates
  logger.info("Asset updated", {
    userId,
    assetId,
    portfolioId: updatedAsset.portfolioId,
    symbol: updatedAsset.symbol,
    quantityUpdated: input.quantity !== undefined,
    priceUpdated: input.purchasePrice !== undefined,
  });

  return updatedAsset;
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
  /** Story 2.7: Separate exchange rate freshness for multi-currency display */
  exchangeRateFreshness: Date;
  /** Story 2.7: Unique currencies in portfolio for multi-currency indicator */
  currencies: string[];
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

  // Story 2.7: Extract unique currencies for multi-currency indicator
  const currencies = [...new Set(assets.filter((a) => !a.isIgnored).map((a) => a.currency))].sort();

  return {
    portfolio,
    assets: assetsWithValues,
    totalValueBase: totalValueBase.toFixed(4),
    totalActiveValueBase: totalActiveValueStr,
    baseCurrency,
    dataFreshness,
    // Story 2.7: Separate exchange rate freshness
    exchangeRateFreshness: oldestRateUpdate,
    currencies,
    assetCount,
    activeAssetCount,
    ignoredAssetCount,
  };
}
