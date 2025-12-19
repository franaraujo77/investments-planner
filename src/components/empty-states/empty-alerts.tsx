/**
 * EmptyAlerts Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.4: Empty Alerts State Shows "All Clear" Message
 *
 * Displayed when user has no alerts.
 * Uses base EmptyState component with alert-specific content.
 */

import { Bell } from "lucide-react";
import { EmptyState } from "./empty-state";

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyAlertsProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyAlerts Component
 *
 * Empty state for when user has no alerts.
 *
 * AC-9.6.4 Requirements:
 * - Title: "All clear!"
 * - Message: "No alerts right now. We'll notify you if anything needs your attention."
 * - No CTA needed (informational only)
 * - Message reassures user that system is working
 *
 * @example
 * ```tsx
 * <EmptyAlerts />
 * ```
 */
export function EmptyAlerts({ className }: EmptyAlertsProps) {
  return (
    <EmptyState
      icon={Bell}
      title="All clear!"
      message="No alerts right now. We'll notify you if anything needs your attention."
      testId="empty-alerts"
      {...(className && { className })}
    />
  );
}
