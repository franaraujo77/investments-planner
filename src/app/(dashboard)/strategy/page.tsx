import { Metadata } from "next";
import { AssetClassList } from "@/components/strategy/asset-class-list";
import { StrategyHeader } from "@/components/strategy/strategy-header";

export const metadata: Metadata = {
  title: "Strategy",
  description: "Define your investment strategy with asset classes and allocations.",
};

/**
 * Strategy Page
 *
 * Story 4.1: Define Asset Classes
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * Server component that renders the strategy management interface.
 * AC-4.1.1: View list of asset classes
 * AC-4.3.1: View and set allocation ranges
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * This page allows users to:
 * - View all their asset classes
 * - Create new asset classes
 * - Edit existing asset classes
 * - Delete asset classes
 * - Configure allocation ranges with min/max targets
 * - See warnings when allocation configuration is invalid
 */
export default function StrategyPage() {
  return (
    <div className="space-y-6">
      {/* Header with allocation warning banner - Story 4.3 */}
      <StrategyHeader />

      {/* Story 4.1: Asset Classes Management */}
      <AssetClassList />
    </div>
  );
}
