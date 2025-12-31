"use client";

/**
 * Onboarding Context Provider
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Contextual Onboarding Tips Display
 * AC-3.5.3: Tip Dismissal Persistence
 *
 * Provides onboarding state to the entire dashboard application.
 * Uses the useOnboarding hook internally but exposes context for
 * components that don't need to specify a page filter.
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import type { OnboardingTip } from "@/lib/constants/onboarding-tips";
import { useOnboarding } from "@/hooks/useOnboarding";

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingContextValue {
  /** All tips regardless of page */
  allTips: OnboardingTip[];
  /** Tips for the current page */
  tips: OnboardingTip[];
  /** Set of dismissed tip IDs */
  dismissedTips: Set<string>;
  /** Dismiss a tip by ID */
  dismissTip: (tipId: string) => Promise<void>;
  /** Check if a specific tip should be shown */
  shouldShowTip: (tipId: string) => boolean;
  /** Reset all tips (show them again) */
  resetAllTips: () => Promise<void>;
  /** Current page path */
  currentPage: string;
  /** Whether onboarding data is loading */
  isLoading: boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface OnboardingProviderProps {
  children: React.ReactNode;
}

/**
 * OnboardingProvider
 *
 * Wraps the dashboard layout to provide onboarding context to all children.
 * Automatically tracks the current page for tip filtering.
 *
 * @example
 * ```tsx
 * // In dashboard layout.tsx
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <OnboardingProvider>
 *       <AuthProvider>
 *         {children}
 *       </AuthProvider>
 *     </OnboardingProvider>
 *   );
 * }
 * ```
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const pathname = usePathname();

  // Use the onboarding hook with current page
  const { allTips, tips, dismissedTips, dismissTip, shouldShowTip, resetAllTips, isLoading } =
    useOnboarding(pathname);

  // Convert to Set for efficient lookups
  const dismissedTipsSet = React.useMemo(() => new Set(dismissedTips), [dismissedTips]);

  // Memoize context value
  const contextValue = React.useMemo(
    (): OnboardingContextValue => ({
      allTips,
      tips,
      dismissedTips: dismissedTipsSet,
      dismissTip,
      shouldShowTip,
      resetAllTips,
      currentPage: pathname,
      isLoading,
    }),
    [allTips, tips, dismissedTipsSet, dismissTip, shouldShowTip, resetAllTips, pathname, isLoading]
  );

  return <OnboardingContext.Provider value={contextValue}>{children}</OnboardingContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useOnboardingContext
 *
 * Hook to access the onboarding context.
 * Must be used within an OnboardingProvider.
 *
 * @returns Onboarding context value
 * @throws Error if used outside of OnboardingProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { shouldShowTip, dismissTip } = useOnboardingContext();
 *
 *   if (shouldShowTip("my-tip")) {
 *     return <OnboardingTip tip={...} onDismiss={() => dismissTip("my-tip")} />;
 *   }
 * }
 * ```
 */
export function useOnboardingContext(): OnboardingContextValue {
  const context = React.useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboardingContext must be used within an OnboardingProvider");
  }

  return context;
}

/**
 * useOnboardingContextOptional
 *
 * Optional version of useOnboardingContext that doesn't throw
 * when used outside of a provider. Returns null if no provider.
 *
 * @returns Onboarding context value or null
 */
export function useOnboardingContextOptional(): OnboardingContextValue | null {
  return React.useContext(OnboardingContext);
}
