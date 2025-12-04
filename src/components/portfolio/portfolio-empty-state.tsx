"use client";

/**
 * Portfolio Empty State Component
 *
 * Story 3.1: Create Portfolio
 * AC-3.1.1: Empty state with "Create your first portfolio" message and button
 *
 * Displayed when user has no portfolios.
 */

import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioEmptyStateProps {
  onCreateClick: () => void;
  canCreate?: boolean;
}

export function PortfolioEmptyState({ onCreateClick, canCreate = true }: PortfolioEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <Briefcase className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-semibold mb-2">No portfolios yet</h2>

      <p className="text-muted-foreground mb-6 max-w-md">
        Create your first portfolio to start tracking your investments and get personalized
        recommendations.
      </p>

      <Button onClick={onCreateClick} disabled={!canCreate}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Create Portfolio
      </Button>
    </div>
  );
}
