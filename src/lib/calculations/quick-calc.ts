/**
 * Quick-Calc Service
 *
 * Fast preview calculations for scoring criteria.
 * Story 5.7: Criteria Preview (Impact Simulation)
 *
 * AC-5.7.2: Preview shows top 10 scoring assets
 * AC-5.7.3: Preview updates live as criteria modified
 * AC-5.7.4: Shows comparison (improved/worse/same counts)
 *
 * Uses cached data only - no external API calls.
 * Performance target: < 500ms for 20 assets.
 */

import Decimal from "decimal.js";
import type { CriterionRule } from "@/lib/db/schema";
import { OPERATOR_LABELS, METRIC_LABELS } from "@/lib/validations/criteria-schemas";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sample asset for scoring
 */
export interface SampleAsset {
  symbol: string;
  name: string;
  fundamentals: Record<string, number | null>;
}

/**
 * Score breakdown for a single criterion
 */
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  metric: string;
  metricLabel: string;
  operator: string;
  operatorLabel: string;
  targetValue: string;
  targetValue2: string | undefined;
  actualValue: number | null;
  pointsAwarded: number;
  maxPoints: number;
  passed: boolean;
}

/**
 * Preview result for a single asset
 * AC-5.7.2: Each asset shows symbol, name, score, and key metrics
 */
export interface PreviewAsset {
  symbol: string;
  name: string;
  score: string;
  rank: number;
  breakdown: CriterionScore[];
}

/**
 * Comparison summary between current and previous criteria
 * AC-5.7.4: Shows improved/worse/same counts
 */
export interface ComparisonSummary {
  improved: number;
  declined: number;
  unchanged: number;
  previousAverageScore: string;
  currentAverageScore: string;
}

/**
 * Complete preview result
 */
