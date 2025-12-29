/**
 * Locale Constants
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.5: Supported Locales (en-US, pt-BR, de-DE, fr-FR, es-ES)
 * AC-1.5.6: Default Locale (en-US)
 */

/**
 * Supported locales with display labels
 *
 * Format: BCP 47 language tags (language-region)
 * Each locale includes:
 * - value: The locale code used internally
 * - label: Display name shown in the UI
 */
export const SUPPORTED_LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Portugu\u00EAs (Brasil)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "fr-FR", label: "Fran\u00E7ais (France)" },
  { value: "es-ES", label: "Espa\u00F1ol (Espa\u00F1a)" },
] as const;

/**
 * Type representing valid locale values
 */
export type Locale = (typeof SUPPORTED_LOCALES)[number]["value"];

/**
 * Default locale for new users
 */
export const DEFAULT_LOCALE: Locale = "en-US";

/**
 * Type guard to check if a string is a valid locale
 */
export function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale.value === value);
}

/**
 * Get locale label by value
 */
export function getLocaleLabel(value: Locale): string {
  const locale = SUPPORTED_LOCALES.find((l) => l.value === value);
  return locale?.label ?? value;
}
