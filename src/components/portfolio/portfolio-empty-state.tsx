"use client";

/**
 * Portfolio Empty State Component
 *
 * Story 3.1: Create Portfolio
 * Story 9.6: Empty States & Helpful Messaging
 *
 * AC-3.1.1: Empty state with "Create your first portfolio" message and button
 * AC-9.6.1: Empty Portfolio State Shows "Create Your First Portfolio" CTA
 *
 * Displayed when user has no portfolios.
 * Updated in Story 9.6 to use consistent messaging per AC-9.6.1.
 */

import { FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioEmptyStateProps {
  onCreateClick: () => void;
  canCreate?: boolean;
}

export function PortfolioEmptyState({ onCreateClick, canCreate = true }: PortfolioEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-portfolio"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <FolderPlus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* AC-9.6.1: Title and message per tech spec */}
      <h2 className="text-xl font-semibold mb-2" data-testid="empty-portfolio-title">
        Welcome to Investments Planner
      </h2>

      <p className="text-muted-foreground mb-6 max-w-md" data-testid="empty-portfolio-message">
        Create your first portfolio to start tracking your investments.
      </p>

      <Button
        onClick={onCreateClick}
        disabled={!canCreate}
        data-testid="empty-portfolio-primary-cta"
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Create Portfolio
      </Button>
    </div>
  );
}
