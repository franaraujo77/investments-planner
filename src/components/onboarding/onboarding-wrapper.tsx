"use client";

/**
 * OnboardingWrapper Component
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Contextual Onboarding Tips Display
 * AC-3.5.5: Allocation Editing Screen Tips
 *
 * A simple wrapper that displays an onboarding tip around its children
 * if the tip hasn't been dismissed.
 *
 * Uses the OnboardingContext to check dismissal state.
 */

import * as React from "react";
import { OnboardingTip } from "./onboarding-tip";
import { useOnboardingContextOptional } from "@/contexts/onboarding-context";
import { getTipById } from "@/lib/constants/onboarding-tips";

export interface OnboardingWrapperProps {
  /** The tip ID to display (must match a tip defined in onboarding-tips.ts) */
  tipId: string;
  /** Children to wrap */
  children: React.ReactNode;
  /** Which side to position the tip */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment along the side */
  align?: "start" | "center" | "end";
  /** Optional step indicator (e.g., "1/3") */
  stepIndicator?: string;
  /** Additional CSS classes for the tip */
  className?: string;
}

/**
 * OnboardingWrapper
 *
 * Wraps children with an onboarding tip if it hasn't been dismissed.
 * Falls back to just rendering children if:
 * - No OnboardingProvider is present (graceful degradation)
 * - Tip is not found
 * - Tip has been dismissed
 *
 * @example
 * ```tsx
 * <OnboardingWrapper tipId="pie-chart-interaction" side="right">
 *   <AllocationPieChart data={holdings} />
 * </OnboardingWrapper>
 * ```
 */
export function OnboardingWrapper({
  tipId,
  children,
  side = "right",
  align = "center",
  stepIndicator,
  className,
}: OnboardingWrapperProps) {
  const context = useOnboardingContextOptional();

  // Graceful degradation: no context means no tips
  if (!context) {
    return <>{children}</>;
  }

  const { shouldShowTip, dismissTip, isLoading } = context;

  // Get tip definition
  const tip = getTipById(tipId);

  // No tip definition found
  if (!tip) {
    return <>{children}</>;
  }

  // Don't show while loading (prevents flash)
  if (isLoading) {
    return <>{children}</>;
  }

  // Check if tip should be shown
  const showTip = shouldShowTip(tipId);

  // Build props conditionally to satisfy exactOptionalPropertyTypes
  const tipProps: React.ComponentProps<typeof OnboardingTip> = {
    tip,
    show: showTip,
    onDismiss: dismissTip,
    side,
    align,
    children,
  };

  if (stepIndicator !== undefined) {
    tipProps.stepIndicator = stepIndicator;
  }

  if (className !== undefined) {
    tipProps.className = className;
  }

  return <OnboardingTip {...tipProps} />;
}
