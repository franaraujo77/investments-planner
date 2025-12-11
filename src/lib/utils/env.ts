/**
 * Environment Variable Utilities
 *
 * Shared utilities for parsing environment variables with type safety
 * and default values.
 *
 * @module @/lib/utils/env
 */

/**
 * Get an integer value from an environment variable
 *
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set or invalid
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * const batchSize = getEnvInt('PRICES_BATCH_SIZE', 50);
 * const timeout = getEnvInt('API_TIMEOUT_MS', 10000);
 * ```
 */
export function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get a string value from an environment variable
 *
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 *
 * @example
 * ```typescript
 * const apiUrl = getEnvString('API_BASE_URL', 'https://api.example.com');
 * ```
 */
export function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a boolean value from an environment variable
 *
 * Recognizes: "true", "1", "yes" as true (case-insensitive)
 * Everything else is false
 *
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns Parsed boolean or default value
 *
 * @example
 * ```typescript
 * const debugMode = getEnvBool('DEBUG_MODE', false);
 * ```
 */
export function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return ["true", "1", "yes"].includes(value.toLowerCase());
}

/**
 * Check if a required environment variable is set
 *
 * @param key - Environment variable name
 * @returns True if the variable is set and non-empty
 *
 * @example
 * ```typescript
 * if (isEnvSet('GEMINI_API_KEY')) {
 *   // Provider is configured
 * }
 * ```
 */
export function isEnvSet(key: string): boolean {
  const value = process.env[key];
  return value !== undefined && value !== "";
}
