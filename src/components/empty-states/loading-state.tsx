/**
 * LoadingState Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * PR Review Enhancement: Loading skeleton states for async data fetching
 *
 * Provides skeleton loading states that match the EmptyState layout.
 * Use before data loads to prevent layout shift and provide visual feedback.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface LoadingStateProps {
  /** Whether to show CTA skeleton buttons */
  showCta?: boolean;
  /** Number of CTA buttons to show (1 or 2) */
  ctaCount?: 1 | 2;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * LoadingState Component
 *
 * Skeleton loading state that matches EmptyState layout.
 * Use for async data fetching scenarios to show loading feedback.
 *
 * @example
 * ```tsx
 * // Simple loading state
 * <LoadingState />
 *
 * // With CTA skeleton
 * <LoadingState showCta ctaCount={1} />
 *
 * // In a conditional render
 * {isLoading ? <LoadingState showCta /> : <EmptyPortfolio onCreatePortfolio={...} />}
 * ```
 */
export function LoadingState({
  showCta = false,
  ctaCount = 1,
  className,
  testId = "loading-state",
}: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-16", className)}
      data-testid={testId}
      role="status"
      aria-label="Loading content"
    >
      {/* Icon skeleton - circular */}
      <Skeleton className="h-16 w-16 rounded-full mb-6" data-testid={`${testId}-icon`} />

      {/* Title skeleton */}
      <Skeleton className="h-7 w-64 mb-2" data-testid={`${testId}-title`} />

      {/* Message skeleton - two lines */}
      <div className="flex flex-col items-center gap-1.5 mb-6">
        <Skeleton className="h-5 w-80" data-testid={`${testId}-message-1`} />
        <Skeleton className="h-5 w-56" data-testid={`${testId}-message-2`} />
      </div>

      {/* CTA button skeletons */}
      {showCta && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 w-32" data-testid={`${testId}-cta-1`} />
          {ctaCount === 2 && <Skeleton className="h-10 w-32" data-testid={`${testId}-cta-2`} />}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SPECIALIZED LOADING STATES
// =============================================================================

/**
 * Loading state for portfolio list
 */
export function LoadingPortfolio({ className }: { className?: string }) {
  return (
    <LoadingState
      showCta
      ctaCount={1}
      testId="loading-portfolio"
      {...(className && { className })}
    />
  );
}

/**
 * Loading state for assets list
 */
export function LoadingAssets({ className }: { className?: string }) {
  return (
    <LoadingState showCta ctaCount={1} testId="loading-assets" {...(className && { className })} />
  );
}

/**
 * Loading state for recommendations
 */
export function LoadingRecommendations({ className }: { className?: string }) {
  return (
    <LoadingState
      showCta
      ctaCount={1}
      testId="loading-recommendations"
      {...(className && { className })}
    />
  );
}

/**
 * Loading state for alerts
 */
export function LoadingAlerts({ className }: { className?: string }) {
  return <LoadingState showCta={false} testId="loading-alerts" {...(className && { className })} />;
}

/**
 * Loading state for history
 */
export function LoadingHistory({ className }: { className?: string }) {
  return (
    <LoadingState showCta ctaCount={1} testId="loading-history" {...(className && { className })} />
  );
}
