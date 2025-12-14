/**
 * Recommendation Engine
 *
 * Story 7.4: Generate Investment Recommendations
 * Core algorithm for distributing capital based on allocation gaps and scores
 *
 * AC-7.4.1: Priority Ranking by Allocation Gap × Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.4: Minimum Allocation Values Enforced
 *
 * All calculations use decimal.js for financial precision
 */

import { Decimal } from "./decimal-config";
import { parseDecimal, multiply, divide, subtract, add, isPositive } from "./decimal-utils";
import type {
  AssetWithContext,
  AssetWithPriority,
  RecommendationItemResult,
} from "@/lib/types/recommendations";
import type { RecommendationItemBreakdown } from "@/lib/db/schema";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Score divisor for priority calculation (score / 100) */
const SCORE_DIVISOR = new Decimal(100);

/** Precision for percentage calculations */
const PERCENTAGE_PRECISION = 4;

/** Precision for monetary calculations */
const MONETARY_PRECISION = 4;

// =============================================================================
// PRIORITY CALCULATION
// =============================================================================

/**
 * Calculate priority for an asset
 *
 * AC-7.4.1: priority = allocation_gap × (score / 100)
 *
 * Higher priority = higher allocation gap AND/OR higher score
 * Negative gaps (over-allocated) result in negative priority
 *
 * @param allocationGap - Gap between target and current allocation (percentage)
 * @param score - Asset score from scoring engine
 * @returns Priority weight (decimal)
 */
export function calculatePriority(allocationGap: Decimal, score: Decimal): Decimal {
  // priority = gap × (score / 100)
  const normalizedScore = divide(score, SCORE_DIVISOR);
  return multiply(allocationGap, normalizedScore);
}

/**
 * Calculate priority from string inputs
 *
 * Convenience wrapper for calculatePriority
 *
 * @param allocationGap - Gap as decimal string
 * @param score - Score as decimal string
 * @returns Priority as decimal string
 */
export function calculatePriorityFromStrings(allocationGap: string, score: string): string {
  const gapDecimal = parseDecimal(allocationGap);
  const scoreDecimal = parseDecimal(score);
  return calculatePriority(gapDecimal, scoreDecimal).toFixed(PERCENTAGE_PRECISION);
}

// =============================================================================
// ASSET PREPARATION
// =============================================================================

/**
 * Add priority to assets and sort by priority descending
 *
 * AC-7.4.1: Higher priority assets receive capital first
 * AC-7.4.2: Under-allocated classes with higher scores get higher priority
 *
 * @param assets - Assets with allocation context
 * @returns Assets with priority, sorted descending
 */
export function sortAssetsByPriority(assets: AssetWithContext[]): AssetWithPriority[] {
  // Calculate priority for each asset
  const assetsWithPriority: AssetWithPriority[] = assets.map((asset) => {
    const gapDecimal = parseDecimal(asset.allocationGap);
    const scoreDecimal = parseDecimal(asset.score);
    const priority = calculatePriority(gapDecimal, scoreDecimal);

    return {
      ...asset,
      priority: priority.toFixed(PERCENTAGE_PRECISION),
    };
  });

  // Sort by priority descending (highest first)
  // For determinism, secondary sort by symbol alphabetically
  return assetsWithPriority.sort((a, b) => {
    const priorityA = parseDecimal(a.priority);
    const priorityB = parseDecimal(b.priority);
    const diff = priorityB.minus(priorityA).toNumber();

    // If priorities are equal, sort by symbol for determinism
    if (diff === 0) {
      return a.symbol.localeCompare(b.symbol);
    }
    return diff;
  });
}

// =============================================================================
// CAPITAL DISTRIBUTION
// =============================================================================

/**
 * Distribution result for a single asset
 */
interface DistributionResult {
  assetId: string;
  amount: Decimal;
  redistributedFrom: Decimal;
}

/**
 * Distribute capital among assets respecting minimum allocations
 *
 * AC-7.4.3: Sum of recommendations = total investable
 * AC-7.4.4: Minimum allocation enforcement with redistribution
 *
 * Algorithm:
 * 1. Process assets in priority order
 * 2. Skip over-allocated assets (they get $0)
 * 3. For each asset, calculate ideal allocation
 * 4. If ideal < minimum, add to redistribution pool
 * 5. Give redistribution to next eligible asset
 * 6. Continue until all capital is allocated
 *
 * @param sortedAssets - Assets sorted by priority (highest first)
 * @param totalInvestable - Total capital to distribute
 * @param minAllocations - Map of assetId to minimum allocation value
 * @returns Distribution results
 */
