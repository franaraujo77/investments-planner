/**
 * Scoring Engine
 *
 * Story 5.8: Score Calculation Engine
 * Implements ADR-002: Event-Sourced Calculations
 *
 * Core scoring logic using decimal.js for deterministic calculations.
 * Algorithm is CRITERIA-DRIVEN, not asset-driven:
 *   For each criterion → For each asset → Evaluate and award points
 *
 * AC-5.8.1: Criteria-Driven Algorithm Execution Order
 * AC-5.8.2: Decimal Precision for All Calculations
 * AC-5.8.3: Deterministic Calculation
 * AC-5.8.4: Event Emission for Audit Trail
 * AC-5.8.5: Score Storage with Audit Trail
 * AC-5.8.6: Missing Fundamentals Handling
 */

import Decimal from "decimal.js";
import type { CriterionRule, CriterionResult } from "@/lib/db/schema";
import type { AssetWithFundamentals, ScoringEngineConfig } from "@/lib/validations/score-schemas";
import type {
  CalculationEvent,
  CalcStartedEvent,
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcCompletedEvent,
  CriteriaConfig,
  CriterionDefinition,
  PriceSnapshot,
  ExchangeRateSnapshot,
} from "@/lib/events/types";

// Configure decimal.js for deterministic calculations
// AC-5.8.2: precision: 20, rounding: ROUND_HALF_UP
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =============================================================================
// TYPES
// =============================================================================

/**
 * Score calculation result for a single asset
 */
export interface AssetScoreResult {
  assetId: string;
  symbol: string;
  score: string; // Decimal string for precision
  breakdown: CriterionResult[];
  criteriaVersionId: string;
  calculatedAt: Date;
}

/**
 * Event emitter interface for dependency injection
 */
export interface EventEmitter {
  emit(userId: string, event: CalculationEvent): Promise<void>;
}

/**
 * Score calculation batch result
 */
export interface ScoreCalculationResult {
  scores: AssetScoreResult[];
  correlationId: string;
  duration: number;
  assetCount: number;
}

// =============================================================================
// CRITERION EVALUATION (Reused from quick-calc patterns)
// =============================================================================

/**
 * Check if asset has required fundamentals for a criterion
 *
 * AC-5.8.6: Missing Fundamentals Handling
 *
 * @param criterion - The criterion to check
 * @param fundamentals - Asset's fundamental data
 * @returns Object with hasFundamentals flag and missing list
 */
function checkRequiredFundamentals(
  criterion: CriterionRule,
  fundamentals: Record<string, number | null>
): { hasFundamentals: boolean } {
  const requiredFundamentals = criterion.requiredFundamentals || [criterion.metric];

  for (const fundamental of requiredFundamentals) {
    const value = fundamentals[fundamental];
    if (value === null || value === undefined) {
      return { hasFundamentals: false };
    }
  }

  return { hasFundamentals: true };
}

/**
 * Evaluate a criterion against an asset's fundamentals
 *
 * AC-5.8.2: Uses decimal.js for all calculations
 * AC-5.8.3: Deterministic evaluation
 *
 * @param criterion - The criterion rule to evaluate
 * @param fundamentals - Asset's fundamental data
 * @returns Tuple of [matched: boolean, pointsAwarded: number]
 */
