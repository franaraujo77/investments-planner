/**
 * Recommendation Types
 *
 * Story 7.4: Generate Investment Recommendations
 * Type definitions for recommendation generation and display
 *
 * AC-7.4.1: Priority Ranking by Allocation Gap x Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.4: Minimum Allocation Values Enforced
 * AC-7.4.5: Event Sourcing for Audit Trail
 */

import type { RecommendationItemBreakdown } from "@/lib/db/schema";

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Input for generating recommendations
 *
 * Used by API route and RecommendationService
 */
export interface GenerateRecommendationsInput {
  /** User's base currency for calculations */
  baseCurrency: string;
  /** Monthly contribution amount (decimal string) */
  contribution: string;
  /** Dividends received (decimal string, defaults to "0") */
  dividends: string;
  /** Portfolio ID to generate recommendations for */
  portfolioId: string;
}

// =============================================================================
// ASSET CONTEXT TYPES
// =============================================================================

/**
 * Asset with allocation and score context for recommendation calculation
 *
 * Combines data from portfolio, scores, and allocation targets
 */
export interface AssetWithContext {
  /** Portfolio asset ID */
  id: string;
  /** Asset ticker symbol */
  symbol: string;
  /** Asset name */
  name: string | null;
  /** Asset class ID (nullable) */
  classId: string | null;
  /** Asset class name (nullable) */
  className: string | null;
  /** Subclass ID (nullable) */
  subclassId: string | null;
  /** Subclass name (nullable) */
  subclassName: string | null;
  /** Current allocation percentage (decimal string) */
  currentAllocation: string;
  /** Target allocation midpoint percentage (decimal string) */
  targetAllocation: string;
  /** Allocation gap: target - current (decimal string) */
  allocationGap: string;
  /** Asset score from scoring engine (decimal string) */
  score: string;
  /** Current value in base currency (decimal string) */
  currentValue: string;
  /** Minimum allocation value for this asset's class (decimal string, nullable) */
  minAllocationValue: string | null;
  /** Whether asset is over-allocated (currentAllocation > targetMax) */
  isOverAllocated: boolean;
}

/**
 * Asset with calculated priority for sorting
 *
 * AC-7.4.1: priority = allocation_gap × (score / 100)
 */
