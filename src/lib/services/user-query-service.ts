/**
 * User Query Service
 *
 * Story 8.2: Overnight Scoring Job
 * AC-8.2.3: User Portfolio Processing - query active users with portfolios
 *
 * Provides optimized queries for batch user processing.
 */

import { db, type Database } from "@/lib/db";
import { users, portfolios, portfolioAssets, criteriaVersions } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import type { CriterionRule } from "@/lib/db/schema";

/**
 * Active user with portfolio data for overnight processing
 */
export interface ActiveUserForScoring {
  userId: string;
  email: string;
  baseCurrency: string;
  portfolioId: string;
  portfolioName: string;
  assets: Array<{
    assetId: string;
    symbol: string;
    quantity: string;
    currency: string;
  }>;
  criteria: {
    versionId: string;
    assetType: string;
    targetMarket: string;
    rules: CriterionRule[];
  } | null;
}

/**
 * Batch of users for processing
 */
export interface UserBatch {
  users: ActiveUserForScoring[];
  offset: number;
  total: number;
}

/**
 * User Query Service
 *
 * Provides optimized queries for overnight batch processing.
 *
 * @example
 * ```typescript
 * const service = new UserQueryService();
 *
 * // Get all active users
 * const users = await service.getActiveUsersWithPortfolios();
 *
 * // Process in batches
 * let offset = 0;
 * const batchSize = 50;
 * while (true) {
 *   const batch = await service.getUserBatch(offset, batchSize);
 *   if (batch.users.length === 0) break;
 *   await processBatch(batch.users);
 *   offset += batchSize;
 * }
 * ```
 */
export class UserQueryService {
  constructor(private database: Database = db) {}

  /**
   * Get all active users with portfolios for overnight processing
   *
   * AC-8.2.3: Query users with active portfolios
   *
   * @returns Array of active users with their portfolios and criteria
   */
  async getActiveUsersWithPortfolios(): Promise<ActiveUserForScoring[]> {
    // Step 1: Get all active users (not deleted)
    const activeUsers = await this.database
      .select({
        userId: users.id,
        email: users.email,
        baseCurrency: users.baseCurrency,
      })
      .from(users)
      .where(isNull(users.deletedAt));

    if (activeUsers.length === 0) {
      return [];
    }

    // Step 2: Get portfolios for these users
    const userIds = activeUsers.map((u) => u.userId);
    const userPortfolios = await this.database
      .select({
        userId: portfolios.userId,
        portfolioId: portfolios.id,
        portfolioName: portfolios.name,
      })
      .from(portfolios)
      .where(inArray(portfolios.userId, userIds));

    // Filter users who have at least one portfolio
    const usersWithPortfolios = activeUsers.filter((u) =>
      userPortfolios.some((p) => p.userId === u.userId)
    );

    if (usersWithPortfolios.length === 0) {
      return [];
    }

    // Step 3: Get portfolio assets
    const portfolioIds = userPortfolios.map((p) => p.portfolioId);
    const assets = await this.database
      .select({
        portfolioId: portfolioAssets.portfolioId,
        assetId: portfolioAssets.id,
        symbol: portfolioAssets.symbol,
        quantity: portfolioAssets.quantity,
        currency: portfolioAssets.currency,
        isIgnored: portfolioAssets.isIgnored,
      })
      .from(portfolioAssets)
      .where(inArray(portfolioAssets.portfolioId, portfolioIds));

    // Filter out ignored assets
    const activeAssets = assets.filter((a) => !a.isIgnored);

    // Step 4: Get active criteria versions for each user
    const criteriaResults = await this.database
      .select({
        userId: criteriaVersions.userId,
        versionId: criteriaVersions.id,
        assetType: criteriaVersions.assetType,
        targetMarket: criteriaVersions.targetMarket,
        criteria: criteriaVersions.criteria,
      })
      .from(criteriaVersions)
      .where(
        and(
          inArray(
            criteriaVersions.userId,
            usersWithPortfolios.map((u) => u.userId)
          ),
          eq(criteriaVersions.isActive, true)
        )
      );

    // Step 5: Assemble user data
    const result: ActiveUserForScoring[] = [];

    for (const user of usersWithPortfolios) {
      const userPortfolio = userPortfolios.find((p) => p.userId === user.userId);
      if (!userPortfolio) continue;

      const portfolioAssetsForUser = activeAssets
        .filter((a) => a.portfolioId === userPortfolio.portfolioId)
        .map((a) => ({
          assetId: a.assetId,
          symbol: a.symbol,
          quantity: a.quantity,
          currency: a.currency,
        }));

      // Skip users with no assets
      if (portfolioAssetsForUser.length === 0) continue;

      const userCriteria = criteriaResults.find((c) => c.userId === user.userId);

      result.push({
        userId: user.userId,
        email: user.email,
        baseCurrency: user.baseCurrency,
        portfolioId: userPortfolio.portfolioId,
        portfolioName: userPortfolio.portfolioName,
        assets: portfolioAssetsForUser,
        criteria: userCriteria
          ? {
              versionId: userCriteria.versionId,
              assetType: userCriteria.assetType,
              targetMarket: userCriteria.targetMarket,
              rules: userCriteria.criteria as CriterionRule[],
            }
          : null,
      });
    }

    return result;
  }

  /**
   * Get a batch of users for processing
   *
   * AC-8.2.3: Users are processed in batches of 50 for efficiency
   *
   * @param offset - Starting offset
   * @param limit - Batch size (default: 50)
   * @returns Batch of users with metadata
   */
  async getUserBatch(offset: number, limit: number = 50): Promise<UserBatch> {
    // For simplicity, we get all users and slice
    // In production, this could be optimized with proper pagination
    const allUsers = await this.getActiveUsersWithPortfolios();

    return {
      users: allUsers.slice(offset, offset + limit),
      offset,
      total: allUsers.length,
    };
  }

  /**
   * Get count of active users with portfolios
   *
   * Useful for progress tracking and metrics
   */
  async getActiveUserCount(): Promise<number> {
    const users = await this.getActiveUsersWithPortfolios();
    return users.length;
  }

  /**
   * Get unique asset symbols across all user portfolios
   *
   * Used for batch price fetching
   *
   * @returns Array of unique asset symbols
   */
  async getUniqueAssetSymbols(): Promise<string[]> {
    const assets = await this.database
      .select({
        symbol: portfolioAssets.symbol,
      })
      .from(portfolioAssets)
      .where(eq(portfolioAssets.isIgnored, false));

    const uniqueSymbols = [...new Set(assets.map((a) => a.symbol))];
    return uniqueSymbols;
  }

  /**
   * Get unique currencies across all user portfolios
   *
   * Used for batch exchange rate fetching
   *
   * @returns Array of unique currency codes
   */
  async getUniqueCurrencies(): Promise<string[]> {
    // Get portfolio asset currencies
    const assetCurrencies = await this.database
      .select({
        currency: portfolioAssets.currency,
      })
      .from(portfolioAssets);

    // Get user base currencies
    const userCurrencies = await this.database
      .select({
        baseCurrency: users.baseCurrency,
      })
      .from(users)
      .where(isNull(users.deletedAt));

    const allCurrencies = [
      ...assetCurrencies.map((a) => a.currency),
      ...userCurrencies.map((u) => u.baseCurrency),
    ];

    return [...new Set(allCurrencies)];
  }
}

/**
 * Default user query service instance
 */
export const userQueryService = new UserQueryService();
