/**
 * Alert Detection Service
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.1: Alert triggered when better asset exists (10+ points higher)
 * AC-9.1.4: Alert deduplication for same asset pair
 * AC-9.1.6: Alert respects user preferences (opportunityAlertsEnabled)
 *
 * Detects opportunity alerts after scoring by comparing:
 * - User's portfolio assets
 * - Other available assets in the same class
 * - Score differences of 10+ points
 *
 * Integration point: Called from overnight-scoring.ts after scores computed.
 */

import { db, type Database } from "@/lib/db";
import { portfolioAssets, portfolios, assetScores, assetClasses } from "@/lib/db/schema";
import { eq, and, desc, notInArray, isNotNull } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import Decimal from "decimal.js";
import {
  AlertService,
  alertService,
  OPPORTUNITY_SCORE_THRESHOLD,
  type AssetClassDriftDetails,
} from "./alert-service";
import { AlertPreferencesService, alertPreferencesService } from "./alert-preferences-service";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result from opportunity alert detection
 */
export interface OpportunityDetectionResult {
  /** User ID processed */
  userId: string;
  /** Portfolio ID processed */
  portfolioId: string;
  /** Number of asset classes analyzed */
  classesAnalyzed: number;
  /** Number of user assets checked */
  assetsChecked: number;
  /** Number of new alerts created */
  alertsCreated: number;
  /** Number of existing alerts updated */
  alertsUpdated: number;
  /** Number of alerts skipped (deduplication) */
  alertsSkipped: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if any */
  error?: string;
}

/**
 * Result from drift alert detection
 *
 * Story 9.2: Allocation Drift Alert
 */
export interface DriftDetectionResult {
  /** User ID processed */
  userId: string;
  /** Portfolio ID processed */
  portfolioId: string;
  /** Number of asset classes analyzed */
  classesAnalyzed: number;
  /** Number of new alerts created */
  alertsCreated: number;
  /** Number of existing alerts updated */
  alertsUpdated: number;
  /** Number of alerts auto-dismissed (allocation returned to range) */
  alertsDismissed: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if any */
  error?: string;
}

/**
 * Internal type for asset with score
 */
interface AssetWithScore {
  assetId: string;
  symbol: string;
  score: Decimal;
  classId: string;
  className: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Alert Detection Service
 *
 * Detects opportunity alerts by comparing user's portfolio assets
 * with other available assets in the same class.
 *
 * @example
 * ```typescript
 * const detectionService = new AlertDetectionService();
 *
 * // Detect opportunities after overnight scoring
 * const result = await detectionService.detectOpportunityAlerts(
 *   userId,
 *   portfolioId
 * );
 *
 * console.log(`Created ${result.alertsCreated} alerts`);
 * ```
 */
export class AlertDetectionService {
  constructor(
    private database: Database = db,
    private alerts: AlertService = alertService,
    private preferences: AlertPreferencesService = alertPreferencesService
  ) {}

