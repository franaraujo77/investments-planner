/**
 * Event Sourcing Types for Calculation Pipeline
 *
 * Implements ADR-002: Event-Sourced Calculations
 *
 * All calculation steps are captured as immutable events, enabling:
 * - Perfect audit trail for regulatory/user disputes
 * - Replay capability for debugging and verification
 * - Complete transparency in calculation methodology
 *
 * Event Flow:
 * CALC_STARTED → INPUTS_CAPTURED → SCORES_COMPUTED → CALC_COMPLETED
 */

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

/**
 * Snapshot of asset price at calculation time
 */
export interface PriceSnapshot {
  assetId: string;
  symbol: string;
  price: string; // Stored as string to preserve Decimal precision
  currency: string;
  fetchedAt: Date;
  source: string;
}

/**
 * Snapshot of exchange rate at calculation time
 */
export interface ExchangeRateSnapshot {
  fromCurrency: string;
  toCurrency: string;
  rate: string; // Stored as string to preserve Decimal precision
  fetchedAt: Date;
  source: string;
}

/**
 * User-defined scoring criteria configuration
 */
export interface CriteriaConfig {
  id: string;
  version: string;
  name: string;
  criteria: CriterionDefinition[];
}

/**
 * Individual criterion definition
 */
export interface CriterionDefinition {
  id: string;
  name: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between";
  value: string | [string, string]; // Single value or range
  points: number;
  weight: number;
}

/**
 * Score breakdown for a single criterion
 */
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  rawValue: string;
  passed: boolean;
  pointsAwarded: number;
  maxPoints: number;
}

/**
 * Complete score result for an asset
 */
export interface AssetScoreResult {
  assetId: string;
  symbol: string;
  score: string; // Total score as string to preserve precision
  maxPossibleScore: string;
  percentage: string;
  breakdown: CriterionScore[];
}

// =============================================================================
// CALCULATION EVENTS (Discriminated Union)
// =============================================================================

/**
 * Event: Calculation started
 *
 * Emitted when overnight scoring job begins for a user
 */
export interface CalcStartedEvent {
  type: "CALC_STARTED";
  correlationId: string;
  userId: string;
  timestamp: Date;
  market?: string;
}

/**
 * Event: All inputs captured
 *
 * Emitted after all data is fetched and ready for calculation.
 * This single event captures everything needed for replay.
 */
export interface InputsCapturedEvent {
  type: "INPUTS_CAPTURED";
  correlationId: string;
  criteriaVersionId: string;
  criteria: CriteriaConfig;
  prices: PriceSnapshot[];
  rates: ExchangeRateSnapshot[];
  assetIds: string[];
}

/**
 * Event: Scores computed
 *
 * Emitted after all asset scores are calculated
 */
export interface ScoresComputedEvent {
  type: "SCORES_COMPUTED";
  correlationId: string;
  results: AssetScoreResult[];
}

/**
 * Event: Calculation completed
 *
 * Emitted when scoring job finishes (success, partial, or failed)
 */
export interface CalcCompletedEvent {
  type: "CALC_COMPLETED";
  correlationId: string;
  duration: number; // milliseconds
  assetCount: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
}

/**
 * Event: Currency converted
 *
 * Story 6.5: Currency Conversion Logic (AC-6.5.4)
 *
 * Emitted after each successful currency conversion for audit trail.
 * Enables verification of historical conversions and dispute resolution.
 */
export interface CurrencyConvertedEvent {
  type: "CURRENCY_CONVERTED";
  correlationId: string;
  /** Original value before conversion */
  sourceValue: string;
  /** Source currency code */
  sourceCurrency: string;
  /** Target currency code */
  targetCurrency: string;
  /** Exchange rate used for conversion */
  rate: string;
  /** Date the rate represents (YYYY-MM-DD) */
  rateDate: string;
  /** Converted value after conversion */
  resultValue: string;
  /** Whether the rate was older than 24 hours */
  isStaleRate: boolean;
  /** Timestamp of the conversion */
  timestamp: Date;
}

/**
 * Event: Data refreshed
 *
 * Story 6.6: Force Data Refresh
 *
 * Emitted after a user-initiated data refresh for audit trail.
 * Enables tracking of refresh frequency and identifying patterns.
 */
export interface DataRefreshedEvent {
  type: "DATA_REFRESHED";
  correlationId: string;
  /** User who triggered the refresh */
  userId: string;
  /** Type of data that was refreshed */
  refreshType: "prices" | "rates" | "fundamentals" | "all";
  /** Symbols that were refreshed (if specific symbols provided) */
  symbols?: string[] | undefined;
  /** When the refresh started */
  startedAt: Date;
  /** When the refresh completed */
  completedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether all data types were successfully refreshed */
  success: boolean;
  /** Error message if any component failed */
  errorMessage?: string | undefined;
  /** Providers that served the data */
  providers: {
    prices?: string | undefined;
    rates?: string | undefined;
    fundamentals?: string | undefined;
  };
}

/**
 * Event: Recommendations inputs captured
 *
 * Story 7.4: Generate Investment Recommendations (AC-7.4.5)
 *
 * Emitted after all inputs for recommendation calculation are gathered.
 * Captures portfolio state, scores, and allocation targets for audit/replay.
 */
