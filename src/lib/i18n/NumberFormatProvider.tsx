"use client";

/**
 * Number Format Provider
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.4: NumberFormatProvider Integration
 *
 * Provides locale context for number formatting throughout the application.
 * All number display should use the useNumberFormat hook to respect user locale.
 */

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./locales";

interface NumberFormatContextValue {
  locale: Locale;
}

const NumberFormatContext = createContext<NumberFormatContextValue | null>(null);

export interface NumberFormatProviderProps {
  children: ReactNode;
  locale?: Locale;
}

/**
 * Provider component that makes locale available to all child components
 *
 * @param children - Child components that need access to number formatting
 * @param locale - The locale to use for formatting (defaults to DEFAULT_LOCALE)
 */
export function NumberFormatProvider({
  children,
  locale = DEFAULT_LOCALE,
}: NumberFormatProviderProps) {
  return <NumberFormatContext.Provider value={{ locale }}>{children}</NumberFormatContext.Provider>;
}

/**
 * Hook to access the current locale from context
 *
 * @throws Error if used outside of NumberFormatProvider
 * @returns The current locale value
 */
export function useLocale(): Locale {
  const context = useContext(NumberFormatContext);
  if (!context) {
    throw new Error("useLocale must be used within a NumberFormatProvider");
  }
  return context.locale;
}

/**
 * Hook to optionally access the current locale (returns default if not in provider)
 *
 * @returns The current locale value or DEFAULT_LOCALE if outside provider
 */
export function useLocaleOptional(): Locale {
  const context = useContext(NumberFormatContext);
  return context?.locale ?? DEFAULT_LOCALE;
}