  /**
   * Detect opportunity alerts for a user's portfolio
   *
   * AC-9.1.1: Alert created when better asset exists (10+ points higher)
   * AC-9.1.4: Deduplication - no duplicate for same asset pair
   * AC-9.1.6: Respects opportunityAlertsEnabled preference
   *
   * @param userId - User ID (tenant isolation)
   * @param portfolioId - Portfolio ID to analyze
   * @returns Detection result with metrics
   */
  async detectOpportunityAlerts(
    userId: string,
    portfolioId: string
  ): Promise<OpportunityDetectionResult> {
    const startTime = Date.now();
    const result: OpportunityDetectionResult = {
      userId,
      portfolioId,
      classesAnalyzed: 0,
      assetsChecked: 0,
      alertsCreated: 0,
      alertsUpdated: 0,
      alertsSkipped: 0,
      durationMs: 0,
    };

    try {
      // AC-9.1.6: Check if opportunity alerts are enabled
      const alertsEnabled = await this.preferences.isOpportunityAlertsEnabled(userId);
      if (!alertsEnabled) {
        logger.info("Opportunity alerts disabled for user, skipping detection", {
          userId,
          portfolioId,
        });
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // Get user's portfolio assets grouped by class
      const userAssets = await this.getUserPortfolioAssets(userId, portfolioId);
      if (userAssets.length === 0) {
        logger.debug("No portfolio assets found for opportunity detection", {
          userId,
          portfolioId,
        });
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // Get unique class IDs
      const classIds = [...new Set(userAssets.map((a) => a.classId))];
      result.classesAnalyzed = classIds.length;

      // For each asset class, find opportunities
      for (const classId of classIds) {
        const classAssets = userAssets.filter((a) => a.classId === classId);
        if (classAssets.length === 0) continue;

        const className = classAssets[0]?.className ?? "Unknown";

        // Get all other assets in this class that user doesn't hold
        const otherAssets = await this.getOtherAssetsInClass(userId, portfolioId, classId);

        // Compare each user asset with other assets
        for (const userAsset of classAssets) {
          result.assetsChecked++;

          const detection = await this.checkForBetterAssets(
            userId,
            userAsset,
            otherAssets,
            classId,
            className
          );

          result.alertsCreated += detection.created;
          result.alertsUpdated += detection.updated;
          result.alertsSkipped += detection.skipped;
        }
      }

      result.durationMs = Date.now() - startTime;

      logger.info("Opportunity alert detection completed", {
        userId,
        portfolioId,
        classesAnalyzed: result.classesAnalyzed,
        assetsChecked: result.assetsChecked,
        alertsCreated: result.alertsCreated,
        alertsUpdated: result.alertsUpdated,
        alertsSkipped: result.alertsSkipped,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      result.durationMs = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : "Unknown error";

      logger.error("Opportunity alert detection failed", {
        userId,
        portfolioId,
        error: result.error,
        durationMs: result.durationMs,
      });

      return result;
    }
  }

  /**
   * Get user's portfolio assets with their latest scores
   */
  private async getUserPortfolioAssets(
    userId: string,
    portfolioId: string
  ): Promise<AssetWithScore[]> {
    // Get portfolio assets with class info
    const assets = await this.database
      .select({
        assetId: portfolioAssets.id,
        symbol: portfolioAssets.symbol,
        classId: portfolioAssets.assetClassId,
        className: assetClasses.name,
      })
      .from(portfolioAssets)
      .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
      .leftJoin(assetClasses, eq(portfolioAssets.assetClassId, assetClasses.id))
      .where(
        and(
          eq(portfolioAssets.portfolioId, portfolioId),
          eq(portfolios.userId, userId),
          eq(portfolioAssets.isIgnored, false)
        )
      );

    // Get latest scores for these assets
    const result: AssetWithScore[] = [];

    for (const asset of assets) {
      if (!asset.classId) continue; // Skip unclassified assets

      const scores = await this.database
        .select({ score: assetScores.score })
        .from(assetScores)
        .where(and(eq(assetScores.userId, userId), eq(assetScores.assetId, asset.assetId)))
        .orderBy(desc(assetScores.calculatedAt))
        .limit(1);

      const latestScore = scores[0];

      if (latestScore?.score) {
        result.push({
          assetId: asset.assetId,
          symbol: asset.symbol,
          score: new Decimal(latestScore.score),
          classId: asset.classId,
          className: asset.className ?? "Unknown",
        });
      }
    }

    return result;
  }

  /**
   * Get other scored assets in the same class that user doesn't hold
   *
   * Note: For MVP, this queries assets from the same user's other portfolios
   * that are in the same class but not in the current portfolio.
   * Future enhancement: Query from a global asset universe.
   */
  private async getOtherAssetsInClass(
    userId: string,
    portfolioId: string,
    classId: string
  ): Promise<AssetWithScore[]> {
    // Get user's portfolio asset IDs to exclude
    const userAssetRows = await this.database
      .select({ assetId: portfolioAssets.id })
      .from(portfolioAssets)
      .where(eq(portfolioAssets.portfolioId, portfolioId));

    const excludeIds = userAssetRows.map((a) => a.assetId);

    // Query other assets in same class from user's other portfolios
    // For MVP, we only compare within user's assets (same user, different portfolios or same class)
    const otherAssetsQuery = await this.database
      .select({
        assetId: portfolioAssets.id,
        symbol: portfolioAssets.symbol,
      })
      .from(portfolioAssets)
      .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
      .where(
        and(
          eq(portfolioAssets.assetClassId, classId),
          eq(portfolios.userId, userId),
          excludeIds.length > 0 ? notInArray(portfolioAssets.id, excludeIds) : undefined
        )
      );

    // Get latest scores for these assets
    const result: AssetWithScore[] = [];

    for (const asset of otherAssetsQuery) {
      const scores = await this.database
        .select({ score: assetScores.score })
        .from(assetScores)
        .where(and(eq(assetScores.userId, userId), eq(assetScores.assetId, asset.assetId)))
        .orderBy(desc(assetScores.calculatedAt))
        .limit(1);

      const latestScore = scores[0];

      if (latestScore?.score) {
        result.push({
          assetId: asset.assetId,
          symbol: asset.symbol,
          score: new Decimal(latestScore.score),
          classId,
          className: "", // Not needed for comparison
        });
      }
    }

    return result;
  }

  /**
   * Check if any other asset scores significantly higher than user's asset
   *
   * AC-9.1.1: Another asset scores 10+ points higher
   * AC-9.1.4: Deduplication and update logic
   */
  private async checkForBetterAssets(
    userId: string,
    userAsset: AssetWithScore,
    otherAssets: AssetWithScore[],
    classId: string,
    className: string
  ): Promise<{ created: number; updated: number; skipped: number }> {
    const result = { created: 0, updated: 0, skipped: 0 };

    // Find all assets that score 10+ points higher
    const betterAssets = otherAssets
      .filter((other) => {
        const scoreDiff = other.score.minus(userAsset.score);
        return scoreDiff.gte(OPPORTUNITY_SCORE_THRESHOLD);
      })
      .sort((a, b) => b.score.minus(a.score).toNumber()); // Highest score first

    if (betterAssets.length === 0) {
      return result;
    }

    // Create alert for the best alternative (highest scoring)
    const bestAlternative = betterAssets[0];
    if (!bestAlternative) {
      return result;
    }

    const scoreDifference = bestAlternative.score.minus(userAsset.score);

    // AC-9.1.4: Check for existing alert (deduplication)
    const existingAlert = await this.alerts.findExistingAlert(
      userId,
      userAsset.assetId,
      bestAlternative.assetId
    );

    if (existingAlert) {
      // Try to update if score difference changed significantly
      const updated = await this.alerts.updateAlertIfChanged(
        existingAlert.id,
        scoreDifference,
        {
          id: userAsset.assetId,
          symbol: userAsset.symbol,
          score: userAsset.score,
        },
        {
          id: bestAlternative.assetId,
          symbol: bestAlternative.symbol,
          score: bestAlternative.score,
        }
      );

      if (updated) {
        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      // Create new alert
      await this.alerts.createOpportunityAlert(
        userId,
        {
          id: userAsset.assetId,
          symbol: userAsset.symbol,
          score: userAsset.score,
        },
        {
          id: bestAlternative.assetId,
          symbol: bestAlternative.symbol,
          score: bestAlternative.score,
        },
        { id: classId, name: className }
      );

      result.created++;

      logger.debug("Opportunity alert created", {
        userId,
        currentAsset: userAsset.symbol,
        betterAsset: bestAlternative.symbol,
        scoreDifference: scoreDifference.toString(),
      });
    }

    return result;
  }

  // ===========================================================================
  // DRIFT ALERT DETECTION (Story 9.2: Allocation Drift Alert)
  // ===========================================================================

  /**
   * Detect allocation drift alerts for a user's portfolio
   *
   * AC-9.2.1: Alert created when allocation drifts outside target range
   * AC-9.2.4: Uses user's configured drift threshold (default 5%)
   * AC-9.2.5: Respects driftAlertsEnabled preference
   * AC-9.2.6: Auto-dismisses alerts when allocation returns to range
   * AC-9.2.7: Deduplication - no duplicate for same asset class
   *
   * @param userId - User ID (tenant isolation)
   * @param portfolioId - Portfolio ID to analyze
   * @returns Detection result with metrics
   */
  async detectDriftAlerts(userId: string, portfolioId: string): Promise<DriftDetectionResult> {
    const startTime = Date.now();
    const result: DriftDetectionResult = {
      userId,
      portfolioId,
      classesAnalyzed: 0,
      alertsCreated: 0,
      alertsUpdated: 0,
      alertsDismissed: 0,
      durationMs: 0,
    };

    try {
      // AC-9.2.5: Check if drift alerts are enabled
      const alertsEnabled = await this.preferences.isDriftAlertsEnabled(userId);
      if (!alertsEnabled) {
        logger.info("Drift alerts disabled for user, skipping detection", {
          userId,
          portfolioId,
        });
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // AC-9.2.4: Get user's drift threshold
      const thresholdStr = await this.preferences.getDriftThreshold(userId);
      const driftThreshold = new Decimal(thresholdStr);

      // Get all asset classes with target allocation ranges for this user
      const userAssetClasses = await this.database
        .select()
        .from(assetClasses)
        .where(
          and(
            eq(assetClasses.userId, userId),
            isNotNull(assetClasses.targetMin),
            isNotNull(assetClasses.targetMax)
          )
        );

      if (userAssetClasses.length === 0) {
        logger.debug("No asset classes with target ranges found for drift detection", {
          userId,
          portfolioId,
        });
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // Get portfolio assets with values grouped by class
      const portfolioAssetsData = await this.database
        .select({
          assetClassId: portfolioAssets.assetClassId,
          quantity: portfolioAssets.quantity,
          purchasePrice: portfolioAssets.purchasePrice,
        })
        .from(portfolioAssets)
        .where(
          and(eq(portfolioAssets.portfolioId, portfolioId), eq(portfolioAssets.isIgnored, false))
        );

      // Calculate total portfolio value and per-class values
      let totalValue = new Decimal(0);
      const classValues = new Map<string, Decimal>();

      for (const asset of portfolioAssetsData) {
        const value = new Decimal(asset.quantity || "0").times(
          new Decimal(asset.purchasePrice || "0")
        );
        totalValue = totalValue.plus(value);

        if (asset.assetClassId) {
          const currentClassValue = classValues.get(asset.assetClassId) ?? new Decimal(0);
          classValues.set(asset.assetClassId, currentClassValue.plus(value));
        }
      }

      // Cannot calculate allocation percentages if portfolio has no value
      if (totalValue.isZero()) {
        logger.debug("Portfolio has no value, skipping drift detection", {
          userId,
          portfolioId,
        });
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // Check each asset class for drift
      for (const assetClass of userAssetClasses) {
        result.classesAnalyzed++;

        // Skip classes without target ranges
        if (!assetClass.targetMin || !assetClass.targetMax) {
          continue;
        }

        const classValue = classValues.get(assetClass.id) ?? new Decimal(0);
        const currentAllocation = classValue.dividedBy(totalValue).times(100);

        const targetMin = new Decimal(assetClass.targetMin);
        const targetMax = new Decimal(assetClass.targetMax);

        // Check if allocation is within range
        const isInRange = currentAllocation.gte(targetMin) && currentAllocation.lte(targetMax);

        // Calculate drift amount if out of range
        let driftAmount = new Decimal(0);
        if (currentAllocation.gt(targetMax)) {
          driftAmount = currentAllocation.minus(targetMax);
        } else if (currentAllocation.lt(targetMin)) {
          driftAmount = targetMin.minus(currentAllocation);
        }

        // Check for existing drift alert for this class
        const existingAlert = await this.alerts.findExistingDriftAlert(userId, assetClass.id);

        if (isInRange) {
          // AC-9.2.6: Auto-dismiss if allocation returned to range
          if (existingAlert) {
            await this.alerts.dismissAlert(userId, existingAlert.id);
            result.alertsDismissed++;

            logger.debug("Drift alert auto-dismissed - allocation back in range", {
              userId,
              assetClass: assetClass.name,
              currentAllocation: currentAllocation.toString(),
              targetRange: `${targetMin}-${targetMax}`,
            });
          }
        } else if (driftAmount.gt(driftThreshold)) {
          // Drift exceeds threshold - create or update alert
          const assetClassDetails: AssetClassDriftDetails = {
            id: assetClass.id,
            name: assetClass.name,
            targetMin: targetMin.toString(),
            targetMax: targetMax.toString(),
          };

          if (existingAlert) {
            // AC-9.2.7: Try to update if drift changed significantly
            const updated = await this.alerts.updateDriftAlertIfChanged(
              existingAlert.id,
              driftAmount,
              currentAllocation,
              driftThreshold
            );

            if (updated) {
              result.alertsUpdated++;
            }
            // If not updated, it's effectively skipped (no significant change)
          } else {
            // Create new drift alert
            await this.alerts.createDriftAlert(
              userId,
              assetClassDetails,
              currentAllocation,
              driftThreshold
            );
            result.alertsCreated++;

            logger.debug("Drift alert created", {
              userId,
              assetClass: assetClass.name,
              currentAllocation: currentAllocation.toString(),
              driftAmount: driftAmount.toString(),
              threshold: driftThreshold.toString(),
            });
          }
        }
        // If drift exists but below threshold, no action needed
      }

      result.durationMs = Date.now() - startTime;

      logger.info("Drift alert detection completed", {
        userId,
        portfolioId,
        classesAnalyzed: result.classesAnalyzed,
        alertsCreated: result.alertsCreated,
        alertsUpdated: result.alertsUpdated,
        alertsDismissed: result.alertsDismissed,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      result.durationMs = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : "Unknown error";

      logger.error("Drift alert detection failed", {
        userId,
        portfolioId,
        error: result.error,
        durationMs: result.durationMs,
      });

      return result;
    }
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default alert detection service instance
 */
export const alertDetectionService = new AlertDetectionService();