export interface AssetWithPriority extends AssetWithContext {
  /** Calculated priority weight (decimal string) */
  priority: string;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Individual asset recommendation result
 *
 * AC-7.4.4: Includes redistributed amounts from minimum enforcement
 */
export interface RecommendationItemResult {
  /** Portfolio asset ID */
  assetId: string;
  /** Asset ticker symbol */
  symbol: string;
  /** Asset score (decimal string) */
  score: string;
  /** Current allocation percentage (decimal string) */
  currentAllocation: string;
  /** Target allocation percentage (decimal string) */
  targetAllocation: string;
  /** Allocation gap (decimal string) */
  allocationGap: string;
  /** Recommended investment amount (decimal string) */
  recommendedAmount: string;
  /** Whether asset is over-allocated */
  isOverAllocated: boolean;
  /** Detailed breakdown for audit */
  breakdown: RecommendationItemBreakdown;
  /** Display order (lower = higher priority) */
  sortOrder: number;
}

/**
 * Complete recommendation generation result
 *
 * AC-7.4.3: sum(items.recommendedAmount) === totalInvestable
 * AC-7.4.5: correlationId links to event store
 */
export interface GenerateRecommendationsResult {
  /** Recommendation session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Portfolio ID */
  portfolioId: string;
  /** Input contribution amount (decimal string) */
  contribution: string;
  /** Input dividends amount (decimal string) */
  dividends: string;
  /** Total investable: contribution + dividends (decimal string) */
  totalInvestable: string;
  /** User's base currency */
  baseCurrency: string;
  /** Correlation ID for event store linkage */
  correlationId: string;
  /** Recommendation status */
  status: RecommendationStatus;
  /** When recommendations were generated */
  generatedAt: Date;
  /** When recommendations expire (24h TTL) */
  expiresAt: Date;
  /** Individual asset recommendations */
  items: RecommendationItemResult[];
  /** Calculation duration in milliseconds */
  durationMs: number;
}

// =============================================================================
// STATUS AND ENUMS
// =============================================================================

/**
 * Recommendation status values
 */
export type RecommendationStatus = "pending" | "active" | "confirmed" | "expired";

// =============================================================================
// EVENT TYPES (for RECS_COMPUTED event)
// =============================================================================

/**
 * Portfolio state snapshot for INPUTS_CAPTURED event
 *
 * AC-7.4.5: INPUTS_CAPTURED stores portfolio state, scores snapshot, allocation targets
 */
export interface PortfolioStateSnapshot {
  /** Portfolio ID */
  portfolioId: string;
  /** Total portfolio value in base currency */
  totalValue: string;
  /** Base currency */
  baseCurrency: string;
  /** Individual asset states */
  assets: Array<{
    assetId: string;
    symbol: string;
    currentValue: string;
    currentAllocation: string;
  }>;
}

/**
 * Allocation targets snapshot for INPUTS_CAPTURED event
 */
export interface AllocationTargetsSnapshot {
  /** Asset class targets */
  classes: Array<{
    classId: string;
    className: string;
    targetMin: string | null;
    targetMax: string | null;
    minAllocationValue: string | null;
  }>;
  /** Subclass targets */
  subclasses: Array<{
    subclassId: string;
    subclassName: string;
    classId: string;
    targetMin: string | null;
    targetMax: string | null;
    minAllocationValue: string | null;
  }>;
}

/**
 * Scores snapshot for INPUTS_CAPTURED event
 */
export interface ScoresSnapshot {
  /** Asset scores */
  assets: Array<{
    assetId: string;
    symbol: string;
    score: string;
    criteriaVersionId: string;
  }>;
}

/**
 * RECS_COMPUTED event payload
 *
 * AC-7.4.5: Event sourcing for audit trail
 */
export interface RecsComputedPayload {
  /** Recommendation ID */
  recommendationId: string;
  /** Total investable amount */
  totalInvestable: string;
  /** Total amount allocated (should equal totalInvestable unless all over-allocated) */
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
 * RECS_INPUTS_CAPTURED event payload
 *
 * Extended INPUTS_CAPTURED for recommendation-specific context
 */
export interface RecsInputsCapturedPayload {
  /** Portfolio state at calculation time */
  portfolioState: PortfolioStateSnapshot;
  /** Allocation targets at calculation time */
  allocationTargets: AllocationTargetsSnapshot;
  /** Asset scores at calculation time */
  scores: ScoresSnapshot;
  /** Total investable amount */
  totalInvestable: string;
  /** Contribution input */
  contribution: string;
  /** Dividends input */
  dividends: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * API response for recommendation generation
 */
export interface GenerateRecommendationsResponse {
  data: {
    id: string;
    contribution: string;
    dividends: string;
    totalInvestable: string;
    baseCurrency: string;
    generatedAt: string; // ISO date string
    expiresAt: string; // ISO date string
    items: Array<{
      assetId: string;
      symbol: string;
      score: string;
      currentAllocation: string;
      targetAllocation: string;
      allocationGap: string;
      recommendedAmount: string;
      isOverAllocated: boolean;
    }>;
  };
}

/**
 * Validation error details for API
 */
export interface RecommendationValidationError {
  error: string;
  code: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
  };
}

// =============================================================================
// BREAKDOWN TYPES (Story 7.7)
// =============================================================================

/**
 * Individual calculation step for breakdown display
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.3: Formula Display - shows step-by-step calculation
 */
export interface CalculationStep {
  /** Step description (e.g., "Calculate allocation gap") */
  step: string;
  /** Calculated value for this step (e.g., "2.0%") */
  value: string;
  /** Formula used (e.g., "target_mid - current") */
  formula: string;
}

/**
 * Audit trail information for recommendation breakdown
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.4: Audit Trail Information
 */
export interface AuditTrailInfo {
  /** Correlation ID linking to calculation events */
  correlationId: string;
  /** When the recommendation was generated (ISO 8601 string) */
  generatedAt: string;
  /** Version ID of criteria used for scoring */
  criteriaVersionId: string;
}

/**
 * Calculation inputs captured at generation time
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 */
export interface CalculationInputs {
  /** Current asset value in base currency (decimal string) */
  currentValue: string;
  /** Total portfolio value in base currency (decimal string) */
  portfolioTotal: string;
  /** Current allocation percentage (decimal string) */
  currentPercentage: string;
  /** Target allocation range */
  targetRange: {
    min: string;
    max: string;
  };
  /** Asset score (decimal string) */
  score: string;
  /** Criteria version used for scoring */
  criteriaVersion: string;
}

/**
 * Calculation result with reasoning
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.3: Formula Display
 */
export interface CalculationResult {
  /** Final recommended amount (decimal string) */
  recommendedAmount: string;
  /** Human-readable explanation */
  reasoning: string;
}

/**
 * Breakdown display item - subset of fields for API response
 *
 * Story 7.7: View Recommendation Breakdown
 */
export interface BreakdownDisplayItem {
  /** Portfolio asset ID */
  assetId: string;
  /** Asset ticker symbol */
  symbol: string;
  /** Asset score (decimal string) */
  score: string;
  /** Current allocation percentage (decimal string) */
  currentAllocation: string;
  /** Target allocation percentage (decimal string) */
  targetAllocation: string;
  /** Allocation gap (decimal string) */
  allocationGap: string;
  /** Recommended investment amount (decimal string) */
  recommendedAmount: string;
  /** Whether asset is over-allocated */
  isOverAllocated: boolean;
}

/**
 * Complete detailed breakdown for a recommendation item
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.1-7.7.4: All breakdown panel requirements
 *
 * Used by API response and breakdown panel component
 */
export interface DetailedBreakdown {
  /** The recommendation item being explained */
  item: BreakdownDisplayItem;
  /** Calculation details */
  calculation: {
    /** Input values used for calculation */
    inputs: CalculationInputs;
    /** Step-by-step calculation breakdown */
    steps: CalculationStep[];
    /** Final result and reasoning */
    result: CalculationResult;
  };
  /** Audit trail for traceability */
  auditTrail: AuditTrailInfo;
}

/**
 * API response for breakdown endpoint
 *
 * Story 7.7: View Recommendation Breakdown
 * GET /api/recommendations/:id/breakdown?itemId=uuid
 */
export interface BreakdownResponse {
  data: DetailedBreakdown;
}

// =============================================================================
// INVESTMENT CONFIRMATION TYPES (Story 7.8)
// =============================================================================

/**
 * Input for confirming investments
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.1: Click Opens Confirmation Modal
 * AC-7.8.3: Confirm Records Investments
 */
export interface ConfirmInvestmentInput {
  /** Recommendation session ID to confirm */
  recommendationId: string;
  /** Individual investment amounts */
  investments: Array<{
    /** Portfolio asset ID */
    assetId: string;
    /** Asset ticker symbol */
    ticker: string;
    /** Actual amount invested (decimal string) */
    actualAmount: string;
    /** Price per unit at time of investment (decimal string) */
    pricePerUnit: string;
  }>;
}

/**
 * Result of investment confirmation
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.3: Investments Recorded Successfully
 */
export interface ConfirmInvestmentResult {
  /** Whether confirmation succeeded */
  success: boolean;
  /** Created investment record IDs */
  investmentIds: string[];
  /** Summary of the transaction */
  summary: {
    /** Total amount invested (decimal string) */
    totalInvested: string;
    /** Number of assets updated */
    assetsUpdated: number;
  };
  /** Before/after allocation comparison */
  allocations: {
    /** Allocation percentages before investment */
    before: Record<string, string>;
    /** Allocation percentages after investment */
    after: Record<string, string>;
  };
}

/**
 * State management for confirmation modal
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.1: Modal with Pre-filled Editable Amounts
 * AC-7.8.2: Real-time Total Updates
 */
export interface ConfirmationModalState {
  /** Whether modal is open */
  isOpen: boolean;
  /** Recommendation being confirmed (null if closed) */
  recommendation: {
    id: string;
    totalInvestable: string;
    baseCurrency: string;
    items: Array<{
      assetId: string;
      symbol: string;
      recommendedAmount: string;
      isOverAllocated: boolean;
    }>;
  } | null;
  /** User-edited amounts (assetId -> amount string) */
  editedAmounts: Record<string, string>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Error message (null if no error) */
  error: string | null;
}

/**
 * Investment record for service layer
 *
 * Story 7.8: Confirm Recommendations
 * Represents a single investment to be recorded
 */
export interface InvestmentRecord {
  /** User ID */
  userId: string;
  /** Portfolio ID */
  portfolioId: string;
  /** Recommendation session ID (optional) */
  recommendationId?: string | undefined;
  /** Asset ticker symbol */
  symbol: string;
  /** Number of units purchased (decimal string) */
  quantity: string;
  /** Price per unit (decimal string) */
  pricePerUnit: string;
  /** Total amount invested (decimal string) */
  totalAmount: string;
  /** Currency code */
  currency: string;
  /** Recommended amount for comparison (decimal string, optional) */
  recommendedAmount?: string | undefined;
  /** Date/time of investment */
  investedAt: Date;
}

/**
 * API response for confirm endpoint
 *
 * Story 7.8: Confirm Recommendations
 * POST /api/investments/confirm
 */
export interface ConfirmInvestmentResponse {
  data: ConfirmInvestmentResult;
}
