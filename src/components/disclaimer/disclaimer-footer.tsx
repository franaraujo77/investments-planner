// @file: src/components/disclaimer/disclaimer-footer.tsx
/**
 * DisclaimerFooter Component
 *
 * Story 7.4: Financial Disclaimers
 * AC-7.4.4: Subtle Reminder Footer on Calculation/Recommendation Sections
 *
 * A subtle footer component that reminds users this is a calculation tool,
 * not financial advice. Designed to be non-intrusive but visible.
 *
 * Features:
 * - Two variants: "default" (with icon) and "compact" (minimal)
 * - Uses muted styling to avoid visual disruption
 * - Accessible with appropriate ARIA attributes
 * - Follows existing component patterns from disclaimer/ directory
 */

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface DisclaimerFooterProps {
  /**
   * Visual variant of the footer
   * - "default": Full text with optional icon
   * - "compact": Shortened text, no icon, minimal height
   */
  variant?: "default" | "compact";
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// CONSTANTS (exported for testing)
// =============================================================================

/**
 * Footer text content for each variant
 * Exported for unit testing to ensure tests use actual component values
 */
export const FOOTER_TEXT = {
  default: "Calculation tool only - not financial advice",
  compact: "Not financial advice",
} as const;

/**
 * Get footer text for a given variant
 */
export function getFooterText(variant: "default" | "compact" = "default"): string {
  return FOOTER_TEXT[variant];
}

/**
 * Determine if icon should be shown based on variant
 */
export function shouldShowIcon(variant: "default" | "compact" = "default"): boolean {
  return variant !== "compact";
}

/**
 * Get padding class based on variant
 */
export function getPaddingClass(variant: "default" | "compact" = "default"): string {
  return variant === "compact" ? "py-1" : "py-2";
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * DisclaimerFooter Component
 *
 * Renders a subtle disclaimer reminder at the bottom of calculation
 * and recommendation sections.
 *
 * @example
 * ```tsx
 * // Default variant with icon
 * <DisclaimerFooter />
 *
 * // Compact variant without icon
 * <DisclaimerFooter variant="compact" />
 *
 * // With custom styling
 * <DisclaimerFooter className="mt-4" />
 * ```
 */
export function DisclaimerFooter({ variant = "default", className }: DisclaimerFooterProps) {
  const showIcon = shouldShowIcon(variant);
  const text = getFooterText(variant);
  const paddingClass = getPaddingClass(variant);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5",
        "text-xs text-muted-foreground",
        paddingClass,
        className
      )}
      role="note"
      aria-label="Financial disclaimer reminder"
      data-testid="disclaimer-footer"
      data-variant={variant}
    >
      {showIcon && <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
      <span>{text}</span>
    </div>
  );
}
