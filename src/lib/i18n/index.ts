/**
 * i18n Module - Barrel Export
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 *
 * This module provides:
 * - Locale constants and types
 * - Number format provider and context
 * - useNumberFormat hook for locale-aware formatting
 */

// Locale constants and types
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isValidLocale,
  getLocaleLabel,
  type Locale,
} from "./locales";

// Number format context and provider
export {
  NumberFormatProvider,
  useLocale,
  useLocaleOptional,
  type NumberFormatProviderProps,
} from "./NumberFormatProvider";

// Number formatting hook and utilities
export {
  useNumberFormat,
  createNumberFormatter,
  type NumberFormatOptions,
  type UseNumberFormatResult,
} from "./useNumberFormat";
