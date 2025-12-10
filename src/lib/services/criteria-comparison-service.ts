/**
 * Criteria Comparison Service
 *
 * Business logic for comparing two criteria sets side-by-side.
 * Story 5.6: Compare Criteria Sets
 *
 * AC-5.6.2: Side-by-side criteria differences
 * AC-5.6.3: Average scores per set
 * AC-5.6.4: Assets with different rankings highlighted
 *
 * Multi-tenant isolation: All operations scoped by userId
 */

import Decimal from "decimal.js";
import { getCriteriaById } from "@/lib/services/criteria-service";
import { CriteriaNotFoundError } from "@/lib/services/criteria-service";
import type { CriterionRule } from "@/lib/db/schema";
import { OPERATOR_LABELS, METRIC_LABELS } from "@/lib/validations/criteria-schemas";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Summary of a single criterion for comparison display
 */
export interface CriterionSummary {
  id: string;
  name: string;
  metric: string;
  metricLabel: string;
  operator: string;
  operatorLabel: string;
  value: string;
  value2?: string;
  points: number;
}

/**
 * Represents a difference between criteria in two sets
 * AC-5.6.2: Visual highlighting for differences
 */
export interface CriteriaDifference {
  /** Name of the criterion (for display) */
  criterionName: string;
  /** Criterion details from Set A (null if only in Set B) */
  inSetA: CriterionSummary | null;
  /** Criterion details from Set B (null if only in Set A) */
  inSetB: CriterionSummary | null;
  /** Type of difference for color-coding */
  differenceType: "only_a" | "only_b" | "modified" | "identical";
}

/**
 * Represents a ranking change for an asset between two criteria sets
 * AC-5.6.4: Assets with different rankings highlighted
 */
export interface RankingChange {
  assetSymbol: string;
  assetName: string;
  rankA: number;
  rankB: number;
  scoreA: string;
  scoreB: string;
  change: "improved" | "declined" | "unchanged";
  /** Absolute position change (negative = improved, positive = declined) */
  positionChange: number;
}

/**
 * Summary information about a criteria set
 */
export interface CriteriaSetSummary {
  id: string;
  name: string;
  market: string;
  criteriaCount: number;
  averageScore: string;
}

/**
 * Complete comparison result
 */
export interface ComparisonResult {
  setA: CriteriaSetSummary;
  setB: CriteriaSetSummary;
  differences: CriteriaDifference[];
  rankingChanges: RankingChange[];
  sampleSize: number;
}

/**
 * Sample asset for scoring
 */