export interface PreviewResult {
  topAssets: PreviewAsset[];
  comparison: ComparisonSummary | undefined;
  calculatedAt: string;
  sampleSize: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum sample assets for preview (performance constraint)
 * Per tech-spec: limit to 20 assets for quick preview
 */
export const MAX_SAMPLE_ASSETS = 20;

/**
 * Top N assets to return in preview
 */
export const TOP_N_ASSETS = 10;

// =============================================================================
// SAMPLE ASSETS (MOCK DATA)
// =============================================================================

/**
 * Get sample assets for preview scoring
 * Reuses the same mock data as criteria-comparison-service.
 * In production, this would fetch from user's portfolios or cached market data.
 *
 * @returns Array of sample assets with fundamentals data
 */
export function getSampleAssets(): SampleAsset[] {
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
        market_cap: 280000,
        revenue: 150000,
        earnings: 32000,
        surplus_years: 5,
        roa: 1.5,
        current_ratio: 1.2,
        gross_margin: 65,
        net_margin: 21,
        payout_ratio: 35,
        ev_ebitda: 6.5,
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
        market_cap: 180000,
        revenue: 120000,
        earnings: 25000,
        surplus_years: 4,
        roa: 1.2,
        current_ratio: 1.1,
        gross_margin: 60,
        net_margin: 18,
        payout_ratio: 40,
        ev_ebitda: 5.8,
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
        market_cap: 150000,
        revenue: 100000,
        earnings: 15000,
        surplus_years: 3,
        roa: 1.0,
        current_ratio: 1.3,
        gross_margin: 58,
        net_margin: 15,
        payout_ratio: 60,
        ev_ebitda: 7.2,
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
        market_cap: 160000,
        revenue: 140000,
        earnings: 35000,
        surplus_years: 6,
        roa: 1.8,
        current_ratio: 1.4,
        gross_margin: 68,
        net_margin: 25,
        payout_ratio: 45,
        ev_ebitda: 4.5,
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
        market_cap: 8000,
        revenue: 5000,
        earnings: 1200,
        surplus_years: 4,
        roa: 1.1,
        current_ratio: 1.2,
        gross_margin: 55,
        net_margin: 24,
        payout_ratio: 30,
        ev_ebitda: 5.5,
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
        market_cap: 6000,
        revenue: 8000,
        earnings: 1800,
        surplus_years: 5,
        roa: 0.9,
        current_ratio: 1.1,
        gross_margin: 52,
        net_margin: 22,
        payout_ratio: 50,
        ev_ebitda: 4.0,
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
        market_cap: 120000,
        revenue: 45000,
        earnings: 9600,
        surplus_years: 3,
        roa: 2.0,
        current_ratio: 1.5,
        gross_margin: 70,
        net_margin: 21,
        payout_ratio: 25,
        ev_ebitda: 9.0,
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
        market_cap: 25000,
        revenue: 6000,
        earnings: 1000,
        surplus_years: 2,
        roa: 0.5,
        current_ratio: 1.6,
        gross_margin: 45,
        net_margin: 16,
        payout_ratio: 10,
        ev_ebitda: 18.0,
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
        market_cap: 28000,
        revenue: 25000,
        earnings: 2800,
        surplus_years: 7,
        roa: 2.5,
        current_ratio: 1.8,
        gross_margin: 42,
        net_margin: 11,
        payout_ratio: 55,
        ev_ebitda: 8.5,
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
        market_cap: 32000,
        revenue: 12000,
        earnings: 3600,
        surplus_years: 4,
        roa: 3.0,
        current_ratio: 2.0,
        gross_margin: 75,
        net_margin: 30,
        payout_ratio: 90,
        ev_ebitda: 7.0,
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
        market_cap: 14000,
        revenue: 3500,
        earnings: 1900,
        surplus_years: 10,
        roa: 5.0,
        current_ratio: 0.8,
        gross_margin: 85,
        net_margin: 54,
        payout_ratio: 95,
        ev_ebitda: 8.0,
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
        market_cap: 12000,
        revenue: 4200,
        earnings: 2000,
        surplus_years: 8,
        roa: 4.5,
        current_ratio: 0.9,
        gross_margin: 80,
        net_margin: 47,
        payout_ratio: 85,
        ev_ebitda: 6.0,
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
        market_cap: 18000,
        revenue: 15000,
        earnings: 1900,
        surplus_years: 5,
        roa: 3.2,
        current_ratio: 1.2,
        gross_margin: 35,
        net_margin: 12,
        payout_ratio: 60,
        ev_ebitda: 7.5,
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
        market_cap: 38000,
        revenue: 40000,
        earnings: 3500,
        surplus_years: 6,
        roa: 4.0,
        current_ratio: 1.0,
        gross_margin: 30,
        net_margin: 8,
        payout_ratio: 80,
        ev_ebitda: 9.5,
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
        market_cap: 42000,
        revenue: 35000,
        earnings: 3000,
        surplus_years: 4,
        roa: 3.5,
        current_ratio: 1.1,
        gross_margin: 28,
        net_margin: 8,
        payout_ratio: 50,
        ev_ebitda: 11.0,
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
        market_cap: 22000,
        revenue: 32000,
        earnings: 3800,
        surplus_years: 7,
        roa: 2.8,
        current_ratio: 1.3,
        gross_margin: 32,
        net_margin: 11,
        payout_ratio: 100,
        ev_ebitda: 5.0,
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
        market_cap: 85000,
        revenue: 42000,
        earnings: 10600,
        surplus_years: 5,
        roa: 2.0,
        current_ratio: 1.5,
        gross_margin: 45,
        net_margin: 25,
        payout_ratio: 25,
        ev_ebitda: 6.5,
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
        market_cap: 48000,
        revenue: 22000,
        earnings: 3800,
        surplus_years: 8,
        roa: 3.5,
        current_ratio: 0.9,
        gross_margin: 50,
        net_margin: 17,
        payout_ratio: 35,
        ev_ebitda: 10.0,
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
        market_cap: 8000,
        revenue: 6500,
        earnings: 1150,
        surplus_years: 6,
        roa: 2.5,
        current_ratio: 1.0,
        gross_margin: 48,
        net_margin: 17,
        payout_ratio: 50,
        ev_ebitda: 5.5,
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
        market_cap: 10000,
        revenue: 6000,
        earnings: 1200,
        surplus_years: 5,
        roa: 3.0,
        current_ratio: 1.1,
        gross_margin: 55,
        net_margin: 20,
        payout_ratio: 45,
        ev_ebitda: 6.0,
      },
    },
  ];

  return sampleAssets.slice(0, MAX_SAMPLE_ASSETS);
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

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
 * Create score breakdown for a single criterion
 */