export interface RecsInputsCapturedEvent {
  type: "RECS_INPUTS_CAPTURED";
  correlationId: string;
  /** Portfolio state at calculation time */
  portfolioState: {
    portfolioId: string;
    totalValue: string;
    baseCurrency: string;
    assets: Array<{
      assetId: string;
      symbol: string;
      currentValue: string;
      currentAllocation: string;
    }>;
  };
  /** Allocation targets at calculation time */
  allocationTargets: {
    classes: Array<{
      classId: string;
      className: string;
      targetMin: string | null;
      targetMax: string | null;
      minAllocationValue: string | null;
    }>;
    subclasses: Array<{
      subclassId: string;
      subclassName: string;
      classId: string;
      targetMin: string | null;
      targetMax: string | null;
      minAllocationValue: string | null;
    }>;
  };
  /** Asset scores at calculation time */
  scores: Array<{
    assetId: string;
    symbol: string;
    score: string;
    criteriaVersionId: string;
  }>;
  /** Total investable amount */
  totalInvestable: string;
  /** Contribution input */
  contribution: string;
  /** Dividends input */
  dividends: string;
}

/**
 * Event: Recommendations computed
 *
 * Story 7.4: Generate Investment Recommendations (AC-7.4.5)
 *
 * Emitted after recommendation calculation completes with results.
 */
export interface RecsComputedEvent {
  type: "RECS_COMPUTED";
  correlationId: string;
  /** Recommendation ID in database */
  recommendationId: string;
  /** Total investable amount */
  totalInvestable: string;
  /** Total amount allocated (should equal totalInvestable) */
  totalAllocated: string;
  /** Number of assets receiving recommendations */
  assetCount: number;
  /** Individual recommendations */
  items: Array<{
    assetId: string;
    symbol: string;
    recommendedAmount: string;
    priority: string;
    isOverAllocated: boolean;
  }>;
}

/**
 * Event: Investments confirmed
 *
 * Story 7.8: Confirm Recommendations (ADR-002)
 *
 * Emitted after investments are confirmed and recorded for audit trail.
 * Captures complete details for dispute resolution and verification.
 */
export interface InvestmentConfirmedEvent {
  type: "INVESTMENT_CONFIRMED";
  correlationId: string;
  /** Recommendation session ID that was confirmed */
  recommendationId: string;
  /** User who confirmed the investments */
  userId: string;
  /** Portfolio that was updated */
  portfolioId: string;
  /** Total amount invested across all assets (decimal string) */
  totalInvested: string;
  /** Number of individual investments created */
  investmentCount: number;
  /** Individual investment details */
  investments: Array<{
    /** Created investment record ID */
    investmentId: string;
    /** Portfolio asset ID */
    assetId: string;
    /** Asset ticker symbol */
    symbol: string;
    /** Quantity of units purchased (decimal string) */
    quantity: string;
    /** Price per unit (decimal string) */
    pricePerUnit: string;
    /** Total amount for this investment (decimal string) */
    totalAmount: string;
    /** What was recommended for comparison (decimal string) */
    recommendedAmount: string;
  }>;
  /** Allocation changes */
  allocations: {
    /** Allocation percentages before investment */
    before: Record<string, string>;
    /** Allocation percentages after investment */
    after: Record<string, string>;
  };
  /** When the confirmation occurred */
  timestamp: Date;
}

/**
 * Discriminated union of all calculation events
 *
 * Use this type when working with events from the calculation_events table
 */
export type CalculationEvent =
  | CalcStartedEvent
  | InputsCapturedEvent
  | ScoresComputedEvent
  | CalcCompletedEvent
  | CurrencyConvertedEvent
  | DataRefreshedEvent
  | RecsInputsCapturedEvent
  | RecsComputedEvent
  | InvestmentConfirmedEvent;

// =============================================================================
// EVENT TYPE GUARDS
// =============================================================================

export function isCalcStartedEvent(event: CalculationEvent): event is CalcStartedEvent {
  return event.type === "CALC_STARTED";
}

export function isInputsCapturedEvent(event: CalculationEvent): event is InputsCapturedEvent {
  return event.type === "INPUTS_CAPTURED";
}

export function isScoresComputedEvent(event: CalculationEvent): event is ScoresComputedEvent {
  return event.type === "SCORES_COMPUTED";
}

export function isCalcCompletedEvent(event: CalculationEvent): event is CalcCompletedEvent {
  return event.type === "CALC_COMPLETED";
}

export function isCurrencyConvertedEvent(event: CalculationEvent): event is CurrencyConvertedEvent {
  return event.type === "CURRENCY_CONVERTED";
}

export function isDataRefreshedEvent(event: CalculationEvent): event is DataRefreshedEvent {
  return event.type === "DATA_REFRESHED";
}

export function isRecsInputsCapturedEvent(
  event: CalculationEvent
): event is RecsInputsCapturedEvent {
  return event.type === "RECS_INPUTS_CAPTURED";
}

export function isRecsComputedEvent(event: CalculationEvent): event is RecsComputedEvent {
  return event.type === "RECS_COMPUTED";
}

export function isInvestmentConfirmedEvent(
  event: CalculationEvent
): event is InvestmentConfirmedEvent {
  return event.type === "INVESTMENT_CONFIRMED";
}

// =============================================================================
// EVENT CONSTANTS
// =============================================================================

export const CALCULATION_EVENT_TYPES = [
  "CALC_STARTED",
  "INPUTS_CAPTURED",
  "SCORES_COMPUTED",
  "CALC_COMPLETED",
  "CURRENCY_CONVERTED",
  "DATA_REFRESHED",
  "RECS_INPUTS_CAPTURED",
  "RECS_COMPUTED",
  "INVESTMENT_CONFIRMED",
] as const;

export type CalculationEventType = (typeof CALCULATION_EVENT_TYPES)[number];
