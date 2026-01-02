/**
 * Higher-Scoring Asset Alert Detection
 *
 * Story 6.2 AC-6.2.3: Higher-Scoring Asset Alert
 * When portfolio is at capacity for an asset class but higher-scoring
 * assets exist outside the portfolio, an alert is generated.
 *
 * This module compares portfolio assets with available market assets
 * to identify opportunities for higher-scoring alternatives.
 */

import { Decimal } from "./decimal-config";
import { parseDecimal } from "./decimal-utils";
import type { AssetWithContext } from "@/lib/types/recommendations";
import type { HigherScoringAlert } from "@/lib/types/recommendations";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Asset with score for comparison
 */
export interface AssetWithScore {
  id: string;
  symbol: string;
  name: string;
  score: string;
  classId: string | null;
  className: string | null;
}

/**
 * Configuration for higher-scoring detection
 */
export interface HigherScoringConfig {
  /** Minimum score difference to consider as "higher" (default: 5 points) */
  minScoreDifference?: number;
  /** Maximum number of higher-scoring assets to include per class (default: 3) */
  maxAssetsPerClass?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default minimum score difference to trigger alert */
const DEFAULT_MIN_SCORE_DIFFERENCE = 5;

/** Default maximum higher-scoring assets to show per class */
const DEFAULT_MAX_ASSETS_PER_CLASS = 3;

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Find higher-scoring assets for over-allocated asset classes
 *
 * AC-6.2.3: Higher-Scoring Asset Alert
 * - Given portfolio is at capacity for an asset class
 * - When higher-scoring assets exist outside the portfolio
 * - Then user sees alert with which assets would score higher
 *
 * @param portfolioAssets - Assets in the user's portfolio with context
 * @param availableAssets - Available market assets with scores
 * @param config - Optional configuration for thresholds
 * @returns Array of higher-scoring alerts by asset class
 */
export function findHigherScoringAssets(
  portfolioAssets: AssetWithContext[],
  availableAssets: AssetWithScore[],
  config: HigherScoringConfig = {}
): HigherScoringAlert[] {
  const minScoreDiff = config.minScoreDifference ?? DEFAULT_MIN_SCORE_DIFFERENCE;
  const maxAssets = config.maxAssetsPerClass ?? DEFAULT_MAX_ASSETS_PER_CLASS;

  const alerts: HigherScoringAlert[] = [];

  // Group portfolio assets by class
  const portfolioByClass = groupAssetsByClass(portfolioAssets);

  // For each class with over-allocated or at-capacity assets
  for (const [classId, classAssets] of portfolioByClass.entries()) {
    if (!classId) continue; // Skip unclassified assets

    // Check if class is at capacity (has over-allocated assets)
    const overAllocatedAssets = classAssets.filter((a) => a.isOverAllocated);
    if (overAllocatedAssets.length === 0) continue; // Not at capacity

    // Find the lowest scoring asset in portfolio for this class
    const lowestScoringAsset = findLowestScoringAsset(classAssets);
    if (!lowestScoringAsset) continue;

    const lowestScore = parseDecimal(lowestScoringAsset.score);
    const className = lowestScoringAsset.className || "Unknown";

    // Get portfolio symbols to exclude from available assets
    const portfolioSymbols = new Set(classAssets.map((a) => a.symbol));

    // Find available assets in same class that score higher
    const higherScoringCandidates = availableAssets
      .filter((a) => {
        // Same class, not in portfolio
        if (a.classId !== classId) return false;
        if (portfolioSymbols.has(a.symbol)) return false;

        // Score at least minScoreDiff higher
        const assetScore = parseDecimal(a.score);
        const scoreDiff = assetScore.minus(lowestScore);
        return scoreDiff.gte(minScoreDiff);
      })
      .map((a) => {
        const assetScore = parseDecimal(a.score);
        const scoreDiff = assetScore.minus(lowestScore);
        return {
          symbol: a.symbol,
          name: a.name,
          score: a.score,
          scoreDifference: scoreDiff.toFixed(4),
          scoreDiffValue: scoreDiff,
        };
      })
      .sort((a, b) => b.scoreDiffValue.minus(a.scoreDiffValue).toNumber())
      .slice(0, maxAssets)
      .map(({ scoreDiffValue: _scoreDiffValue, ...rest }) => rest); // Remove internal field

    if (higherScoringCandidates.length > 0) {
      alerts.push({
        assetClassId: classId,
        assetClassName: className,
        currentLowestScore: lowestScoringAsset.score,
        currentLowestSymbol: lowestScoringAsset.symbol,
        higherScoringAssets: higherScoringCandidates,
      });
    }
  }

  return alerts;
}

/**
 * Group portfolio assets by asset class ID
 */
function groupAssetsByClass(assets: AssetWithContext[]): Map<string | null, AssetWithContext[]> {
  const groups = new Map<string | null, AssetWithContext[]>();

  for (const asset of assets) {
    const classId = asset.classId;
    if (!groups.has(classId)) {
      groups.set(classId, []);
    }
    groups.get(classId)!.push(asset);
  }

  return groups;
}

/**
 * Find the lowest-scoring asset in a group
 */
function findLowestScoringAsset(assets: AssetWithContext[]): AssetWithContext | null {
  if (assets.length === 0) return null;

  let lowest = assets[0];
  let lowestScore: Decimal = parseDecimal(lowest!.score);

  for (const asset of assets) {
    const score = parseDecimal(asset.score);
    if (score.lt(lowestScore)) {
      lowestScore = score;
      lowest = asset;
    }
  }

  return lowest ?? null;
}

/**
 * Check if any alerts should be generated
 *
 * Convenience function for checking if alerts exist without full generation
 *
 * @param portfolioAssets - Assets in the user's portfolio
 * @returns True if at least one class has higher-scoring alternatives
 */
export function hasHigherScoringOpportunities(portfolioAssets: AssetWithContext[]): boolean {
  // Quick check: any over-allocated assets?
  return portfolioAssets.some((a) => a.isOverAllocated);
}