export function distributeCapital(
  sortedAssets: AssetWithPriority[],
  totalInvestable: Decimal,
  minAllocations: Map<string, Decimal>
): DistributionResult[] {
  // Handle edge cases
  if (sortedAssets.length === 0 || totalInvestable.isZero() || totalInvestable.isNegative()) {
    return [];
  }

  // Filter out over-allocated assets
  const eligibleAssets = sortedAssets.filter((a) => !a.isOverAllocated);

  // If no eligible assets, return empty (all over-allocated)
  if (eligibleAssets.length === 0) {
    return sortedAssets.map((asset) => ({
      assetId: asset.id,
      amount: new Decimal(0),
      redistributedFrom: new Decimal(0),
    }));
  }

  // Calculate total positive priority for proportional distribution
  let totalPositivePriority = new Decimal(0);
  for (const asset of eligibleAssets) {
    const priority = parseDecimal(asset.priority);
    if (isPositive(priority)) {
      totalPositivePriority = add(totalPositivePriority, priority);
    }
  }

  // If no positive priorities, distribute equally among eligible assets
  const useEqualDistribution = totalPositivePriority.isZero();

  // Initial distribution based on priority or equal split
  const distributions = new Map<string, DistributionResult>();
  let redistributionPool = new Decimal(0);

  // First pass: Calculate ideal amounts
  for (const asset of eligibleAssets) {
    let idealAmount: Decimal;

    if (useEqualDistribution) {
      // Equal distribution when no positive priorities
      idealAmount = divide(totalInvestable, new Decimal(eligibleAssets.length));
    } else {
      const priority = parseDecimal(asset.priority);
      if (isPositive(priority)) {
        // Proportional to priority
        const proportion = divide(priority, totalPositivePriority);
        idealAmount = multiply(totalInvestable, proportion);
      } else {
        // Negative or zero priority gets nothing initially
        idealAmount = new Decimal(0);
      }
    }

    distributions.set(asset.id, {
      assetId: asset.id,
      amount: idealAmount,
      redistributedFrom: new Decimal(0),
    });
  }

  // Add zero amounts for over-allocated assets
  for (const asset of sortedAssets) {
    if (asset.isOverAllocated) {
      distributions.set(asset.id, {
        assetId: asset.id,
        amount: new Decimal(0),
        redistributedFrom: new Decimal(0),
      });
    }
  }

  // Second pass: Enforce minimum allocations and redistribute
  let changed = true;
  const maxIterations = eligibleAssets.length * 2; // Prevent infinite loops
  let iterations = 0;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const asset of eligibleAssets) {
      const dist = distributions.get(asset.id)!;
      const minAlloc = minAllocations.get(asset.id) || new Decimal(0);

      // Check if amount is below minimum but not zero
      if (isPositive(dist.amount) && dist.amount.lessThan(minAlloc)) {
        // Amount is below minimum, add to redistribution pool
        redistributionPool = add(redistributionPool, dist.amount);
        dist.amount = new Decimal(0);
        changed = true;
      }
    }

    // Redistribute to highest priority eligible asset that can accept it
    if (isPositive(redistributionPool)) {
      for (const asset of eligibleAssets) {
        const dist = distributions.get(asset.id)!;
        const minAlloc = minAllocations.get(asset.id) || new Decimal(0);

        // Can this asset receive the redistribution?
        // Either it already has an allocation, or the pool is >= minimum
        if (isPositive(dist.amount) || redistributionPool.greaterThanOrEqualTo(minAlloc)) {
          const newAmount = add(dist.amount, redistributionPool);
          dist.redistributedFrom = add(dist.redistributedFrom, redistributionPool);
          dist.amount = newAmount;
          redistributionPool = new Decimal(0);
          changed = true;
          break;
        }
      }

      // If still have redistribution and no one can accept, give to first eligible
      if (isPositive(redistributionPool)) {
        const firstEligible = eligibleAssets[0];
        if (firstEligible) {
          const dist = distributions.get(firstEligible.id)!;
          dist.amount = add(dist.amount, redistributionPool);
          dist.redistributedFrom = add(dist.redistributedFrom, redistributionPool);
          redistributionPool = new Decimal(0);
          changed = true;
        }
      }
    }
  }

  // Final adjustment: Ensure total equals investable (rounding adjustment)
  let totalAllocated = new Decimal(0);
  for (const dist of distributions.values()) {
    totalAllocated = add(totalAllocated, dist.amount);
  }

  const difference = subtract(totalInvestable, totalAllocated);
  if (!difference.isZero()) {
    // Add difference to first non-zero allocation
    for (const asset of eligibleAssets) {
      const dist = distributions.get(asset.id)!;
      if (isPositive(dist.amount)) {
        dist.amount = add(dist.amount, difference);
        break;
      }
    }
  }

  // Return in original order (by sortedAssets)
  return sortedAssets.map((asset) => distributions.get(asset.id)!);
}

// =============================================================================
// RECOMMENDATION GENERATION
// =============================================================================

/**
 * Generate recommendation items from assets and capital
 *
 * Main entry point for the recommendation engine
 *
 * AC-7.4.1: Priority Ranking by Allocation Gap × Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.4: Minimum Allocation Values Enforced
 *
 * @param assets - Assets with allocation and score context
 * @param totalInvestable - Total capital to distribute (decimal string)
 * @returns Recommendation items for each asset
 */