function createCriterionScore(
  criterion: CriterionRule,
  fundamentals: Record<string, number | null>
): CriterionScore {
  const actualValue = fundamentals[criterion.metric] ?? null;
  const pointsAwarded = evaluateCriterion(criterion, fundamentals);

  return {
    criterionId: criterion.id,
    criterionName: criterion.name,
    metric: criterion.metric,
    metricLabel: METRIC_LABELS[criterion.metric as keyof typeof METRIC_LABELS] ?? criterion.metric,
    operator: criterion.operator,
    operatorLabel:
      OPERATOR_LABELS[criterion.operator as keyof typeof OPERATOR_LABELS] ?? criterion.operator,
    targetValue: criterion.value,
    targetValue2: criterion.value2 ?? undefined,
    actualValue,
    pointsAwarded,
    maxPoints: criterion.points,
    passed: pointsAwarded !== 0,
  };
}

/**
 * Calculate total score and breakdown for an asset against criteria
 *
 * @param criteria - Array of criterion rules
 * @param fundamentals - Asset's fundamental data
 * @returns Tuple of [total score as Decimal, breakdown array]
 */
function calculateAssetScoreWithBreakdown(
  criteria: CriterionRule[],
  fundamentals: Record<string, number | null>
): [Decimal, CriterionScore[]] {
  let totalScore = new Decimal(0);
  const breakdown: CriterionScore[] = [];

  for (const criterion of criteria) {
    const criterionScore = createCriterionScore(criterion, fundamentals);
    breakdown.push(criterionScore);
    totalScore = totalScore.plus(criterionScore.pointsAwarded);
  }

  return [totalScore, breakdown];
}

/**
 * Calculate average score across all assets
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
// MAIN PREVIEW FUNCTION
// =============================================================================

/**
 * Calculate preview scores for criteria against sample assets
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 * AC-5.7.2: Preview shows top 10 scoring assets
 * AC-5.7.3: Preview updates live as criteria modified
 *
 * Performance target: < 500ms for 20 assets
 *
 * @param criteria - Array of criterion rules to evaluate
 * @param previousCriteria - Optional previous criteria for comparison
 * @returns Preview result with top assets and optional comparison
 */
export function calculatePreview(
  criteria: CriterionRule[],
  previousCriteria?: CriterionRule[]
): PreviewResult {
  const sampleAssets = getSampleAssets();

  // Handle empty criteria
  if (criteria.length === 0) {
    return {
      topAssets: [],
      comparison: undefined,
      calculatedAt: new Date().toISOString(),
      sampleSize: sampleAssets.length,
    };
  }

  // Score all assets with current criteria
  const currentScores = new Map<string, Decimal>();
  const assetResults: Array<{ asset: SampleAsset; score: Decimal; breakdown: CriterionScore[] }> =
    [];

  for (const asset of sampleAssets) {
    const [score, breakdown] = calculateAssetScoreWithBreakdown(criteria, asset.fundamentals);
    currentScores.set(asset.symbol, score);
    assetResults.push({ asset, score, breakdown });
  }

  // Sort by score descending
  assetResults.sort((a, b) => b.score.minus(a.score).toNumber());

  // Take top N and create PreviewAsset objects
  const topAssets: PreviewAsset[] = assetResults.slice(0, TOP_N_ASSETS).map((result, index) => ({
    symbol: result.asset.symbol,
    name: result.asset.name,
    score: result.score.toFixed(2),
    rank: index + 1,
    breakdown: result.breakdown,
  }));

  // Calculate comparison if previous criteria provided
  let comparison: ComparisonSummary | undefined;
  if (previousCriteria && previousCriteria.length > 0) {
    const previousScores = new Map<string, Decimal>();

    for (const asset of sampleAssets) {
      const [score] = calculateAssetScoreWithBreakdown(previousCriteria, asset.fundamentals);
      previousScores.set(asset.symbol, score);
    }

    let improved = 0;
    let declined = 0;
    let unchanged = 0;

    for (const [symbol, currentScore] of currentScores.entries()) {
      const previousScore = previousScores.get(symbol);
      if (!previousScore) continue;

      const diff = currentScore.minus(previousScore);
      if (diff.isPositive() && !diff.isZero()) {
        improved++;
      } else if (diff.isNegative()) {
        declined++;
      } else {
        unchanged++;
      }
    }

    comparison = {
      improved,
      declined,
      unchanged,
      previousAverageScore: calculateAverageScore(previousScores),
      currentAverageScore: calculateAverageScore(currentScores),
    };
  }

  return {
    topAssets,
    comparison,
    calculatedAt: new Date().toISOString(),
    sampleSize: sampleAssets.length,
  };
}
