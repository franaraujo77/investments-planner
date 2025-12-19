/**
 * EmptyHistory Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.5: Empty History State Shows Helpful Onboarding Message
 *
 * Displayed when user has no investment history.
 * Uses base EmptyState component with history-specific content.
 */

import { History } from "lucide-react";
import { EmptyState } from "./empty-state";

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyHistoryProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyHistory Component
 *
 * Empty state for when user has no investment history.
 *
 * AC-9.6.5 Requirements:
 * - Title: "No investment history yet"
 * - Message: "Your investment history will appear here after you confirm your first recommendations."
 * - Secondary CTA: "View Dashboard" (linking to /)
 * - Message guides user to next logical step
 *
 * @example
 * ```tsx
 * <EmptyHistory />
 * ```
 */
export function EmptyHistory({ className }: EmptyHistoryProps) {
  return (
    <EmptyState
      icon={History}
      title="No investment history yet"
      message="Your investment history will appear here after you confirm your first recommendations."
      secondaryCta={{
        label: "View Dashboard",
        href: "/",
      }}
      testId="empty-history"
      {...(className && { className })}
    />
  );
}
