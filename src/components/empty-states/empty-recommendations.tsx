/**
 * EmptyRecommendations Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.3: Empty Recommendations State Shows Encouraging Message
 *
 * Displayed when portfolio is balanced and no recommendations are needed.
 * Uses base EmptyState component with recommendation-specific content.
 */

import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "./empty-state";

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyRecommendationsProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyRecommendations Component
 *
 * Empty state for when portfolio is balanced (no recommendations needed).
 *
 * AC-9.6.3 Requirements:
 * - Title: "You're all set!"
 * - Message: "Your portfolio is balanced. Check back next month for new recommendations."
 * - Secondary CTA: "View Portfolio" (linking to /portfolio)
 * - Message is encouraging, not confusing
 *
 * @example
 * ```tsx
 * <EmptyRecommendations />
 * ```
 */
export function EmptyRecommendations({ className }: EmptyRecommendationsProps) {
  return (
    <EmptyState
      icon={CheckCircle2}
      title="You're all set!"
      message="Your portfolio is balanced. Check back next month for new recommendations."
      secondaryCta={{
        label: "View Portfolio",
        href: "/portfolio",
      }}
      testId="empty-recommendations"
      {...(className && { className })}
    />
  );
}
