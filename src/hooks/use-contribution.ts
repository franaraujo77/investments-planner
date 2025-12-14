"use client";

/**
 * useContribution Hook
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.1: Enter contribution amount on dashboard
 * AC-7.1.3: Pre-fill default contribution
 * AC-7.1.4: Save default contribution preference
 * AC-7.1.6: Real-time total update
 *
 * Story 7.2: Enter Dividends Received
 * AC-7.2.2: Default dividends to zero
 * AC-7.2.4: Dividends validation
 * AC-7.2.5: Real-time total update
 *
 * Features:
 * - Manages contribution state
 * - Manages dividends state with validation
 * - Loads default contribution on mount
 * - Provides setContribution function
 * - Provides saveAsDefault function
 * - Handles loading and error states for both fields
 * - Calculates total investable (contribution + dividends)
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { parseDecimal, add } from "@/lib/calculations/decimal-utils";
import { Decimal } from "@/lib/calculations/decimal-config";
import { validateContribution, validateDividends } from "@/lib/validations/recommendation-schemas";
import type { UserSettings } from "@/lib/services/user-service";

// =============================================================================
// TYPES
// =============================================================================

interface SettingsResponse {
  data: {
    settings: UserSettings;
  };
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface UseContributionOptions {
  /** Initial contribution value (overrides default from settings) */
  initialValue?: string;
  /** Dividends amount for total calculation */
  dividends?: string;
  /** Callback when contribution changes */
  onChange?: (value: string) => void;
}

interface UseContributionReturn {
  /** Current contribution value as decimal string */
  contribution: string;
  /** Set the contribution value */
  setContribution: (value: string) => void;
  /** Contribution validation error message (if any) */
  error: string | undefined;
  /** Validate current contribution value and set error if invalid */
  validate: () => boolean;
  /** Clear contribution validation error */
  clearError: () => void;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Save current contribution as default */
  saveAsDefault: () => Promise<boolean>;
  /** User's base currency */
  baseCurrency: string;
  /** Dividends amount (defaults to "0.00") */
  dividends: string;
  /** Set dividends amount */
  setDividends: (value: string) => void;
  /** Dividends validation error message (if any) - AC-7.2.4 */
  dividendsError: string | undefined;
  /** Validate current dividends value and set error if invalid - AC-7.2.4 */
  validateDividendsValue: () => boolean;
  /** Clear dividends validation error */
  clearDividendsError: () => void;
  /** Total investable (contribution + dividends) */
  totalInvestable: string;
  /** Refresh settings from server */
  refresh: () => Promise<void>;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchUserSettings(): Promise<UserSettings> {
  const response = await fetch("/api/user/settings", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.error || "Failed to fetch settings");
  }

  const data: SettingsResponse = await response.json();
  return data.data.settings;
}

async function saveDefaultContribution(value: string | null): Promise<UserSettings> {
  const response = await fetch("/api/user/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      defaultContribution: value,
    }),
  });

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.error || "Failed to save settings");
  }

  const data: SettingsResponse = await response.json();
  return data.data.settings;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing contribution input state
 *
 * @param options - Configuration options
 * @returns Contribution state and functions
 *
 * @example
 * ```tsx
 * function ContributionSection() {
 *   const {
 *     contribution,
 *     setContribution,
 *     error,
 *     validate,
 *     saveAsDefault,
 *     baseCurrency,
 *     totalInvestable,
 *   } = useContribution({ dividends: "100.00" });
 *
 *   return (
 *     <ContributionInput
 *       value={contribution}
 *       onChange={setContribution}
 *       currency={baseCurrency}
 *       error={error}
 *       onBlur={validate}
 *     />
 *   );
 * }
 * ```
 */
