/**
 * Base EmptyState Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.6: All empty states include relevant illustration
 * AC-9.6.7: Empty states provide context-appropriate next action
 *
 * Reusable base component for empty states throughout the app.
 * Follows existing patterns from PortfolioEmptyState and BalancedPortfolioState.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyStateCta {
  /** Button/link label */
  label: string;
  /** Click handler (for button behavior) */
  onClick?: () => void;
  /** Link destination (for navigation behavior) */
  href?: string;
}

export interface EmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Descriptive message */
  message: string;
  /** Primary call-to-action (optional) */
  primaryCta?: EmptyStateCta;
  /** Secondary call-to-action (optional) */
  secondaryCta?: EmptyStateCta;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyState Component
 *
 * Base component for displaying empty states with consistent styling.
 *
 * Features:
 * - Centered layout with icon, title, message
 * - Optional primary and secondary CTAs
 * - Supports both onClick handlers and href links
 * - Consistent with app design system
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={FolderPlus}
 *   title="Welcome to Investments Planner"
 *   message="Create your first portfolio to start tracking your investments."
 *   primaryCta={{ label: "Create Portfolio", onClick: handleCreate }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  primaryCta,
  secondaryCta,
  className,
  testId = "empty-state",
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-16 text-center", className)}
      data-testid={testId}
    >
      {/* Icon - AC-9.6.6: Relevant illustration */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6"
        aria-hidden="true"
      >
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold mb-2" data-testid={`${testId}-title`}>
        {title}
      </h2>

      {/* Message */}
      <p className="text-muted-foreground mb-6 max-w-md" data-testid={`${testId}-message`}>
        {message}
      </p>

      {/* CTAs - AC-9.6.7: Context-appropriate next action */}
      {(primaryCta || secondaryCta) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Primary CTA */}
          {primaryCta && (
            <CtaButton cta={primaryCta} variant="default" testId={`${testId}-primary-cta`} />
          )}

          {/* Secondary CTA */}
          {secondaryCta && (
            <CtaButton cta={secondaryCta} variant="outline" testId={`${testId}-secondary-cta`} />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CTA BUTTON HELPER
// =============================================================================

interface CtaButtonProps {
  cta: EmptyStateCta;
  variant: "default" | "outline";
  testId: string;
}

/**
 * Renders CTA as either a button (with onClick) or a link (with href)
 */
function CtaButton({ cta, variant, testId }: CtaButtonProps) {
  // If href is provided, render as Link
  if (cta.href) {
    return (
      <Button asChild variant={variant} data-testid={testId}>
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    );
  }

  // Otherwise render as button with onClick
  return (
    <Button variant={variant} onClick={cta.onClick} data-testid={testId}>
      {cta.label}
    </Button>
  );
}