function evaluateCriterionCondition(
  criterion: CriterionRule,
  fundamentals: Record<string, number | null>
): [boolean, number] {
  const metricValue = fundamentals[criterion.metric];

  // Handle 'exists' operator - just check if value exists
  if (criterion.operator === "exists") {
    const exists = metricValue !== null && metricValue !== undefined;
    return [exists, exists ? criterion.points : 0];
  }

  // For other operators, need a valid numeric value
  if (metricValue === null || metricValue === undefined) {
    return [false, 0];
  }

  try {
    const value = new Decimal(metricValue);
    const targetValue = new Decimal(criterion.value);
    let matched = false;

    switch (criterion.operator) {
      case "gt":
        matched = value.greaterThan(targetValue);
        break;
      case "lt":
        matched = value.lessThan(targetValue);
        break;
      case "gte":
        matched = value.greaterThanOrEqualTo(targetValue);
        break;
      case "lte":
        matched = value.lessThanOrEqualTo(targetValue);
        break;
      case "equals":
        matched = value.equals(targetValue);
        break;
      case "between": {
        const targetValue2 = criterion.value2 ? new Decimal(criterion.value2) : null;
        if (!targetValue2) return [false, 0];
        matched = value.greaterThanOrEqualTo(targetValue) && value.lessThanOrEqualTo(targetValue2);
        break;
      }
      default:
        matched = false;
    }

    return [matched, matched ? criterion.points : 0];
  } catch {
    // Invalid value or comparison - fail safely
    return [false, 0];
  }
}

/**
 * Evaluate a single criterion for an asset with full breakdown
 *
 * AC-5.8.5: breakdown includes criterionId, criterionName, matched, pointsAwarded, actualValue, skippedReason
 * AC-5.8.6: Missing Fundamentals Handling
 *
 * @param criterion - The criterion to evaluate
 * @param fundamentals - Asset's fundamental data
 * @returns CriterionResult with full breakdown
 */
export function evaluateCriterion(
  criterion: CriterionRule,
  fundamentals: Record<string, number | null>
): CriterionResult {
  // Check required fundamentals first
  const { hasFundamentals } = checkRequiredFundamentals(criterion, fundamentals);

  // If fundamentals missing, skip this criterion
  if (!hasFundamentals) {
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      matched: false,
      pointsAwarded: 0,
      actualValue: null,
      skippedReason: "missing_fundamental",
    };
  }

  // Evaluate the criterion condition
  const [matched, pointsAwarded] = evaluateCriterionCondition(criterion, fundamentals);
  const actualValue = fundamentals[criterion.metric];

  return {
    criterionId: criterion.id,
    criterionName: criterion.name,
    matched,
    pointsAwarded,
    actualValue: actualValue !== null && actualValue !== undefined ? String(actualValue) : null,
    skippedReason: null,
  };
}

// =============================================================================
// SCORING ENGINE
// =============================================================================

/**
 * Calculate scores for assets using criteria-driven algorithm
 *
 * AC-5.8.1: Criteria-Driven Algorithm Execution Order
 *   1. For each criterion in user's criteria set:
 *      a. Get the criterion's target market/sector
 *      b. Find all assets that belong to that market/sector
 *      c. For each matching asset:
 *         - Check if asset has the required fundamentals
 *         - If fundamentals missing: skip this criterion for this asset
 *         - If fundamentals present: evaluate criterion condition
 *         - If condition met: add criterion points to asset's score
 *   2. Aggregate scores: sum all points per asset across all criteria
 *   3. Store results with audit trail
 *
 * AC-5.8.2: Uses decimal.js for all calculations
 * AC-5.8.3: Deterministic - same inputs = same outputs
 *
 * @param criteria - Array of criterion rules
 * @param assets - Array of assets with fundamentals
 * @param criteriaVersionId - Version ID for audit trail
 * @returns Array of asset scores with breakdowns
 */
export function calculateScores(
  criteria: CriterionRule[],
  assets: AssetWithFundamentals[],
  criteriaVersionId: string
): AssetScoreResult[] {
  // Initialize score accumulators for each asset
  const assetScoreMap = new Map<
    string,
    {
      asset: AssetWithFundamentals;
      totalScore: Decimal;
      breakdown: CriterionResult[];
    }
  >();

  // Initialize all assets with zero score
  for (const asset of assets) {
    assetScoreMap.set(asset.id, {
      asset,
      totalScore: new Decimal(0),
      breakdown: [],
    });
  }

  // AC-5.8.1: Criteria-driven algorithm - iterate criteria first
  for (const criterion of criteria) {
    // For each asset, evaluate this criterion
    for (const asset of assets) {
      const assetData = assetScoreMap.get(asset.id)!;

      // Evaluate criterion for this asset
      const result = evaluateCriterion(criterion, asset.fundamentals);
      assetData.breakdown.push(result);

      // Add points to total score using decimal.js
      if (result.matched) {
        assetData.totalScore = assetData.totalScore.plus(result.pointsAwarded);
      }
    }
  }

  // Convert to results array
  const calculatedAt = new Date();
  const results: AssetScoreResult[] = [];

  for (const assetData of assetScoreMap.values()) {
    results.push({
      assetId: assetData.asset.id,
      symbol: assetData.asset.symbol,
      score: assetData.totalScore.toFixed(4), // AC-5.8.2: 4 decimal places
      breakdown: assetData.breakdown,
      criteriaVersionId,
      calculatedAt,
    });
  }

  return results;
}

