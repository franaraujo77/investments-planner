"use client";

/**
 * useNumberFormat Hook
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.2: Number Formatting for pt-BR Locale
 * AC-1.5.3: Number Formatting for en-US Locale
 * AC-1.5.4: NumberFormatProvider Integration
 *
 * Provides locale-aware number formatting functions.
 * Uses the native Intl.NumberFormat for consistent, standards-compliant formatting.
 */

import { useMemo } from "react";
import { useLocaleOptional } from "./NumberFormatProvider";
import { type Locale, DEFAULT_LOCALE } from "./locales";

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface DateFormatOptions {
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
}

export interface UseNumberFormatResult {
  /**
   * Format a number according to the current locale
   *
   * @example
   * // With en-US locale
   * formatNumber(1234.56) // "1,234.56"
   *
   * // With pt-BR locale
   * formatNumber(1234.56) // "1.234,56"
   */
  formatNumber: (value: number, options?: NumberFormatOptions) => string;

  /**
   * Format a currency value according to the current locale
   *
   * @example
   * // With en-US locale and USD
   * formatCurrency(1234.56) // "$1,234.56"
   *
   * // With pt-BR locale and BRL
   * formatCurrency(1234.56, "BRL") // "R$ 1.234,56"
   */
  formatCurrency: (value: number, currency?: string) => string;

  /**
   * Format a percentage value according to the current locale
   *
   * @example
   * // With en-US locale
   * formatPercent(0.1234) // "12.34%"
   *
   * // With pt-BR locale
   * formatPercent(0.1234) // "12,34%"
   */
  formatPercent: (value: number, options?: NumberFormatOptions) => string;

  /**
   * Format a date according to the current locale
   *
   * @example
   * // With en-US locale
   * formatDate(new Date("2024-06-15")) // "Jun 15, 2024"
   *
   * // With pt-BR locale
   * formatDate(new Date("2024-06-15")) // "15 de jun. de 2024"
   */
  formatDate: (date: Date, options?: DateFormatOptions) => string;

  /**
   * Format a date with time according to the current locale
   *
   * @example
   * // With en-US locale
   * formatDateTime(new Date()) // "Jun 15, 2024, 2:30 PM"
   *
   * // With pt-BR locale
   * formatDateTime(new Date()) // "15 de jun. de 2024, 14:30"
   */
  formatDateTime: (date: Date, options?: DateFormatOptions) => string;

  /**
   * The current locale being used for formatting
   */
  locale: Locale;
}

/**
 * Map of locale to default currency
 * Used when no currency is specified in formatCurrency
 */
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  "en-US": "USD",
  "pt-BR": "BRL",
  "de-DE": "EUR",
  "fr-FR": "EUR",
  "es-ES": "EUR",
};

/**
 * Hook that provides locale-aware number formatting functions
 *
 * @param localeOverride - Optional locale to use instead of the context locale
 * @returns Object with formatting functions and current locale
 *
 * @example
 * const { formatNumber, formatCurrency, formatPercent } = useNumberFormat();
 *
 * return (
 *   <div>
 *     <span>{formatNumber(1234.56)}</span>
 *     <span>{formatCurrency(100, "USD")}</span>
 *     <span>{formatPercent(0.15)}</span>
 *   </div>
 * );
 */
export function useNumberFormat(localeOverride?: Locale): UseNumberFormatResult {
  const contextLocale = useLocaleOptional();
  const locale = localeOverride ?? contextLocale;

  const formatNumber = useMemo(() => {
    return (value: number, options?: NumberFormatOptions): string => {
      if (!Number.isFinite(value)) {
        return "-";
      }

      const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: options?.minimumFractionDigits ?? 2,
        maximumFractionDigits: options?.maximumFractionDigits ?? 2,
      });

      return formatter.format(value);
    };
  }, [locale]);

  const formatCurrency = useMemo(() => {
    return (value: number, currency?: string): string => {
      if (!Number.isFinite(value)) {
        return "-";
      }

      const currencyCode = currency ?? LOCALE_CURRENCY_MAP[locale] ?? "USD";

      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return formatter.format(value);
    };
  }, [locale]);

  const formatPercent = useMemo(() => {
    return (value: number, options?: NumberFormatOptions): string => {
      if (!Number.isFinite(value)) {
        return "-";
      }

      const formatter = new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: options?.minimumFractionDigits ?? 2,
        maximumFractionDigits: options?.maximumFractionDigits ?? 2,
      });

      return formatter.format(value);
    };
  }, [locale]);

  const formatDate = useMemo(() => {
    return (date: Date, options?: DateFormatOptions): string => {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "-";
      }

      const formatter = new Intl.DateTimeFormat(locale, {
        dateStyle: options?.dateStyle ?? "medium",
      });

      return formatter.format(date);
    };
  }, [locale]);

  const formatDateTime = useMemo(() => {
    return (date: Date, options?: DateFormatOptions): string => {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "-";
      }

      const formatter = new Intl.DateTimeFormat(locale, {
        dateStyle: options?.dateStyle ?? "medium",
        timeStyle: options?.timeStyle ?? "short",
      });

      return formatter.format(date);
    };
  }, [locale]);

  return {
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDate,
    formatDateTime,
    locale,
  };
}

/**
 * Non-hook version for use outside of React components
 * Useful for tests and utility functions
 *
 * @param locale - The locale to use for formatting
 * @returns Object with formatting functions
 */
export function createNumberFormatter(locale: Locale = DEFAULT_LOCALE) {
  const formatNumber = (value: number, options?: NumberFormatOptions): string => {
    if (!Number.isFinite(value)) {
      return "-";
    }

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });

    return formatter.format(value);
  };

  const formatCurrency = (value: number, currency?: string): string => {
    if (!Number.isFinite(value)) {
      return "-";
    }

    const currencyCode = currency ?? LOCALE_CURRENCY_MAP[locale] ?? "USD";

    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(value);
  };

  const formatPercent = (value: number, options?: NumberFormatOptions): string => {
    if (!Number.isFinite(value)) {
      return "-";
    }

    const formatter = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });

    return formatter.format(value);
  };

  const formatDate = (date: Date, options?: DateFormatOptions): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "-";
    }

    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: options?.dateStyle ?? "medium",
    });

    return formatter.format(date);
  };

  const formatDateTime = (date: Date, options?: DateFormatOptions): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "-";
    }

    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: options?.dateStyle ?? "medium",
      timeStyle: options?.timeStyle ?? "short",
    });

    return formatter.format(date);
  };

  return {
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDate,
    formatDateTime,
    locale,
  };
}
