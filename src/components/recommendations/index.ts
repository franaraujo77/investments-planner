/**
 * Recommendation Components
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 7.6: Zero Buy Signal for Over-Allocated
 * Story 7.7: View Recommendation Breakdown
 * Story 7.8: Confirm Recommendations
 *
 * Barrel export for all recommendation display components.
 */

// Components
export { AllocationGauge, getAllocationStatus } from "./allocation-gauge";
export type { AllocationGaugeProps, AllocationStatus } from "./allocation-gauge";

export { RecommendationCard } from "./recommendation-card";
export type { RecommendationCardProps } from "./recommendation-card";

export { FocusModeHeader } from "./focus-mode-header";
export type { FocusModeHeaderProps } from "./focus-mode-header";

export { RecommendationList } from "./recommendation-list";
export type { RecommendationListProps } from "./recommendation-list";

export { RecommendationSummary } from "./recommendation-summary";
export type { RecommendationSummaryProps } from "./recommendation-summary";

export { BalancedPortfolioState } from "./balanced-portfolio-state";
export type { BalancedPortfolioStateProps } from "./balanced-portfolio-state";

// Constants
export { TARGET_ALLOCATION_RANGE, calculateTargetRange } from "./constants";

// Story 7.6: Over-Allocated Explanation
export { OverAllocatedExplanation, generateGuidanceMessage } from "./over-allocated-explanation";
export type { OverAllocatedExplanationProps } from "./over-allocated-explanation";

// Story 7.7: Recommendation Breakdown
export { RecommendationBreakdownPanel } from "./recommendation-breakdown-panel";
export type { RecommendationBreakdownPanelProps } from "./recommendation-breakdown-panel";

export { CalculationSteps } from "./calculation-steps";
export type { CalculationStepsProps } from "./calculation-steps";

// Story 7.8: Confirm Recommendations
export { InvestmentAmountRow } from "./investment-amount-row";
export type { InvestmentAmountRowProps } from "./investment-amount-row";

export { ConfirmationModal } from "./confirmation-modal";
export type { ConfirmationModalProps } from "./confirmation-modal";

// Story 6.3: Recommendation Display - Pie Chart and Before/After Preview
export { RecommendationPieChart, transformToChartData } from "./recommendation-pie-chart";
export type { RecommendationPieChartProps } from "./recommendation-pie-chart";

export {
  BeforeAfterPreview,
  calculateExpectedAllocation,
  calculateAllocationChanges,
} from "./before-after-preview";
export type { BeforeAfterPreviewProps, AllocationChange } from "./before-after-preview";

// Story 6.4: Recommendation Details Panel
export { RecommendationDetailsPanel } from "./recommendation-details-panel";
export type { RecommendationDetailsPanelProps } from "./recommendation-details-panel";

// Story 7.10/6.6: Allocation Comparison
export {
  AllocationComparisonView,
  calculateAllocationDeltas,
  calculateTargetMovement,
  transformToPieChartData,
  parsePercentage,
  calculateDelta,
  isImproved,
  getDirection,
  getColorClasses,
} from "./allocation-comparison-view";
export type {
  AllocationComparisonViewProps,
  AllocationDelta,
  PortfolioSummaryData,
} from "./allocation-comparison-view";
