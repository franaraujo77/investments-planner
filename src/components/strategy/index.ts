/**
 * Strategy Components Barrel Export
 *
 * Re-exports strategy-related components for cleaner imports.
 * Story 3.6: Strategy Allocation Overview Chart
 * Story 4.x: Asset Class & Subclass Management
 */

// Story 3.6: Strategy Allocation Overview Chart
export {
  StrategyAllocationChart,
  StrategyAllocationChartSkeleton,
  type StrategyAllocationChartProps,
} from "./strategy-allocation-chart";

export {
  AllocationComparisonLegend,
  type AllocationComparisonLegendProps,
} from "./allocation-comparison-legend";

export {
  StrategyAllocationSection,
  type StrategyAllocationSectionProps,
} from "./strategy-allocation-section";

// Strategy Page Components
export { StrategyHeader } from "./strategy-header";
export { AssetClassList } from "./asset-class-list";
export { AssetClassCard } from "./asset-class-card";
export { AssetClassForm } from "./asset-class-form";
export { SubclassList } from "./subclass-list";
export { SubclassCard } from "./subclass-card";
export { SubclassForm } from "./subclass-form";

// Allocation Components
export { AllocationRangeEditor } from "./allocation-range-editor";
export { AllocationWarningBanner } from "./allocation-warning-banner";
export { SubclassAllocationWarningBanner } from "./subclass-allocation-warning";

// Badge Components
export { AssetCountBadge } from "./asset-count-badge";
export { MinAllocationBadge } from "./min-allocation-badge";

// Input Components
export { AssetCountInput } from "./asset-count-input";
export { MinAllocationInput } from "./min-allocation-input";

// Story 3.7: Strategy Allocation Balance Indicator
export {
  StrategyAllocationBalanceIndicator,
  type StrategyAllocationBalanceIndicatorProps,
} from "./strategy-allocation-balance-indicator";
