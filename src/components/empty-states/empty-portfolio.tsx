/**
 * EmptyPortfolio Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.1: Empty Portfolio State Shows "Create Your First Portfolio" CTA
 *
 * Displayed when user has no portfolios.
 * Uses base EmptyState component with portfolio-specific content.
 */

import { FolderPlus } from "lucide-react";
import { EmptyState } from "./empty-state";

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyPortfolioProps {
  /** Callback when "Create Portfolio" CTA is clicked */
  onCreatePortfolio: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyPortfolio Component
 *
 * Empty state for when user has no portfolios.
 *
 * AC-9.6.1 Requirements:
 * - Title: "Welcome to Investments Planner"
 * - Message: "Create your first portfolio to start tracking your investments."
 * - Primary CTA: "Create Portfolio"
 * - CTA triggers portfolio creation flow
 *
 * @example
 * ```tsx
 * <EmptyPortfolio onCreatePortfolio={() => setModalOpen(true)} />
 * ```
 */
export function EmptyPortfolio({ onCreatePortfolio, className }: EmptyPortfolioProps) {
  return (
    <EmptyState
      icon={FolderPlus}
      title="Welcome to Investments Planner"
      message="Create your first portfolio to start tracking your investments."
      primaryCta={{
        label: "Create Portfolio",
        onClick: onCreatePortfolio,
      }}
      testId="empty-portfolio"
      {...(className && { className })}
    />
  );
}
