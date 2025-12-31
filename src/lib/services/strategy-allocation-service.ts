/**
 * Strategy Allocation Service
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.2: Calculate actual portfolio allocation by asset class
 *
 * Calculates current portfolio allocation by aggregating holdings
 * grouped by their assigned asset class. Compares against target
 * ranges to determine allocation status.
 */

import { db } from "@/lib/db";
import { portfolioAssets, portfolios, assetClasses } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Decimal } from "@/lib/calculations/decimal-config";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Allocation data for a single asset class
 */
export interface StrategyAllocation {
  classId: string;
  className: string;
  targetMin: string | null;
  targetMax: string | null;
  currentValue: string;
  currentPercentage: string;
  assetCount: number;
  status: AllocationStatus;
}

/**
 * Summary of strategy allocation across all asset classes
 */
export interface StrategyAllocationSummary {
  allocations: StrategyAllocation[];
  totalPortfolioValue: string;
  unclassifiedValue: string;
  unclassifiedPercentage: string;
  unclassifiedAssetCount: number;
}

// =============================================================================
// STATUS CALCULATION
// =============================================================================

/**
 * Calculate allocation status based on current vs target range
 *
 * AC-3.6.5: Color-coded status indicators
 * - Under-allocated: current < targetMin
 * - On-target: targetMin <= current <= targetMax
 * - Over-allocated: current > targetMax
 * - No-target: no target range configured
 */
export function calculateStrategyAllocationStatus(
  current: string,
  targetMin: string | null,
  targetMax: string | null
): AllocationStatus {
  // No targets = no-target status
  if (targetMin === null && targetMax === null) {
    return "no-target";
  }

  try {
    const curr = new Decimal(current);

    if (targetMin !== null) {
      const min = new Decimal(targetMin);
      if (curr.lessThan(min)) return "under";
    }

    if (targetMax !== null) {
      const max = new Decimal(targetMax);
      if (curr.greaterThan(max)) return "over";
    }

    return "on-target";
  } catch {
    return "no-target";
  }
}

// =============================================================================
// MAIN SERVICE FUNCTION
// =============================================================================

/**
 * Get strategy allocation for a user's portfolios
 *
 * Aggregates all holdings across user's portfolios grouped by asset class.
 * Calculates total values, percentages, and allocation status.
 *
 * AC-3.6.2: Asset class allocation calculation
 * - Groups holdings by asset_class_id
 * - Calculates value as quantity * purchase_price (no live prices yet)
 * - Joins with asset_classes for target ranges
 * - Handles unclassified assets separately
 *
 * @param userId - User ID to get allocation for
 * @returns StrategyAllocationSummary with allocations and totals
 */
export async function getStrategyAllocation(userId: string): Promise<StrategyAllocationSummary> {
  // Query: Group holdings by asset class and calculate totals
  // Note: Using purchasePrice * quantity as current value (market prices in Epic 5)
  const classAggregation = await db
    .select({
      assetClassId: portfolioAssets.assetClassId,
      className: assetClasses.name,
      targetMin: assetClasses.targetMin,
      targetMax: assetClasses.targetMax,
      totalValue: sql<string>`SUM(${portfolioAssets.quantity} * ${portfolioAssets.purchasePrice})`,
      assetCount: sql<number>`COUNT(${portfolioAssets.id})::int`,
    })
    .from(portfolioAssets)
    .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
    .leftJoin(assetClasses, eq(portfolioAssets.assetClassId, assetClasses.id))
    .where(and(eq(portfolios.userId, userId), eq(portfolioAssets.isIgnored, false)))
    .groupBy(
      portfolioAssets.assetClassId,
      assetClasses.name,
      assetClasses.targetMin,
      assetClasses.targetMax
    );

  // Separate classified and unclassified results
  const classifiedResults = classAggregation.filter((row) => row.assetClassId !== null);
  const unclassifiedResult = classAggregation.find((row) => row.assetClassId === null);

  // Calculate total portfolio value (classified + unclassified)
  let totalValue = new Decimal(0);
  for (const row of classAggregation) {
    if (row.totalValue) {
      totalValue = totalValue.plus(new Decimal(row.totalValue));
    }
  }
  const totalValueStr = totalValue.toFixed(4);

  // Handle unclassified assets
  const unclassifiedValue = unclassifiedResult?.totalValue
    ? new Decimal(unclassifiedResult.totalValue).toFixed(4)
    : "0.0000";
  const unclassifiedPercentage = totalValue.isZero()
    ? "0.0000"
    : new Decimal(unclassifiedValue).dividedBy(totalValue).times(100).toFixed(4);
  const unclassifiedAssetCount = unclassifiedResult?.assetCount ?? 0;

  // Build allocation objects for each asset class
  const allocations: StrategyAllocation[] = classifiedResults.map((row) => {
    const value = row.totalValue ? new Decimal(row.totalValue).toFixed(4) : "0.0000";
    const percentage = totalValue.isZero()
      ? "0.0000"
      : new Decimal(value).dividedBy(totalValue).times(100).toFixed(4);

    const status = calculateStrategyAllocationStatus(percentage, row.targetMin, row.targetMax);

    return {
      classId: row.assetClassId!,
      className: row.className ?? "Unknown",
      targetMin: row.targetMin,
      targetMax: row.targetMax,
      currentValue: value,
      currentPercentage: percentage,
      assetCount: row.assetCount,
      status,
    };
  });

  // Sort by percentage descending
  allocations.sort((a, b) => {
    return new Decimal(b.currentPercentage).minus(new Decimal(a.currentPercentage)).toNumber();
  });

  logger.debug("Strategy allocation calculated", {
    userId,
    totalValue: totalValueStr,
    classCount: allocations.length,
    unclassifiedCount: unclassifiedAssetCount,
  });

  return {
    allocations,
    totalPortfolioValue: totalValueStr,
    unclassifiedValue,
    unclassifiedPercentage,
    unclassifiedAssetCount,
  };
}