interface SampleAsset {
  symbol: string;
  name: string;
  fundamentals: Record<string, number | null>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum sample assets for comparison (performance constraint)
 * Per tech-spec: limit to 20 assets for quick comparison
 */
export const MAX_SAMPLE_ASSETS = 20;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert a CriterionRule to a CriterionSummary for display
 */
function toCriterionSummary(criterion: CriterionRule): CriterionSummary {
  const summary: CriterionSummary = {
    id: criterion.id,
    name: criterion.name,
    metric: criterion.metric,
    metricLabel: METRIC_LABELS[criterion.metric as keyof typeof METRIC_LABELS] ?? criterion.metric,
    operator: criterion.operator,
    operatorLabel:
      OPERATOR_LABELS[criterion.operator as keyof typeof OPERATOR_LABELS] ?? criterion.operator,
    value: criterion.value,
    points: criterion.points,
  };

  if (criterion.value2) {
    summary.value2 = criterion.value2;
  }

  return summary;
}

/**
 * Generate a unique key for matching criteria across sets
 * Criteria are considered the "same" if they have the same name (case-insensitive)
 */
function getCriterionKey(criterion: CriterionRule): string {
  return criterion.name.toLowerCase().trim();
}

/**
 * Check if two criteria are identical (same configuration)
 */
function areCriteriaIdentical(a: CriterionRule, b: CriterionRule): boolean {
  return (
    a.metric === b.metric &&
    a.operator === b.operator &&
    a.value === b.value &&
    a.value2 === b.value2 &&
    a.points === b.points
  );
}

/**
 * Calculate criteria differences between two sets
 * AC-5.6.2: Side-by-side criteria differences
 *
 * @param criteriaA - Criteria from Set A
 * @param criteriaB - Criteria from Set B
 * @returns Array of differences with type classification
 */
export function calculateCriteriaDifferences(
  criteriaA: CriterionRule[],
  criteriaB: CriterionRule[]
): CriteriaDifference[] {
  const differences: CriteriaDifference[] = [];
  const processedBKeys = new Set<string>();

  // Build a map of Set B criteria by key for O(1) lookup
  const bByKey = new Map<string, CriterionRule>();
  for (const criterion of criteriaB) {
    bByKey.set(getCriterionKey(criterion), criterion);
  }

  // Process all criteria from Set A
  for (const criterionA of criteriaA) {
    const key = getCriterionKey(criterionA);
    const criterionB = bByKey.get(key);

    if (!criterionB) {
      // Only in Set A
      differences.push({
        criterionName: criterionA.name,
        inSetA: toCriterionSummary(criterionA),
        inSetB: null,
        differenceType: "only_a",
      });
    } else {
      processedBKeys.add(key);

      if (areCriteriaIdentical(criterionA, criterionB)) {
        // Identical in both sets
        differences.push({
          criterionName: criterionA.name,
          inSetA: toCriterionSummary(criterionA),
          inSetB: toCriterionSummary(criterionB),
          differenceType: "identical",
        });
      } else {
        // Present in both but modified
        differences.push({
          criterionName: criterionA.name,
          inSetA: toCriterionSummary(criterionA),
          inSetB: toCriterionSummary(criterionB),
          differenceType: "modified",
        });
      }
    }
  }

  // Process criteria only in Set B
  for (const criterionB of criteriaB) {
    const key = getCriterionKey(criterionB);
    if (!processedBKeys.has(key)) {
      differences.push({
        criterionName: criterionB.name,
        inSetA: null,
        inSetB: toCriterionSummary(criterionB),
        differenceType: "only_b",
      });
    }
  }

  // Sort: differences first (only_a, only_b, modified), then identical
  const order = { only_a: 0, only_b: 1, modified: 2, identical: 3 };
  differences.sort((a, b) => {
    const orderDiff = order[a.differenceType] - order[b.differenceType];
    if (orderDiff !== 0) return orderDiff;
    return a.criterionName.localeCompare(b.criterionName);
  });

  return differences;
}

/**
 * Get sample assets for scoring comparison
 * In this initial implementation, we use mock sample data.
 * Future: integrate with user's portfolio data or cached market data.
 *
 * @param userId - User ID (for future: fetch from user's portfolios)
 * @returns Array of sample assets with fundamentals data
 */

export function getSampleAssets(_userId: string): SampleAsset[] {
  // Mock sample assets for comparison demonstration
  // In production, this would fetch from user's portfolios or market data cache
  const sampleAssets: SampleAsset[] = [
    {
      symbol: "ITUB4",
      name: "Itau Unibanco",
      fundamentals: {
        dividend_yield: 5.2,
        pe_ratio: 8.5,
        pb_ratio: 1.2,
        roe: 18.5,
        debt_to_equity: 0.8,
      },
    },
    {
      symbol: "BBDC4",
      name: "Bradesco",
      fundamentals: {
        dividend_yield: 4.8,
        pe_ratio: 7.2,
        pb_ratio: 0.9,
        roe: 15.2,
        debt_to_equity: 0.7,
      },
    },
    {
      symbol: "SANB11",
      name: "Santander",
      fundamentals: {
        dividend_yield: 6.1,
        pe_ratio: 9.8,
        pb_ratio: 1.4,
        roe: 14.8,
        debt_to_equity: 0.9,
      },
    },
    {
      symbol: "BBAS3",
      name: "Banco do Brasil",
      fundamentals: {
        dividend_yield: 7.5,
        pe_ratio: 5.2,
        pb_ratio: 0.7,
        roe: 21.2,
        debt_to_equity: 0.5,
      },
    },
    {
      symbol: "ABCB4",
      name: "ABC Brasil",
      fundamentals: {
        dividend_yield: 4.2,
        pe_ratio: 6.8,
        pb_ratio: 0.8,
        roe: 12.5,
        debt_to_equity: 0.6,
      },
    },
    {
      symbol: "BRSR6",
      name: "Banrisul",
      fundamentals: {
        dividend_yield: 8.2,
        pe_ratio: 4.5,
        pb_ratio: 0.5,
        roe: 11.8,
        debt_to_equity: 0.4,
      },
    },
    {
      symbol: "BPAC11",
      name: "BTG Pactual",
      fundamentals: {
        dividend_yield: 3.5,
        pe_ratio: 12.5,
        pb_ratio: 1.8,
        roe: 22.5,
        debt_to_equity: 1.2,
      },
    },
    {
      symbol: "BIDI11",
      name: "Inter",
      fundamentals: {
        dividend_yield: 0.5,
        pe_ratio: 25.0,
        pb_ratio: 2.5,
        roe: 8.5,
        debt_to_equity: 0.3,
      },
    },
    {
      symbol: "PSSA3",
      name: "Porto Seguro",
      fundamentals: {
        dividend_yield: 5.8,
        pe_ratio: 10.2,
        pb_ratio: 1.5,
        roe: 16.5,
        debt_to_equity: 0.2,
      },
    },
    {
      symbol: "CXSE3",
      name: "Caixa Seguridade",
      fundamentals: {
        dividend_yield: 9.2,
        pe_ratio: 8.8,
        pb_ratio: 1.1,
        roe: 25.5,
        debt_to_equity: 0.1,
      },
    },
    {
      symbol: "TAEE11",
      name: "Taesa",
      fundamentals: {
        dividend_yield: 10.5,
        pe_ratio: 7.5,
        pb_ratio: 1.8,
        roe: 28.0,
        debt_to_equity: 1.5,
      },
    },
    {
      symbol: "TRPL4",
      name: "Transmissao Paulista",
      fundamentals: {
        dividend_yield: 8.8,
        pe_ratio: 6.2,
        pb_ratio: 1.2,
        roe: 19.5,
        debt_to_equity: 0.8,
      },
    },
    {
      symbol: "ENBR3",
      name: "Energias do Brasil",
      fundamentals: {
        dividend_yield: 6.5,
        pe_ratio: 9.5,
        pb_ratio: 1.0,
        roe: 14.2,
        debt_to_equity: 0.6,
      },
    },
    {
      symbol: "CPFE3",
      name: "CPFL Energia",
      fundamentals: {
        dividend_yield: 7.2,
        pe_ratio: 11.0,
        pb_ratio: 1.6,
        roe: 17.8,
        debt_to_equity: 1.0,
      },
    },
    {
      symbol: "EQTL3",
      name: "Equatorial",
      fundamentals: {
        dividend_yield: 4.5,
        pe_ratio: 14.0,
        pb_ratio: 2.0,
        roe: 16.0,
        debt_to_equity: 1.2,
      },
    },
    {
      symbol: "CMIG4",
      name: "Cemig",
      fundamentals: {
        dividend_yield: 11.2,
        pe_ratio: 5.8,
        pb_ratio: 0.8,
        roe: 13.5,
        debt_to_equity: 0.7,
      },
    },
    {
      symbol: "ELET3",
      name: "Eletrobras",
      fundamentals: {
        dividend_yield: 3.2,
        pe_ratio: 8.0,
        pb_ratio: 0.6,
        roe: 9.8,
        debt_to_equity: 0.5,
      },
    },
    {
      symbol: "SBSP3",
      name: "Sabesp",
      fundamentals: {
        dividend_yield: 2.8,
        pe_ratio: 12.5,
        pb_ratio: 1.1,
        roe: 10.5,
        debt_to_equity: 0.9,
      },
    },
    {
      symbol: "CSMG3",
      name: "Copasa",
      fundamentals: {
        dividend_yield: 6.8,
        pe_ratio: 7.0,
        pb_ratio: 0.7,
        roe: 11.0,
        debt_to_equity: 0.4,
      },
    },
    {
      symbol: "SAPR11",
      name: "Sanepar",
      fundamentals: {
        dividend_yield: 5.5,
        pe_ratio: 8.5,
        pb_ratio: 0.9,
        roe: 12.8,
        debt_to_equity: 0.6,
      },
    },
  ];

  return sampleAssets.slice(0, MAX_SAMPLE_ASSETS);
}

/**
 * Evaluate a criterion against an asset's fundamentals
 *
 * @param criterion - The criterion rule to evaluate
 * @param fundamentals - Asset's fundamental data
 * @returns Points awarded (0 if criterion not met)
 */
function evaluateCriterion(
  criterion: CriterionRule,
  fundamentals: Record<string, number | null>
): number {
  const metricValue = fundamentals[criterion.metric];

  // Handle 'exists' operator
  if (criterion.operator === "exists") {
    return metricValue !== null && metricValue !== undefined ? criterion.points : 0;
  }

  // For other operators, need a valid numeric value
  if (metricValue === null || metricValue === undefined) {
    return 0;
  }

  const targetValue = parseFloat(criterion.value);
  if (isNaN(targetValue)) return 0;

  switch (criterion.operator) {
    case "gt":
      return metricValue > targetValue ? criterion.points : 0;
    case "lt":
      return metricValue < targetValue ? criterion.points : 0;
    case "gte":
      return metricValue >= targetValue ? criterion.points : 0;
    case "lte":
      return metricValue <= targetValue ? criterion.points : 0;
    case "equals":
      return metricValue === targetValue ? criterion.points : 0;
    case "between": {
      const targetValue2 = criterion.value2 ? parseFloat(criterion.value2) : NaN;
      if (isNaN(targetValue2)) return 0;
      return metricValue >= targetValue && metricValue <= targetValue2 ? criterion.points : 0;
    }
    default:
      return 0;
  }
}

/**
 * Calculate total score for an asset against a criteria set
 *
 * @param criteria - Array of criterion rules
 * @param fundamentals - Asset's fundamental data
 * @returns Total score as Decimal
 */
function calculateAssetScore(
  criteria: CriterionRule[],
  fundamentals: Record<string, number | null>
): Decimal {
  let totalScore = new Decimal(0);

  for (const criterion of criteria) {
    const points = evaluateCriterion(criterion, fundamentals);
    totalScore = totalScore.plus(points);
  }

  return totalScore;
}

/**
 * Calculate ranking changes between two sets of scored assets
 * AC-5.6.4: Assets with different rankings highlighted
 *
 * @param scoresA - Scores for Set A (asset symbol -> score)
 * @param scoresB - Scores for Set B (asset symbol -> score)
 * @param assets - Sample assets with names
 * @returns Array of ranking changes, sorted by significance
 */
export function calculateRankingChanges(
  scoresA: Map<string, Decimal>,
  scoresB: Map<string, Decimal>,
  assets: SampleAsset[]
): RankingChange[] {
  // Create ranked lists for each set
  const rankedA = [...scoresA.entries()]
    .sort((a, b) => b[1].minus(a[1]).toNumber()) // Descending by score
    .map(([symbol], index) => ({ symbol, rank: index + 1 }));

  const rankedB = [...scoresB.entries()]
    .sort((a, b) => b[1].minus(a[1]).toNumber())
    .map(([symbol], index) => ({ symbol, rank: index + 1 }));

  // Build lookup maps
  const rankAMap = new Map(rankedA.map((r) => [r.symbol, r.rank]));
  const rankBMap = new Map(rankedB.map((r) => [r.symbol, r.rank]));
  const assetMap = new Map(assets.map((a) => [a.symbol, a.name]));

  const changes: RankingChange[] = [];

  for (const [symbol, scoreA] of scoresA.entries()) {
    const scoreB = scoresB.get(symbol);
    if (!scoreB) continue;

    const rankA = rankAMap.get(symbol) ?? 0;
    const rankB = rankBMap.get(symbol) ?? 0;
    const positionChange = rankA - rankB; // Negative = improved (lower rank number is better)

    let change: "improved" | "declined" | "unchanged";
    if (positionChange > 0) {
      change = "improved"; // Rank decreased (e.g., 5 -> 3)
    } else if (positionChange < 0) {
      change = "declined"; // Rank increased (e.g., 3 -> 5)
    } else {
      change = "unchanged";
    }

    changes.push({
      assetSymbol: symbol,
      assetName: assetMap.get(symbol) ?? symbol,
      rankA,
      rankB,
      scoreA: scoreA.toFixed(2),
      scoreB: scoreB.toFixed(2),
      change,
      positionChange: Math.abs(positionChange),
    });
  }

  // Sort by absolute position change descending, then by symbol
  changes.sort((a, b) => {
    const changeDiff = b.positionChange - a.positionChange;
    if (changeDiff !== 0) return changeDiff;
    return a.assetSymbol.localeCompare(b.assetSymbol);
  });

  // Filter to only include assets with ranking changes
  return changes.filter((c) => c.change !== "unchanged");
}

/**
 * Calculate average score across all sample assets
 *
 * @param scores - Map of asset symbol to score
 * @returns Average score as string (2 decimal places)
 */
function calculateAverageScore(scores: Map<string, Decimal>): string {
  if (scores.size === 0) return "0.00";

  let total = new Decimal(0);
  for (const score of scores.values()) {
    total = total.plus(score);
  }

  return total.dividedBy(scores.size).toFixed(2);
}

// =============================================================================
// MAIN SERVICE FUNCTION
// =============================================================================

/**
 * Compare two criteria sets and return comprehensive comparison results
 *
 * Story 5.6: Compare Criteria Sets
 * AC-5.6.2: Side-by-side criteria differences
 * AC-5.6.3: Average scores per set
 * AC-5.6.4: Assets with different rankings highlighted
 *
 * Multi-tenant isolation: Verifies both sets belong to the user
 *
 * @param userId - User ID (for ownership verification)
 * @param setAId - Criteria version ID for Set A
 * @param setBId - Criteria version ID for Set B
 * @returns Complete comparison result
 * @throws CriteriaNotFoundError if either set doesn't exist or user doesn't own it
 */
export async function compareCriteriaSets(
  userId: string,
  setAId: string,
  setBId: string
): Promise<ComparisonResult> {
  // 1. Load both criteria versions (verify ownership)
  const setA = await getCriteriaById(userId, setAId);
  if (!setA) {
    throw new CriteriaNotFoundError();
  }

  const setB = await getCriteriaById(userId, setBId);
  if (!setB) {
    throw new CriteriaNotFoundError();
  }

  // 2. Calculate criteria differences
  const differences = calculateCriteriaDifferences(setA.criteria, setB.criteria);

  // 3. Get sample assets
  const sampleAssets = getSampleAssets(userId);

  // 4. Score all assets against both criteria sets
  const scoresA = new Map<string, Decimal>();
  const scoresB = new Map<string, Decimal>();

  for (const asset of sampleAssets) {
    scoresA.set(asset.symbol, calculateAssetScore(setA.criteria, asset.fundamentals));
    scoresB.set(asset.symbol, calculateAssetScore(setB.criteria, asset.fundamentals));
  }

  // 5. Calculate average scores
  const avgScoreA = calculateAverageScore(scoresA);
  const avgScoreB = calculateAverageScore(scoresB);

  // 6. Calculate ranking changes
  const rankingChanges = calculateRankingChanges(scoresA, scoresB, sampleAssets);

  // 7. Build and return result
  return {
    setA: {
      id: setA.id,
      name: setA.name,
      market: setA.targetMarket,
      criteriaCount: setA.criteria.length,
      averageScore: avgScoreA,
    },
    setB: {
      id: setB.id,
      name: setB.name,
      market: setB.targetMarket,
      criteriaCount: setB.criteria.length,
      averageScore: avgScoreB,
    },
    differences,
    rankingChanges,
    sampleSize: sampleAssets.length,
  };
}
