"use client";

/**
 * Locale Context Provider
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.1: Locale Selection on Settings Page
 * AC-1.5.4: NumberFormatProvider Integration
 *
 * This component provides user-aware locale context to the NumberFormatProvider.
 * It reads the user's locale from UserContext and updates the NumberFormatProvider
 * with the correct locale for number formatting.
 */

import type { ReactNode } from "react";
import { NumberFormatProvider } from "@/lib/i18n";
import { useUserOptional } from "./user-context";
import { isValidLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

interface LocaleProviderProps {
  children: ReactNode;
}

/**
 * LocaleProvider wraps children with NumberFormatProvider using the user's locale.
 *
 * If the user is authenticated, their locale preference is used.
 * Otherwise, the DEFAULT_LOCALE is used.
 *
 * This should be placed inside UserProvider in the dashboard layout.
 */
export function LocaleProvider({ children }: LocaleProviderProps) {
  const userContext = useUserOptional();
  const userLocale = userContext?.user?.locale;

  // Validate and resolve locale
  const locale: Locale = userLocale && isValidLocale(userLocale) ? userLocale : DEFAULT_LOCALE;

  return <NumberFormatProvider locale={locale}>{children}</NumberFormatProvider>;
}
