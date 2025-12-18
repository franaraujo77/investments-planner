/**
 * Dashboard Service
 *
 * Story 8.5: Instant Dashboard Load
 * AC-8.5.1: Dashboard API Reads from Cache First
 * AC-8.5.2: Dashboard API Falls Back to PostgreSQL
 * AC-8.5.3: Dashboard Response Includes Cache Indicator
 *
 * Provides cache-first data fetching for the dashboard:
 * 1. Reads from Vercel KV cache (RecommendationCacheService)
 * 2. Falls back to PostgreSQL if cache miss
 * 3. Returns fromCache indicator for client display
 */

import {
  RecommendationCacheService,
  recommendationCacheService,
  type CachedRecommendations,
  type CachedPortfolioSummary,
} from "@/lib/cache/recommendation-cache";
import { RecommendationService, recommendationService } from "./recommendation-service";
import { db } from "@/lib/db";
import { portfolios, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dashboard recommendation item
 * Matches tech spec DashboardResponse.data.recommendations[]
 */
export interface DashboardRecommendationItem {
  assetId: string;
  symbol: string;
  score: string;
  amount: string;
  currency: string;
  allocationGap: string;
  breakdown: {
    criteriaCount: number;
    topContributor: string;
  };
}

/**
 * Dashboard portfolio summary
 * Matches tech spec DashboardResponse.data.portfolioSummary
 */
export interface DashboardPortfolioSummary {
  totalValue: string;
  baseCurrency: string;
  allocations: Record<string, string>;
}

/**
 * Dashboard data freshness info
 * Matches tech spec DashboardResponse.data.dataFreshness
 */
export interface DashboardDataFreshness {
  generatedAt: string;
  pricesAsOf: string;
  ratesAsOf: string;
}

/**
 * Complete dashboard response data
 * Matches tech spec DashboardResponse.data
 */
export interface DashboardData {
  recommendations: DashboardRecommendationItem[];
  portfolioSummary: DashboardPortfolioSummary;
  totalInvestable: string;
  baseCurrency: string;
  dataFreshness: DashboardDataFreshness;
  fromCache: boolean;
}

/**
 * Dashboard service result
 */
export interface DashboardResult {
  success: boolean;
  data: DashboardData | null;
  error?: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Dashboard Service
 *
 * Implements cache-first pattern for instant dashboard loading.
 *
 * @example
 * ```typescript
 * const dashboardService = new DashboardService();
 * const result = await dashboardService.getDashboardData(userId);
 *
 * if (result.success && result.data) {
 *   console.log(`Loaded from cache: ${result.data.fromCache}`);
 *   console.log(`Recommendations: ${result.data.recommendations.length}`);
 * }
 * ```
 */
export class DashboardService {
  constructor(
    private cacheService: RecommendationCacheService = recommendationCacheService,
    private recService: RecommendationService = recommendationService
  ) {}

  /**
   * Get dashboard data with cache-first strategy
   *
   * AC-8.5.1: Reads from Vercel KV cache first
   * AC-8.5.2: Falls back to PostgreSQL if cache miss
   * AC-8.5.3: Returns fromCache indicator
   *
   * @param userId - User ID to fetch dashboard data for
   * @returns Dashboard result with data and cache indicator
   */
  async getDashboardData(userId: string): Promise<DashboardResult> {
    const startTime = Date.now();

    try {
      // AC-8.5.1: Try cache first
      const cacheResult = await this.tryCache(userId);

      if (cacheResult) {
        const durationMs = Date.now() - startTime;
        logger.info("Dashboard cache hit", {
          userId,
          durationMs,
          recommendationCount: cacheResult.recommendations.length,
        });

        return {
          success: true,
          data: cacheResult,
        };
      }

      // AC-8.5.2: Fall back to PostgreSQL
      logger.debug("Dashboard cache miss, falling back to database", { userId });

      const dbResult = await this.tryDatabase(userId);

      if (dbResult) {
        const durationMs = Date.now() - startTime;
        logger.info("Dashboard database fallback success", {
          userId,
          durationMs,
          recommendationCount: dbResult.recommendations.length,
        });

        return {
          success: true,
          data: dbResult,
        };
      }

      // No data available from either source
      logger.debug("No dashboard data available", { userId });

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;

      logger.error("Dashboard data fetch failed", {
        userId,
        durationMs,
        error: errorMessage,
      });

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  // ===========================================================================
  // PRIVATE METHODS - CACHE
  // ===========================================================================

  /**
   * Try to get dashboard data from cache
   *
   * AC-8.5.1: Cache key pattern is recs:${userId}
   *
   * @param userId - User ID
   * @returns Dashboard data with fromCache: true, or null if cache miss
   */
  private async tryCache(userId: string): Promise<DashboardData | null> {
    try {
      const cacheResult = await this.cacheService.get(userId);

      if (!cacheResult.data) {
        return null;
      }

      // Get portfolio summary from cache
      const portfolioResult = await this.cacheService.getPortfolio(userId);

      // Transform cached data to dashboard format
      return this.transformCacheToResponse(cacheResult.data, portfolioResult.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Cache read failed, will try database", {
        userId,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Transform cached data to DashboardData format
   *
   * AC-8.5.3: Sets fromCache: true
   */
  private transformCacheToResponse(
    cached: CachedRecommendations,
    portfolio: CachedPortfolioSummary | null
  ): DashboardData {
    // Transform recommendations
    const recommendations: DashboardRecommendationItem[] = cached.recommendations.map((rec) => ({
      assetId: rec.assetId,
      symbol: rec.symbol,
      score: rec.score,
      amount: rec.amount,
      currency: cached.portfolioSummary.baseCurrency,
      allocationGap: rec.allocationGap,
      breakdown: rec.breakdown,
    }));

    // Build portfolio summary
    const portfolioSummary: DashboardPortfolioSummary = {
      totalValue: portfolio?.totalValue ?? cached.portfolioSummary.totalValue,
      baseCurrency: cached.portfolioSummary.baseCurrency,
      allocations: cached.portfolioSummary.allocations,
    };

    return {
      recommendations,
      portfolioSummary,
      totalInvestable: cached.totalInvestable,
      baseCurrency: cached.portfolioSummary.baseCurrency,
      dataFreshness: {
        generatedAt: cached.generatedAt,
        pricesAsOf: cached.dataFreshness.pricesAsOf,
        ratesAsOf: cached.dataFreshness.ratesAsOf,
      },
      fromCache: true,
    };
  }

  // ===========================================================================
  // PRIVATE METHODS - DATABASE FALLBACK
  // ===========================================================================

  /**
   * Fall back to PostgreSQL for dashboard data
   *
   * AC-8.5.2: Query latest recommendations from database
   *
   * @param userId - User ID
   * @returns Dashboard data with fromCache: false, or null if no data
   */
  private async tryDatabase(userId: string): Promise<DashboardData | null> {
    try {
      // Get user's portfolio
      const portfolio = await db.query.portfolios.findFirst({
        where: eq(portfolios.userId, userId),
      });

      if (!portfolio) {
        logger.debug("No portfolio found for user", { userId });
        return null;
      }

      // Get user's base currency
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { baseCurrency: true, defaultContribution: true },
      });

      if (!user) {
        logger.debug("User not found", { userId });
        return null;
      }

      // Try to get latest recommendation from database
      const cachedRec = await this.recService.getCachedRecommendation(userId);

      if (cachedRec) {
        // Transform database recommendation to dashboard format
        return this.transformDatabaseToResponse(cachedRec, user.baseCurrency);
      }

      // No recommendations available - user needs to generate them first
      logger.debug("No recommendations found in database", { userId });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Database fallback failed", {
        userId,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Transform database recommendation to DashboardData format
   *
   * AC-8.5.3: Sets fromCache: false
   */
  private transformDatabaseToResponse(
    rec: NonNullable<Awaited<ReturnType<RecommendationService["getCachedRecommendation"]>>>,
    baseCurrency: string
  ): DashboardData {
    // Build allocations map from recommendation items
    const allocations: Record<string, string> = {};

    // Calculate total value from recommendations (approximation)
    const totalValue = "0";
    for (const item of rec.items) {
      // Group by class from breakdown if available
      const className = item.breakdown?.className || "Unknown";
      const current = allocations[className] || "0";
      allocations[className] = String(parseFloat(current) + parseFloat(item.currentAllocation));
    }

    // Transform recommendations
    const recommendations: DashboardRecommendationItem[] = rec.items.map((item) => ({
      assetId: item.assetId,
      symbol: item.symbol,
      score: item.score,
      amount: item.recommendedAmount,
      currency: baseCurrency,
      allocationGap: item.allocationGap,
      breakdown: {
        // criteriaCount not available in RecommendationItemBreakdown - use default
        criteriaCount: 0,
        topContributor: item.breakdown?.className || "Unknown",
      },
    }));

    return {
      recommendations,
      portfolioSummary: {
        totalValue,
        baseCurrency,
        allocations,
      },
      totalInvestable: rec.totalInvestable,
      baseCurrency,
      dataFreshness: {
        generatedAt: rec.generatedAt.toISOString(),
        pricesAsOf: rec.generatedAt.toISOString(), // Approximation from generation time
        ratesAsOf: rec.generatedAt.toISOString(), // Approximation from generation time
      },
      fromCache: false,
    };
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default dashboard service instance
 */
export const dashboardService = new DashboardService();