/**
 * Check if user has any portfolio assets
 *
 * Used to determine empty state for UI
 */
export async function hasPortfolioAssets(userId: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`COUNT(${portfolioAssets.id})::int` })
    .from(portfolioAssets)
    .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
    .where(and(eq(portfolios.userId, userId), eq(portfolioAssets.isIgnored, false)));

  return (result[0]?.count ?? 0) > 0;
}

/**
 * Check if user has any asset classes configured
 *
 * Used to determine empty state for target allocation view
 */
export async function hasAssetClasses(userId: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`COUNT(${assetClasses.id})::int` })
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId));

  return (result[0]?.count ?? 0) > 0;
}

/**
 * Get target allocation strategy for a user
 *
 * Returns the configured target allocations (targetMin percentages) from asset classes.
 * This shows the user's investment strategy/plan, not actual holdings.
 *
 * @param userId - User ID to get target allocation for
 * @returns StrategyAllocationSummary with target allocations
 */
export async function getTargetAllocation(userId: string): Promise<StrategyAllocationSummary> {
  // Query all asset classes for this user with their target allocations
  const userAssetClasses = await db
    .select({
      id: assetClasses.id,
      name: assetClasses.name,
      targetMin: assetClasses.targetMin,
      targetMax: assetClasses.targetMax,
    })
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId))
    .orderBy(assetClasses.name);

  // Build allocation objects using targetMin as the percentage for the pie chart
  const allocations: StrategyAllocation[] = userAssetClasses
    .filter((ac) => ac.targetMin !== null) // Only include classes with target allocations
    .map((ac) => {
      const targetMinValue = ac.targetMin ?? "0";

      return {
        classId: ac.id,
        className: ac.name,
        targetMin: ac.targetMin,
        targetMax: ac.targetMax,
        currentValue: "0.0000", // Not applicable for target view
        currentPercentage: targetMinValue, // Use targetMin as the display percentage
        assetCount: 0, // Not applicable for target view
        status: "on-target" as AllocationStatus, // Targets are always "on-target" by definition
      };
    });

  // Sort by percentage descending
  allocations.sort((a, b) => {
    return new Decimal(b.currentPercentage).minus(new Decimal(a.currentPercentage)).toNumber();
  });

  // Calculate total of all targetMin values
  const totalTargetMin = allocations.reduce((sum, alloc) => {
    return sum.plus(new Decimal(alloc.currentPercentage));
  }, new Decimal(0));

  logger.debug("Target allocation calculated", {
    userId,
    classCount: allocations.length,
    totalTargetMin: totalTargetMin.toFixed(2),
  });

  return {
    allocations,
    totalPortfolioValue: "0.0000", // Not applicable for target view
    unclassifiedValue: "0.0000",
    unclassifiedPercentage: "0.0000",
    unclassifiedAssetCount: 0,
  };
}
