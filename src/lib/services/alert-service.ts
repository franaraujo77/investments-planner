/**
 * Alert Service
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.1: Alert triggered when better asset exists
 * AC-9.1.2: Alert includes both asset details with formatted message
 * AC-9.1.4: Alert deduplication for same asset pair
 * AC-9.1.5: Alert auto-clears when resolved
 *
 * Provides CRUD operations for alerts:
 * - Create opportunity alerts with formatted messages
 * - Query alerts with pagination and filtering
 * - Mark alerts as read/dismissed
 * - Deduplication support for same asset pairs
 * - Tenant isolation (user can only see their own alerts)
 */

import { db, type Database } from "@/lib/db";
import {
  alerts,
  portfolioAssets,
  type Alert,
  type NewAlert,
  type OpportunityAlertMetadata,
  type DriftAlertMetadata,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import Decimal from "decimal.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Alert type constants
 */
export const ALERT_TYPES = {
  OPPORTUNITY: "opportunity",
  ALLOCATION_DRIFT: "allocation_drift",
  SYSTEM: "system",
} as const;

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];

/**
 * Alert severity constants
 */
export const ALERT_SEVERITIES = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
} as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[keyof typeof ALERT_SEVERITIES];

/**
 * Asset details for opportunity alert creation
 * AC-9.1.2: Contains symbol and score for both assets
 */
export interface AssetAlertDetails {
  id: string;
  symbol: string;
  score: string | Decimal;
}

/**
 * Asset class details for opportunity alert
 */
export interface AssetClassAlertDetails {
  id: string;
  name: string;
}

/**
 * Alert query options for filtering and pagination
 */
export interface AlertQueryOptions {
  /** Filter by alert type */
  type?: AlertType | undefined;
  /** Filter by read status */
  isRead?: boolean | undefined;
  /** Filter by dismissed status */
  isDismissed?: boolean | undefined;
  /** Maximum results to return (default: 50, max: 100) */
  limit?: number | undefined;
  /** Offset for pagination (default: 0) */
  offset?: number | undefined;
}

/**
 * Alert query result with pagination
 */
export interface AlertQueryResult {
  /** List of alerts */
  alerts: Alert[];
  /** Total count for pagination */
  totalCount: number;
  /** Query metadata */
  metadata: {
    limit: number;
    offset: number;
  };
}

/**
 * Threshold for score difference to trigger alert update
 * AC-9.1.4: Update existing alert if score difference changes significantly (>5 point change)
 */
export const SCORE_UPDATE_THRESHOLD = new Decimal(5);

/**
 * Minimum score difference to create opportunity alert
 * AC-9.1.1: Another asset scores 10+ points higher
 */
export const OPPORTUNITY_SCORE_THRESHOLD = new Decimal(10);

/**
 * Threshold for drift percentage change to trigger alert update
 * AC-9.2.7: Update existing alert if drift changes by >2%
 */
export const DRIFT_UPDATE_THRESHOLD = new Decimal(2);

/**
 * Asset class details for drift alert
 * Story 9.2: Allocation Drift Alert
 */
export interface AssetClassDriftDetails {
  id: string;
  name: string;
  targetMin: string;
  targetMax: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Alert Service
 *
 * Provides CRUD operations for user alerts.
 *
 * @example
 * ```typescript
 * const alertService = new AlertService();
 *
 * // Create opportunity alert
 * await alertService.createOpportunityAlert(
 *   userId,
 *   currentAsset,
 *   betterAsset,
 *   assetClass
 * );
 *
 * // Get unread alerts
 * const unread = await alertService.getUnreadAlerts(userId);
 * ```
 */
export class AlertService {
  constructor(private database: Database = db) {}