/**
 * Calculate scores with event emission for audit trail
 *
 * AC-5.8.4: Event Emission for Audit Trail
 *   - CALC_STARTED: correlationId, userId, timestamp
 *   - INPUTS_CAPTURED: criteriaVersionId, criteria config, assetIds
 *   - SCORES_COMPUTED: Array<{ assetId, score, breakdown }>
 *   - CALC_COMPLETED: correlationId, duration, assetCount
 *
 * @param config - Scoring engine configuration
 * @param criteria - Array of criterion rules
 * @param assets - Array of assets with fundamentals
 * @param eventEmitter - Event emitter for audit trail
 * @returns Score calculation result with correlationId
 */
export async function calculateScoresWithEvents(
  config: ScoringEngineConfig,
  criteria: CriterionRule[],
  assets: AssetWithFundamentals[],
  eventEmitter: EventEmitter
): Promise<ScoreCalculationResult> {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  // Emit CALC_STARTED
  const calcStartedEvent: CalcStartedEvent = {
    type: "CALC_STARTED",
    correlationId,
    userId: config.userId,
    timestamp: new Date(),
    ...(config.targetMarket ? { market: config.targetMarket } : {}),
  };
  await eventEmitter.emit(config.userId, calcStartedEvent);

  // Build criteria config for event
  const criteriaConfig: CriteriaConfig = {
    id: config.criteriaVersionId,
    version: config.criteriaVersionId,
    name: "Scoring Criteria",
    criteria: criteria.map((c) => ({
      id: c.id,
      name: c.name,
      operator:
        c.operator === "equals"
          ? "eq"
          : (c.operator as "gt" | "gte" | "lt" | "lte" | "eq" | "between"),
      value: c.operator === "between" && c.value2 ? [c.value, c.value2] : c.value,
      points: c.points,
      weight: 1, // Default weight
    })),
  };

  // Emit INPUTS_CAPTURED
  const inputsCapturedEvent: InputsCapturedEvent = {
    type: "INPUTS_CAPTURED",
    correlationId,
    criteriaVersionId: config.criteriaVersionId,
    criteria: criteriaConfig,
    prices: [], // Prices not used in this version
    rates: [], // Rates not used in this version
    assetIds: assets.map((a) => a.id),
  };
  await eventEmitter.emit(config.userId, inputsCapturedEvent);

  // Calculate scores
  const scores = calculateScores(criteria, assets, config.criteriaVersionId);

  // Emit SCORES_COMPUTED
  const scoresComputedEvent: ScoresComputedEvent = {
    type: "SCORES_COMPUTED",
    correlationId,
    results: scores.map((s) => ({
      assetId: s.assetId,
      symbol: s.symbol,
      score: s.score,
      maxPossibleScore: String(criteria.reduce((sum, c) => sum + Math.max(0, c.points), 0)),
      percentage: "0", // Not calculating percentage for now
      breakdown: s.breakdown.map((b) => ({
        criterionId: b.criterionId,
        criterionName: b.criterionName,
        rawValue: b.actualValue ?? "0",
        passed: b.matched,
        pointsAwarded: b.pointsAwarded,
        maxPoints: criteria.find((c) => c.id === b.criterionId)?.points ?? 0,
      })),
    })),
  };
  await eventEmitter.emit(config.userId, scoresComputedEvent);

  const duration = Date.now() - startTime;

  // Emit CALC_COMPLETED
  const calcCompletedEvent: CalcCompletedEvent = {
    type: "CALC_COMPLETED",
    correlationId,
    duration,
    assetCount: assets.length,
    status: "success",
  };
  await eventEmitter.emit(config.userId, calcCompletedEvent);

  return {
    scores,
    correlationId,
    duration,
    assetCount: assets.length,
  };
}

