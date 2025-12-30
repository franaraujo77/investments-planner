"use client";

/**
 * OnboardingTip Component
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.2: Tip Content Structure (title, brief explanation, "Got it" button)
 * AC-3.5.3: Tip Dismissal Persistence
 *
 * A wrapper component that displays contextual onboarding tips around its children.
 * Uses Radix UI Popover for positioning and accessibility.
 *
 * Features:
 * - Builds on existing Radix tooltip primitives
 * - Accessible: role="tooltip", aria-describedby, keyboard dismissal
 * - Smooth entrance animation (fade-in, slide-in)
 * - Step indicator for multi-tip flows
 * - Respects prefers-reduced-motion
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingTip as OnboardingTipType } from "@/lib/constants/onboarding-tips";

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingTipProps {
  /** The tip content to display */
  tip: OnboardingTipType;
  /** Callback when the tip is dismissed */
  onDismiss: (tipId: string) => void;
  /** Whether to show this tip (controlled externally via shouldShowTip) */
  show?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Which side to position the tip */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment along the side */
  align?: "start" | "center" | "end";
  /** Offset from the trigger element */
  sideOffset?: number;
  /** Optional step indicator (e.g., "1/3") */
  stepIndicator?: string;
  /** Children to wrap (the target element for the tip) */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * OnboardingTip Component
 *
 * Wraps a target element and displays an onboarding tip popover.
 *
 * @example
 * ```tsx
 * <OnboardingTip
 *   tip={tips.find(t => t.id === "pie-chart-interaction")!}
 *   show={shouldShowTip("pie-chart-interaction")}
 *   onDismiss={dismissTip}
 *   side="right"
 * >
 *   <AllocationPieChart data={holdings} />
 * </OnboardingTip>
 * ```
 */
export const OnboardingTip = React.memo(function OnboardingTip({
  tip,
  onDismiss,
  show = true,
  className,
  side = "right",
  align = "center",
  sideOffset = 8,
  stepIndicator,
  children,
}: OnboardingTipProps) {
  const [isOpen, setIsOpen] = React.useState(show);
  const descriptionId = React.useId();

  // Sync internal state with show prop
  React.useEffect(() => {
    setIsOpen(show);
  }, [show]);

  // Handle dismiss
  const handleDismiss = React.useCallback(() => {
    setIsOpen(false);
    onDismiss(tip.id);
  }, [onDismiss, tip.id]);

  // Handle keyboard dismiss (Escape)
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDismiss();
      }
    },
    [handleDismiss]
  );

  // Don't render popover if not showing
  if (!show) {
    return <>{children}</>;
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          role="tooltip"
          aria-describedby={descriptionId}
          side={side}
          align={align}
          sideOffset={sideOffset}
          onKeyDown={handleKeyDown}
          className={cn(
            // Base styles per Dev Notes
            "z-50 max-w-xs rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-lg",
            // Text styles
            "text-slate-50",
            // Animation (respects prefers-reduced-motion)
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=top]:slide-in-from-bottom-2",
            // Reduced motion preference
            "motion-reduce:animate-none",
            className
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Title */}
          <h4 className="pr-6 text-sm font-semibold text-slate-50">{tip.title}</h4>

          {/* Description */}
          <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-slate-300">
            {tip.description}
          </p>

          {/* Footer with step indicator and Got it button */}
          <div className="mt-3 flex items-center justify-between">
            {/* Step indicator */}
            {stepIndicator && <span className="text-xs text-slate-500">{stepIndicator}</span>}

            {/* Got it button */}
            <button
              type="button"
              onClick={handleDismiss}
              className={cn(
                "rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors",
                "hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
                !stepIndicator && "ml-auto"
              )}
            >
              Got it
            </button>
          </div>

          {/* Arrow */}
          <PopoverPrimitive.Arrow className="fill-slate-900" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
