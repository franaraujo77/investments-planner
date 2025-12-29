"use client";

/**
 * Empty Holdings State Component
 *
 * Story 2.2: View Portfolio and Holdings
 *
 * AC-2.2.3: Empty state with "Add your first asset" CTA
 *
 * Task 4.1: Create empty holdings state component
 * Task 4.2: Add friendly illustration or icon
 * Task 4.3: Add CTA button linking to add asset flow
 * Task 4.4: Style consistently with other empty states
 */

import { PackageOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddAssetModal } from "./add-asset-modal";

interface EmptyHoldingsStateProps {
  portfolioId: string;
}

export function EmptyHoldingsState({ portfolioId }: EmptyHoldingsStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-holdings-state"
    >
      {/* Task 4.2: Friendly illustration/icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <PackageOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Title and description */}
      <h2 className="text-xl font-semibold mb-2" data-testid="empty-holdings-title">
        No Holdings Yet
      </h2>

      <p className="text-muted-foreground mb-6 max-w-md" data-testid="empty-holdings-message">
        Start building your portfolio by adding your first asset. Track stocks, ETFs, crypto, and
        more.
      </p>

      {/* Task 4.3: CTA button - AC-2.2.3 */}
      <AddAssetModal
        portfolioId={portfolioId}
        trigger={
          <Button data-testid="add-first-asset-cta">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add your first asset
          </Button>
        }
      />
    </div>
  );
}