// =============================================================================
// LEGACY EXPORTS (Backward compatibility with Story 1.4)
// =============================================================================

/**
 * Legacy AssetData interface for backward compatibility
 */
export interface AssetData {
  id: string;
  symbol: string;
  metrics: Record<string, string>;
}

/**
 * Legacy ScoringEngine class for backward compatibility
 *
 * This class is kept for backward compatibility with Story 1.4.
 * New code should use the functional exports above.
 */
export class ScoringEngine {
  /**
   * Legacy evaluateCriterion for backward compatibility with Story 1.4 tests
   */
  evaluateCriterion(criterion: CriterionDefinition, rawValue: string) {
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
          passed = false;
      }
    } catch {
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

  calculateScore(
    asset: AssetData,
    criteria: CriteriaConfig,
    _prices?: PriceSnapshot[],
    _rates?: ExchangeRateSnapshot[]
  ) {
    void _prices;
    void _rates;

    // Convert legacy format to new format
    const fundamentals: Record<string, number | null> = {};
    for (const [key, value] of Object.entries(asset.metrics)) {
      fundamentals[key] = value ? parseFloat(value) : null;
    }

    const assetWithFundamentals: AssetWithFundamentals = {
      id: asset.id,
      symbol: asset.symbol,
      fundamentals,
    };

    // Convert CriteriaConfig to CriterionRule[]
    const criterionRules: CriterionRule[] = criteria.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      metric: c.name as CriterionRule["metric"], // Best effort mapping
      operator: c.operator === "eq" ? "equals" : (c.operator as CriterionRule["operator"]),
      value: Array.isArray(c.value) ? c.value[0] : c.value,
      value2: Array.isArray(c.value) ? c.value[1] : undefined,
      points: c.points,
      requiredFundamentals: [c.name],
      sortOrder: 0,
    }));

    const [result] = calculateScores(criterionRules, [assetWithFundamentals], criteria.id);

    // Calculate max possible score
    let maxPossible = 0;
    for (const c of criteria.criteria) {
      maxPossible += c.points * c.weight;
    }

    // Calculate percentage
    const score = parseFloat(result?.score ?? "0");
    const percentage = maxPossible > 0 ? (score / maxPossible) * 100 : 0;

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      score: result?.score ?? "0.0000",
      maxPossibleScore: maxPossible.toFixed(4),
      percentage: percentage.toFixed(4),
      breakdown:
        result?.breakdown.map((b) => ({
          criterionId: b.criterionId,
          criterionName: b.criterionName,
          rawValue: b.actualValue ?? "0",
          passed: b.matched,
          pointsAwarded: b.pointsAwarded,
          maxPoints: criterionRules.find((c) => c.id === b.criterionId)?.points ?? 0,
        })) ?? [],
    };
  }

  calculateScores(
    assets: AssetData[],
    criteria: CriteriaConfig,
    prices: PriceSnapshot[],
    rates: ExchangeRateSnapshot[]
  ) {
    return assets.map((asset) => this.calculateScore(asset, criteria, prices, rates));
  }

  calculateFromInputs(inputs: InputsCapturedEvent) {
    const assets: AssetData[] = inputs.assetIds.map((assetId) => {
      const price = inputs.prices.find((p) => p.assetId === assetId);
      return {
        id: assetId,
        symbol: price?.symbol ?? assetId,
        metrics: {
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
 */
export function createScoringFunction(engine: ScoringEngine = scoringEngine) {
  return (inputs: InputsCapturedEvent) => engine.calculateFromInputs(inputs);
}