export function useContribution(options: UseContributionOptions = {}): UseContributionReturn {
  const { initialValue, dividends: initialDividends = "0.00", onChange } = options;

  // State
  const [contribution, setContributionState] = useState<string>(initialValue || "");
  const [dividends, setDividendsState] = useState<string>(initialDividends);
  const [error, setError] = useState<string | undefined>(undefined);
  const [dividendsError, setDividendsError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");

  // Load settings on mount
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        setIsLoading(true);
        const settings = await fetchUserSettings();

        if (mounted) {
          setBaseCurrency(settings.baseCurrency);

          // Only set contribution from default if no initial value was provided
          if (!initialValue && settings.defaultContribution) {
            setContributionState(settings.defaultContribution);
          }
        }
      } catch {
        // Silently fail - user may not be authenticated yet
        // or settings may not exist
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [initialValue]);

  // Set contribution with optional callback
  const setContribution = useCallback(
    (value: string) => {
      setContributionState(value);
      // Clear error when value changes
      if (error) {
        setError(undefined);
      }
      onChange?.(value);
    },
    [error, onChange]
  );

  // Set dividends - AC-7.2.5: Clear error when value changes
  const setDividends = useCallback(
    (value: string) => {
      setDividendsState(value);
      // Clear error when value changes
      if (dividendsError) {
        setDividendsError(undefined);
      }
    },
    [dividendsError]
  );

  // Validate contribution
  const validate = useCallback((): boolean => {
    const validationError = validateContribution(contribution);
    setError(validationError);
    return validationError === undefined;
  }, [contribution]);

  // Clear error
  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  // Validate dividends - AC-7.2.4
  const validateDividendsValue = useCallback((): boolean => {
    const validationError = validateDividends(dividends);
    setDividendsError(validationError);
    return validationError === undefined;
  }, [dividends]);

  // Clear dividends error
  const clearDividendsError = useCallback(() => {
    setDividendsError(undefined);
  }, []);

  // Save as default
  const saveAsDefault = useCallback(async (): Promise<boolean> => {
    // Validate first
    const validationError = validateContribution(contribution);
    if (validationError) {
      setError(validationError);
      return false;
    }

    try {
      setIsSaving(true);
      await saveDefaultContribution(contribution);
      toast.success("Default contribution saved");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save default";
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [contribution]);

  // Refresh settings
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const settings = await fetchUserSettings();
      setBaseCurrency(settings.baseCurrency);
      if (settings.defaultContribution) {
        setContributionState(settings.defaultContribution);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate total investable (contribution + dividends)
  // AC-7.1.6: Real-time update
  const totalInvestable = useMemo((): string => {
    try {
      const contribDecimal = contribution ? parseDecimal(contribution) : new Decimal(0);
      const dividendsDecimal = dividends ? parseDecimal(dividends) : new Decimal(0);

      // Only calculate if contribution is valid
      if (contribDecimal.isNaN() || contribDecimal.isNegative()) {
        return dividendsDecimal.toString();
      }
      if (dividendsDecimal.isNaN() || dividendsDecimal.isNegative()) {
        return contribDecimal.toString();
      }

      return add(contribDecimal, dividendsDecimal).toString();
    } catch {
      return "0.00";
    }
  }, [contribution, dividends]);

  return {
    contribution,
    setContribution,
    error,
    validate,
    clearError,
    isLoading,
    isSaving,
    saveAsDefault,
    baseCurrency,
    dividends,
    setDividends,
    dividendsError,
    validateDividendsValue,
    clearDividendsError,
    totalInvestable,
    refresh,
  };
}

/**
 * Simplified hook for just reading default contribution
 * Useful when you only need to display the value
 */
export function useDefaultContribution(): {
  defaultContribution: string | null;
  isLoading: boolean;
  baseCurrency: string;
} {
  const [defaultContribution, setDefaultContribution] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const settings = await fetchUserSettings();
        if (mounted) {
          setDefaultContribution(settings.defaultContribution);
          setBaseCurrency(settings.baseCurrency);
        }
      } catch {
        // Silently fail
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    defaultContribution,
    isLoading,
    baseCurrency,
  };
}