export function generateRecommendationItems(
  assets: AssetWithContext[],
  totalInvestable: string
): RecommendationItemResult[] {
  const totalDecimal = parseDecimal(totalInvestable);

  // Handle edge case: no assets or no capital
  if (assets.length === 0) {
    return [];
  }

  if (totalDecimal.isZero() || totalDecimal.isNegative()) {
    return assets.map((asset, index) => ({
      assetId: asset.id,
      symbol: asset.symbol,
      score: asset.score,
      currentAllocation: asset.currentAllocation,
      targetAllocation: asset.targetAllocation,
      allocationGap: asset.allocationGap,
      recommendedAmount: "0.0000",
      isOverAllocated: asset.isOverAllocated,
      breakdown: createBreakdown(asset, "0.0000", null),
      sortOrder: index,
    }));
  }

  // Sort by priority
  const sortedAssets = sortAssetsByPriority(assets);

  // Build minimum allocations map
  const minAllocations = new Map<string, Decimal>();
  for (const asset of sortedAssets) {
    if (asset.minAllocationValue) {
      minAllocations.set(asset.id, parseDecimal(asset.minAllocationValue));
    }
  }

  // Distribute capital
  const distributions = distributeCapital(sortedAssets, totalDecimal, minAllocations);

  // Build results
  const results: RecommendationItemResult[] = [];
  for (let i = 0; i < sortedAssets.length; i++) {
    const asset = sortedAssets[i];
    const dist = distributions[i];

    if (!asset || !dist) continue;

    results.push({
      assetId: asset.id,
      symbol: asset.symbol,
      score: asset.score,
      currentAllocation: asset.currentAllocation,
      targetAllocation: asset.targetAllocation,
      allocationGap: asset.allocationGap,
      recommendedAmount: dist.amount.toFixed(MONETARY_PRECISION),
      isOverAllocated: asset.isOverAllocated,
      breakdown: createBreakdown(
        asset,
        dist.redistributedFrom.toFixed(MONETARY_PRECISION),
        dist.redistributedFrom.isZero() ? null : dist.redistributedFrom.toFixed(MONETARY_PRECISION)
      ),
      sortOrder: i,
    });
  }

  return results;
}

/**
 * Create breakdown for a recommendation item
 */
function createBreakdown(
  asset: AssetWithContext,
  priority: string,
  redistributedFrom: string | null
): RecommendationItemBreakdown {
  return {
    classId: asset.classId,
    className: asset.className,
    subclassId: asset.subclassId,
    subclassName: asset.subclassName,
    currentValue: asset.currentValue,
    targetMidpoint: asset.targetAllocation,
    priority,
    redistributedFrom,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that sum of recommendations equals total investable
 *
 * AC-7.4.3: Total Recommendations Equal Total Investable
 *
 * @param items - Recommendation items
 * @param totalInvestable - Expected total
 * @returns True if sum matches (within precision tolerance)
 */
export function validateTotalEquals(
  items: RecommendationItemResult[],
  totalInvestable: string
): boolean {
  const expected = parseDecimal(totalInvestable);
  let actual = new Decimal(0);

  for (const item of items) {
    actual = add(actual, parseDecimal(item.recommendedAmount));
  }

  // Check equality with 4 decimal places tolerance
  const diff = subtract(expected, actual).abs();
  const tolerance = new Decimal("0.0001");

  return diff.lessThanOrEqualTo(tolerance);
}

/**
 * Check if all over-allocated assets have zero recommendations
 *
 * AC-7.4.2: Over-allocated assets should receive $0
 *
 * @param items - Recommendation items
 * @returns True if all over-allocated items have zero amount
 */
export function validateOverAllocatedGetZero(items: RecommendationItemResult[]): boolean {
  for (const item of items) {
    if (item.isOverAllocated) {
      const amount = parseDecimal(item.recommendedAmount);
      if (!amount.isZero()) {
        return false;
      }
    }
  }
  return true;
}

// =============================================================================
// DETERMINISM CHECK
// =============================================================================

/**
 * Run recommendation generation twice and verify identical results
 *
 * AC-7.4.1: Prioritization is deterministic (same inputs = same output)
 *
 * @param assets - Assets to process
 * @param totalInvestable - Capital to distribute
 * @returns True if results are identical
 */
export function verifyDeterminism(assets: AssetWithContext[], totalInvestable: string): boolean {
  const result1 = generateRecommendationItems(assets, totalInvestable);
  const result2 = generateRecommendationItems(assets, totalInvestable);

  if (result1.length !== result2.length) {
    return false;
  }

  for (let i = 0; i < result1.length; i++) {
    const r1 = result1[i];
    const r2 = result2[i];

    if (!r1 || !r2) {
      return false;
    }

    if (
      r1.assetId !== r2.assetId ||
      r1.recommendedAmount !== r2.recommendedAmount ||
      r1.sortOrder !== r2.sortOrder
    ) {
      return false;
    }
  }

  return true;
}