  /**
   * Create an opportunity alert
   *
   * AC-9.1.1: Alert created when better asset exists (10+ points higher)
   * AC-9.1.2: Message format: "[BETTER_SYMBOL] scores [BETTER_SCORE] vs your [CURRENT_SYMBOL] ([CURRENT_SCORE]). Consider swapping?"
   *
   * @param userId - User ID (tenant isolation)
   * @param currentAsset - User's current asset details
   * @param betterAsset - Better scoring asset details
   * @param assetClass - Asset class details for context
   * @returns Created alert
   */
  async createOpportunityAlert(
    userId: string,
    currentAsset: AssetAlertDetails,
    betterAsset: AssetAlertDetails,
    assetClass: AssetClassAlertDetails
  ): Promise<Alert> {
    const currentScore = new Decimal(currentAsset.score.toString());
    const betterScore = new Decimal(betterAsset.score.toString());
    const scoreDifference = betterScore.minus(currentScore);

    // AC-9.1.2: Generate title and message
    const title = `${betterAsset.symbol} scores higher than your ${currentAsset.symbol}`;
    const message = `${betterAsset.symbol} scores ${betterScore.toFixed(2)} vs your ${currentAsset.symbol} (${currentScore.toFixed(2)}). Consider swapping?`;

    // AC-9.1.1: Build metadata with all required fields
    const metadata: OpportunityAlertMetadata = {
      currentAssetId: currentAsset.id,
      currentAssetSymbol: currentAsset.symbol,
      currentScore: currentScore.toString(),
      betterAssetId: betterAsset.id,
      betterAssetSymbol: betterAsset.symbol,
      betterScore: betterScore.toString(),
      scoreDifference: scoreDifference.toString(),
      assetClassId: assetClass.id,
      assetClassName: assetClass.name,
    };

    const newAlert: NewAlert = {
      userId,
      type: ALERT_TYPES.OPPORTUNITY,
      title,
      message,
      severity: ALERT_SEVERITIES.INFO,
      metadata,
      isRead: false,
      isDismissed: false,
    };

    const result = await this.database.insert(alerts).values(newAlert).returning();
    const created = result[0];

    if (!created) {
      throw new Error("Failed to create opportunity alert");
    }

    logger.info("Opportunity alert created", {
      alertId: created.id,
      userId,
      currentAsset: currentAsset.symbol,
      betterAsset: betterAsset.symbol,
      scoreDifference: scoreDifference.toString(),
      assetClass: assetClass.name,
    });

    return created;
  }

  /**
   * Get unread alerts for a user
   *
   * Returns alerts that are not read and not dismissed.
   * Useful for notification badges and alert lists.
   *
   * @param userId - User ID (tenant isolation)
   * @returns Array of unread alerts
   */
  async getUnreadAlerts(userId: string): Promise<Alert[]> {
    const result = await this.database
      .select()
      .from(alerts)
      .where(
        and(eq(alerts.userId, userId), eq(alerts.isRead, false), eq(alerts.isDismissed, false))
      )
      .orderBy(desc(alerts.createdAt));

    logger.debug("Retrieved unread alerts", {
      userId,
      count: result.length,
    });

    return result;
  }

  /**
   * Get alerts with filtering and pagination
   *
   * @param userId - User ID (tenant isolation)
   * @param options - Query options for filtering and pagination
   * @returns Alert query result with pagination info
   */
  async getAlerts(userId: string, options?: AlertQueryOptions): Promise<AlertQueryResult> {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [eq(alerts.userId, userId)];

    if (options?.type) {
      conditions.push(eq(alerts.type, options.type));
    }

    if (options?.isRead !== undefined) {
      conditions.push(eq(alerts.isRead, options.isRead));
    }

    if (options?.isDismissed !== undefined) {
      conditions.push(eq(alerts.isDismissed, options.isDismissed));
    }

    // Execute query
    const result = await this.database
      .select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(alerts)
      .where(and(...conditions));

    const totalCount = countResult[0]?.count ?? 0;

    logger.debug("Retrieved alerts with pagination", {
      userId,
      limit,
      offset,
      resultCount: result.length,
      totalCount,
    });

    return {
      alerts: result,
      totalCount,
      metadata: { limit, offset },
    };
  }

