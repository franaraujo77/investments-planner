/**
 * Scoring Engine
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Implements ADR-002: Event-Sourced Calculations
 *
 * Core scoring logic using decimal.js for deterministic calculations.
 * All operations are pure functions - same inputs always produce same outputs.
 *
 * AC5: Deterministic calculations (same inputs = same output)
 */

import { Decimal } from "./decimal-config";
import { add, multiply } from "./decimal-utils";
import type {
  AssetScoreResult,
  CriteriaConfig,
  CriterionDefinition,
  CriterionScore,
  PriceSnapshot,
  ExchangeRateSnapshot,
  InputsCapturedEvent,
} from "@/lib/events/types";

/**
 * Asset data structure for scoring
 *
 * Contains all data needed to score an asset against criteria.
 */
export interface AssetData {
  id: string;
  symbol: string;
  /** Asset metrics keyed by metric name (e.g., 'dividend_yield', 'pe_ratio') */
  metrics: Record<string, string>;
}

/**
 * Scoring Engine
 *
 * Provides deterministic score calculation for assets against user-defined criteria.
 * All numeric operations use decimal.js to avoid floating-point errors.
 *
 * @example
 * ```typescript
 * const engine = new ScoringEngine();
 *
 * const result = engine.calculateScore(assetData, criteria, prices, rates);
 * console.log(result.score); // "85.5000"
 * console.log(result.breakdown); // Array of CriterionScore
 * ```
 */
export class ScoringEngine {
  /**
   * Calculates the score for a single asset
   *
   * AC5: Uses decimal.js for deterministic calculations
   *
   * @param asset - Asset data including metrics
   * @param criteria - Scoring criteria configuration
   * @param prices - Price snapshots for valuation
   * @param rates - Exchange rates for currency conversion
   * @returns Complete score result with breakdown
   */
  calculateScore(
    asset: AssetData,
    criteria: CriteriaConfig,
    // These parameters are reserved for future currency conversion support
    _prices?: PriceSnapshot[],
    _rates?: ExchangeRateSnapshot[]
  ): AssetScoreResult {
    // Suppress unused variable warnings - params needed for API consistency
    void _prices;
    void _rates;
    const breakdown: CriterionScore[] = [];
    let totalScore = new Decimal(0);
    let maxPossible = new Decimal(0);

    for (const criterion of criteria.criteria) {
      const rawValue = asset.metrics[criterion.name] ?? "0";
      const criterionResult = this.evaluateCriterion(criterion, rawValue);

      breakdown.push(criterionResult);

      // Add weighted points to total
      const weightedPoints = multiply(
        new Decimal(criterionResult.pointsAwarded),
        new Decimal(criterion.weight)
      );
      const weightedMax = multiply(
        new Decimal(criterionResult.maxPoints),
        new Decimal(criterion.weight)
      );

      totalScore = add(totalScore, weightedPoints);
      maxPossible = add(maxPossible, weightedMax);
    }

    // Calculate percentage (avoid division by zero)
    const percentage = maxPossible.isZero()
      ? new Decimal(0)
      : totalScore.dividedBy(maxPossible).times(100);

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      score: totalScore.toFixed(4),
      maxPossibleScore: maxPossible.toFixed(4),
      percentage: percentage.toFixed(4),
      breakdown,
    };
  }

  /**
   * Evaluates a single criterion against a value
   *
   * AC5: Deterministic evaluation using decimal.js
   *
   * Operators:
   * - gt: greater than
   * - gte: greater than or equal
   * - lt: less than
   * - lte: less than or equal
   * - eq: equal
   * - between: within range (inclusive)
   *
   * @param criterion - Criterion definition with operator and target value
   * @param rawValue - Actual value from the asset
   * @returns Evaluation result with points awarded
   */
  evaluateCriterion(criterion: CriterionDefinition, rawValue: string): CriterionScore {
    const value = new Decimal(rawValue || "0");
    let passed = false;

    try {
      switch (criterion.operator) {
        case "gt": {
          const target = new Decimal(criterion.value as string);
          passed = value.greaterThan(target);
          break;
        }
        case "gte": {
          const target = new Decimal(criterion.value as string);
          passed = value.greaterThanOrEqualTo(target);
          break;
        }
        case "lt": {
          const target = new Decimal(criterion.value as string);
          passed = value.lessThan(target);
          break;
        }
        case "lte": {
          const target = new Decimal(criterion.value as string);
          passed = value.lessThanOrEqualTo(target);
          break;
        }
        case "eq": {
          const target = new Decimal(criterion.value as string);
          passed = value.equals(target);
          break;
        }
        case "between": {
          const [minStr, maxStr] = criterion.value as [string, string];
          const min = new Decimal(minStr);
          const max = new Decimal(maxStr);
          passed = value.greaterThanOrEqualTo(min) && value.lessThanOrEqualTo(max);
          break;
        }
        default:
          // Unknown operator - fail safely
          passed = false;
      }
    } catch {
      // Invalid value or comparison - fail safely
      passed = false;
    }

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      rawValue,
      passed,
      pointsAwarded: passed ? criterion.points : 0,
      maxPoints: criterion.points,
    };
  }

  /**
   * Calculates scores for multiple assets
   *
   * AC5: Deterministic batch calculation
   *
   * @param assets - Array of asset data
   * @param criteria - Scoring criteria configuration
   * @param prices - Price snapshots
   * @param rates - Exchange rates
   * @returns Array of score results
   */
  calculateScores(
    assets: AssetData[],
    criteria: CriteriaConfig,
    prices: PriceSnapshot[],
    rates: ExchangeRateSnapshot[]
  ): AssetScoreResult[] {
    return assets.map((asset) => this.calculateScore(asset, criteria, prices, rates));
  }

  /**
   * Calculates scores from an InputsCapturedEvent
   *
   * AC5: Used by replay function for deterministic re-execution
   *
   * Note: This is a simplified version. In production, asset data
   * would be derived from prices and additional asset information.
   *
   * @param inputs - Event containing all calculation inputs
   * @returns Array of score results
   */
  calculateFromInputs(inputs: InputsCapturedEvent): AssetScoreResult[] {
    // Create asset data from prices
    // In production, this would merge price data with asset fundamentals
    const assets: AssetData[] = inputs.assetIds.map((assetId) => {
      const price = inputs.prices.find((p) => p.assetId === assetId);
      return {
        id: assetId,
        symbol: price?.symbol ?? assetId,
        metrics: {
          // Default metrics from price data
          price: price?.price ?? "0",
        },
      };
    });

    return this.calculateScores(assets, inputs.criteria, inputs.prices, inputs.rates);
  }
}

/**
 * Default scoring engine instance
 */
export const scoringEngine = new ScoringEngine();

/**
 * Creates a scoring function from a scoring engine
 *
 * Used by the replay function for re-executing calculations.
 *
 * @param engine - Scoring engine instance
 * @returns Scoring function compatible with replay()
 */
export function createScoringFunction(
  engine: ScoringEngine = scoringEngine
): (inputs: InputsCapturedEvent) => AssetScoreResult[] {
  return (inputs) => engine.calculateFromInputs(inputs);
}