  /**
   * Get unread alert count
   *
   * Efficient COUNT query for notification badges.
   *
   * @param userId - User ID (tenant isolation)
   * @returns Count of unread, non-dismissed alerts
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(alerts)
      .where(
        and(eq(alerts.userId, userId), eq(alerts.isRead, false), eq(alerts.isDismissed, false))
      );

    return result[0]?.count ?? 0;
  }

  /**
   * Mark alert as read
   *
   * @param userId - User ID (tenant isolation)
   * @param alertId - Alert ID to mark as read
   * @returns Updated alert or null if not found
   */
  async markAsRead(userId: string, alertId: string): Promise<Alert | null> {
    const now = new Date();
    const [updated] = await this.database
      .update(alerts)
      .set({
        isRead: true,
        readAt: now,
        updatedAt: now,
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
      .returning();

    if (updated) {
      logger.debug("Alert marked as read", { alertId, userId });
    } else {
      logger.warn("Alert not found for marking as read", { alertId, userId });
    }

    return updated ?? null;
  }

  /**
   * Dismiss alert
   *
   * AC-9.1.5: Alert auto-clears when resolved (isDismissed=true, dismissedAt=timestamp)
   *
   * @param userId - User ID (tenant isolation)
   * @param alertId - Alert ID to dismiss
   * @returns Updated alert or null if not found
   */
  async dismissAlert(userId: string, alertId: string): Promise<Alert | null> {
    const now = new Date();
    const [updated] = await this.database
      .update(alerts)
      .set({
        isDismissed: true,
        dismissedAt: now,
        updatedAt: now,
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
      .returning();

    if (updated) {
      logger.debug("Alert dismissed", { alertId, userId });
    } else {
      logger.warn("Alert not found for dismissal", { alertId, userId });
    }

    return updated ?? null;
  }

  /**
   * Dismiss all alerts
   *
   * Bulk dismiss alerts with optional type filter.
   *
   * @param userId - User ID (tenant isolation)
   * @param type - Optional alert type to filter
   * @returns Count of dismissed alerts
   */
  async dismissAllAlerts(userId: string, type?: AlertType): Promise<number> {
    const now = new Date();
    const conditions: ReturnType<typeof eq>[] = [
      eq(alerts.userId, userId),
      eq(alerts.isDismissed, false),
    ];

    if (type) {
      conditions.push(eq(alerts.type, type));
    }

    const result = await this.database
      .update(alerts)
      .set({
        isDismissed: true,
        dismissedAt: now,
        updatedAt: now,
      })
      .where(and(...conditions))
      .returning({ id: alerts.id });

    const count = result.length;

    logger.info("Dismissed all alerts", {
      userId,
      type,
      count,
    });

    return count;
  }

  /**
   * Find existing opportunity alert for asset pair
   *
   * AC-9.1.4: Deduplication uses key: {userId}-{currentAssetId}-{betterAssetId}
   *
   * @param userId - User ID (tenant isolation)
   * @param currentAssetId - Current asset ID from portfolio
   * @param betterAssetId - Better scoring asset ID
   * @returns Existing alert or null if not found
   */
  async findExistingAlert(
    userId: string,
    currentAssetId: string,
    betterAssetId: string
  ): Promise<Alert | null> {
    // Query for non-dismissed opportunity alerts with matching asset pair
    const result = await this.database
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, userId),
          eq(alerts.type, ALERT_TYPES.OPPORTUNITY),
          eq(alerts.isDismissed, false),
          // Using SQL JSONB operators for metadata matching
          sql`${alerts.metadata}->>'currentAssetId' = ${currentAssetId}`,
          sql`${alerts.metadata}->>'betterAssetId' = ${betterAssetId}`
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Update alert if score difference changed significantly
   *
   * AC-9.1.4: Existing alert is updated if score difference changes significantly (>5 point change)
   *
   * @param alertId - Alert ID to update
   * @param newScoreDifference - New score difference to check
   * @param currentAsset - Updated current asset details
   * @param betterAsset - Updated better asset details
   * @returns Updated alert or null if no significant change
   */
  async updateAlertIfChanged(
    alertId: string,
    newScoreDifference: Decimal,
    currentAsset: AssetAlertDetails,
    betterAsset: AssetAlertDetails
  ): Promise<Alert | null> {
    // Get existing alert
    const [existing] = await this.database.select().from(alerts).where(eq(alerts.id, alertId));

    if (!existing) {
      logger.warn("Alert not found for update", { alertId });
      return null;
    }

    // Check if change is significant
    const existingMetadata = existing.metadata as OpportunityAlertMetadata;
    const existingDifference = new Decimal(existingMetadata.scoreDifference);
    const change = newScoreDifference.minus(existingDifference).abs();

    if (change.lt(SCORE_UPDATE_THRESHOLD)) {
      logger.debug("Score difference change not significant enough for update", {
        alertId,
        existingDifference: existingDifference.toString(),
        newScoreDifference: newScoreDifference.toString(),
        change: change.toString(),
        threshold: SCORE_UPDATE_THRESHOLD.toString(),
      });
      return null;
    }

    // Update alert with new scores
    const currentScore = new Decimal(currentAsset.score.toString());
    const betterScore = new Decimal(betterAsset.score.toString());

    const message = `${betterAsset.symbol} scores ${betterScore.toFixed(2)} vs your ${currentAsset.symbol} (${currentScore.toFixed(2)}). Consider swapping?`;

    const updatedMetadata: OpportunityAlertMetadata = {
      ...existingMetadata,
      currentScore: currentScore.toString(),
      betterScore: betterScore.toString(),
      scoreDifference: newScoreDifference.toString(),
    };

    const [updated] = await this.database
      .update(alerts)
      .set({
        message,
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId))
      .returning();

    logger.info("Alert updated with new score difference", {
      alertId,
      previousDifference: existingDifference.toString(),
      newDifference: newScoreDifference.toString(),
    });

    return updated ?? null;
  }

  /**
   * Auto-dismiss alerts when better asset is added to portfolio
   *
   * AC-9.1.5: When user adds the better-scored asset to their portfolio,
   * the opportunity alert is automatically dismissed.
   *
   * @param userId - User ID (tenant isolation)
   * @param betterAssetId - The better asset ID that was added
   * @returns Count of auto-dismissed alerts
   */
  async autoDismissForAddedAsset(userId: string, betterAssetId: string): Promise<number> {
    const now = new Date();

    // Find and dismiss all opportunity alerts where this asset is the "better" one
    const result = await this.database
      .update(alerts)
      .set({
        isDismissed: true,
        dismissedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(alerts.userId, userId),
          eq(alerts.type, ALERT_TYPES.OPPORTUNITY),
          eq(alerts.isDismissed, false),
          sql`${alerts.metadata}->>'betterAssetId' = ${betterAssetId}`
        )
      )
      .returning({ id: alerts.id });

    const count = result.length;

    if (count > 0) {
      logger.info("Auto-dismissed opportunity alerts for added asset", {
        userId,
        betterAssetId,
        dismissedCount: count,
      });
    }

    return count;
  }

  /**
   * Get alert by ID
   *
   * @param userId - User ID (tenant isolation)
   * @param alertId - Alert ID
   * @returns Alert or null if not found
   */
  async getAlertById(userId: string, alertId: string): Promise<Alert | null> {
    const [result] = await this.database
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    return result ?? null;
  }

  // ===========================================================================
  // DRIFT ALERT METHODS (Story 9.2: Allocation Drift Alert)
  // ===========================================================================

  /**
   * Create an allocation drift alert
   *
   * AC-9.2.1: Alert created when allocation drifts outside target range
   * AC-9.2.2: Message format: "[CLASS_NAME] at [CURRENT]%, target is [MIN]-[MAX]%"
   * AC-9.2.3: Severity based on drift magnitude (warning vs critical)
   *
   * @param userId - User ID (tenant isolation)
   * @param assetClass - Asset class with target allocation details
   * @param currentAllocation - Current allocation percentage
   * @param driftThreshold - User's configured drift threshold (default 5%)
   * @returns Created alert
   */
  async createDriftAlert(
    userId: string,
    assetClass: AssetClassDriftDetails,
    currentAllocation: Decimal,
    driftThreshold: Decimal
  ): Promise<Alert> {
    const targetMin = new Decimal(assetClass.targetMin);
    const targetMax = new Decimal(assetClass.targetMax);

    // Calculate drift direction and amount
    let direction: "over" | "under";
    let driftAmount: Decimal;

    if (currentAllocation.gt(targetMax)) {
      direction = "over";
      driftAmount = currentAllocation.minus(targetMax);
    } else {
      direction = "under";
      driftAmount = targetMin.minus(currentAllocation);
    }

    // AC-9.2.3: Determine severity based on drift magnitude
    // Warning: drift > threshold but < 2x threshold
    // Critical: drift >= 2x threshold
    const severityThreshold = driftThreshold.times(2);
    const severity = driftAmount.gte(severityThreshold)
      ? ALERT_SEVERITIES.CRITICAL
      : ALERT_SEVERITIES.WARNING;

    // AC-9.2.2: Generate title and message
    const title = `${assetClass.name} allocation drift detected`;

    // Direction-specific suggestion (AC-9.2.3)
    const suggestion =
      direction === "over" ? "Consider not adding to this class" : "Increase contributions here";

    const message = `${assetClass.name} at ${currentAllocation.toFixed(2)}%, target is ${targetMin.toFixed(2)}-${targetMax.toFixed(2)}%. ${suggestion}`;

    // AC-9.2.1: Build metadata with all required fields
    const metadata: DriftAlertMetadata = {
      assetClassId: assetClass.id,
      assetClassName: assetClass.name,
      currentAllocation: currentAllocation.toString(),
      targetMin: targetMin.toString(),
      targetMax: targetMax.toString(),
      driftAmount: driftAmount.toString(),
      direction,
    };

    const newAlert: NewAlert = {
      userId,
      type: ALERT_TYPES.ALLOCATION_DRIFT,
      title,
      message,
      severity,
      metadata,
      isRead: false,
      isDismissed: false,
    };

    const result = await this.database.insert(alerts).values(newAlert).returning();
    const created = result[0];

    if (!created) {
      throw new Error("Failed to create drift alert");
    }

    logger.info("Drift alert created", {
      alertId: created.id,
      userId,
      assetClass: assetClass.name,
      currentAllocation: currentAllocation.toString(),
      driftAmount: driftAmount.toString(),
      direction,
      severity,
    });

    return created;
  }

  /**
   * Find existing drift alert for asset class
   *
   * AC-9.2.7: Deduplication uses key: {userId}-{assetClassId}
   *
   * @param userId - User ID (tenant isolation)
   * @param assetClassId - Asset class ID
   * @returns Existing alert or null if not found
   */
  async findExistingDriftAlert(userId: string, assetClassId: string): Promise<Alert | null> {
    // Query for non-dismissed drift alerts with matching asset class
    const result = await this.database
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, userId),
          eq(alerts.type, ALERT_TYPES.ALLOCATION_DRIFT),
          eq(alerts.isDismissed, false),
          // Using SQL JSONB operators for metadata matching
          sql`${alerts.metadata}->>'assetClassId' = ${assetClassId}`
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Update drift alert if drift amount changed significantly
   *
   * AC-9.2.7: Update existing alert if drift changes by >2%
   *
   * @param alertId - Alert ID to update
   * @param newDriftAmount - New drift amount
   * @param newCurrentAllocation - New current allocation
   * @param driftThreshold - User's configured drift threshold
   * @returns Updated alert or null if no significant change
   */
  async updateDriftAlertIfChanged(
    alertId: string,
    newDriftAmount: Decimal,
    newCurrentAllocation: Decimal,
    driftThreshold: Decimal
  ): Promise<Alert | null> {
    // Get existing alert
    const [existing] = await this.database.select().from(alerts).where(eq(alerts.id, alertId));

    if (!existing) {
      logger.warn("Drift alert not found for update", { alertId });
      return null;
    }

    // Check if change is significant
    const existingMetadata = existing.metadata as DriftAlertMetadata;
    const existingDriftAmount = new Decimal(existingMetadata.driftAmount);
    const change = newDriftAmount.minus(existingDriftAmount).abs();

    if (change.lt(DRIFT_UPDATE_THRESHOLD)) {
      logger.debug("Drift change not significant enough for update", {
        alertId,
        existingDrift: existingDriftAmount.toString(),
        newDrift: newDriftAmount.toString(),
        change: change.toString(),
        threshold: DRIFT_UPDATE_THRESHOLD.toString(),
      });
      return null;
    }

    // Recalculate severity
    const severityThreshold = driftThreshold.times(2);
    const newSeverity = newDriftAmount.gte(severityThreshold)
      ? ALERT_SEVERITIES.CRITICAL
      : ALERT_SEVERITIES.WARNING;

    // Determine direction (preserved from metadata)
    const direction = existingMetadata.direction;
    const suggestion =
      direction === "over" ? "Consider not adding to this class" : "Increase contributions here";

    const message = `${existingMetadata.assetClassName} at ${newCurrentAllocation.toFixed(2)}%, target is ${existingMetadata.targetMin}-${existingMetadata.targetMax}%. ${suggestion}`;

    const updatedMetadata: DriftAlertMetadata = {
      ...existingMetadata,
      currentAllocation: newCurrentAllocation.toString(),
      driftAmount: newDriftAmount.toString(),
    };

    const [updated] = await this.database
      .update(alerts)
      .set({
        message,
        metadata: updatedMetadata,
        severity: newSeverity,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId))
      .returning();

    logger.info("Drift alert updated", {
      alertId,
      previousDrift: existingDriftAmount.toString(),
      newDrift: newDriftAmount.toString(),
      severity: newSeverity,
    });

    return updated ?? null;
  }

  /**
   * Auto-dismiss drift alerts when allocation returns to target range
   *
   * AC-9.2.6: When allocation returns to target range, alert is auto-dismissed
   *
   * @param userId - User ID (tenant isolation)
   * @param portfolioId - Portfolio ID to check allocations for
   * @returns Number of auto-dismissed alerts
   */
  async autoDismissResolvedDriftAlerts(userId: string, portfolioId: string): Promise<number> {
    const now = new Date();

    // Get all non-dismissed drift alerts for this user
    const driftAlerts = await this.database
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, userId),
          eq(alerts.type, ALERT_TYPES.ALLOCATION_DRIFT),
          eq(alerts.isDismissed, false)
        )
      );

    if (driftAlerts.length === 0) {
      return 0;
    }

    // Get current allocations for asset classes
    // First get portfolio assets with their class assignments
    const portfolioAssetsData = await this.database
      .select({
        assetClassId: portfolioAssets.assetClassId,
        value: sql<string>`COALESCE(${portfolioAssets.quantity}::numeric * ${portfolioAssets.purchasePrice}::numeric, 0)`,
      })
      .from(portfolioAssets)
      .where(
        and(eq(portfolioAssets.portfolioId, portfolioId), eq(portfolioAssets.isIgnored, false))
      );

    // Calculate total portfolio value
    let totalValue = new Decimal(0);
    const classValues = new Map<string, Decimal>();

    for (const asset of portfolioAssetsData) {
      const value = new Decimal(asset.value || "0");
      totalValue = totalValue.plus(value);

      if (asset.assetClassId) {
        const currentClassValue = classValues.get(asset.assetClassId) ?? new Decimal(0);
        classValues.set(asset.assetClassId, currentClassValue.plus(value));
      }
    }

    // Collect IDs of alerts to dismiss (batch approach for performance)
    const alertsToDismiss: {
      id: string;
      assetClassName: string;
      currentAllocation: string;
      targetRange: string;
    }[] = [];

    for (const alert of driftAlerts) {
      const metadata = alert.metadata as DriftAlertMetadata;
      const classValue = classValues.get(metadata.assetClassId) ?? new Decimal(0);

      // Calculate current allocation percentage
      const currentAllocation = totalValue.isZero()
        ? new Decimal(0)
        : classValue.dividedBy(totalValue).times(100);

      const targetMin = new Decimal(metadata.targetMin);
      const targetMax = new Decimal(metadata.targetMax);

      // Check if allocation is back within range
      if (currentAllocation.gte(targetMin) && currentAllocation.lte(targetMax)) {
        alertsToDismiss.push({
          id: alert.id,
          assetClassName: metadata.assetClassName,
          currentAllocation: currentAllocation.toString(),
          targetRange: `${targetMin}-${targetMax}`,
        });
      }
    }

    // Batch update: dismiss all resolved alerts in a single query
    if (alertsToDismiss.length > 0) {
      const idsToUpdate = alertsToDismiss.map((a) => a.id);
      await this.database
        .update(alerts)
        .set({
          isDismissed: true,
          dismissedAt: now,
          updatedAt: now,
        })
        .where(inArray(alerts.id, idsToUpdate));

      // Log individual dismissals for audit trail
      for (const dismissed of alertsToDismiss) {
        logger.info("Auto-dismissed resolved drift alert", {
          alertId: dismissed.id,
          userId,
          assetClass: dismissed.assetClassName,
          currentAllocation: dismissed.currentAllocation,
          targetRange: dismissed.targetRange,
        });
      }

      logger.info("Auto-dismissed drift alerts for resolved allocations", {
        userId,
        portfolioId,
        dismissedCount: alertsToDismiss.length,
      });
    }

    return alertsToDismiss.length;
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default alert service instance
 */
export const alertService = new AlertService();
