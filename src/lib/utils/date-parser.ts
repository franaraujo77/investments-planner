/**
 * Date Parser Utility
 *
 * Provides centralized, type-safe date parsing for API responses.
 * Handles the common pattern of dates coming as ISO strings from JSON responses.
 *
 * @module @/lib/utils/date-parser
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Type guard to check if a value is a valid date string
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Type guard to check if a value is a Date object
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Parse a date string to Date object
 *
 * Returns null for invalid or missing values instead of throwing.
 *
 * @param value - Value to parse (string, Date, null, or undefined)
 * @returns Parsed Date or null if invalid
 *
 * @example
 * ```typescript
 * const date = parseDate(response.createdAt);
 * if (date) {
 *   console.log('Created:', date.toLocaleDateString());
 * }
 * ```
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (isDate(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Parse a date string to Date object, throwing if invalid
 *
 * Use when a date is required and missing/invalid values are errors.
 *
 * @param value - Value to parse
 * @param fieldName - Field name for error messages
 * @returns Parsed Date
 * @throws Error if value is invalid or missing
 *
 * @example
 * ```typescript
 * const date = parseDateRequired(response.createdAt, 'createdAt');
 * ```
 */
export function parseDateRequired(
  value: string | Date | null | undefined,
  fieldName: string
): Date {
  const parsed = parseDate(value);
  if (!parsed) {
    throw new Error(`Invalid or missing date for field: ${fieldName}`);
  }
  return parsed;
}

/**
 * Parse a date with a default fallback value
 *
 * Useful when you want a sensible default for missing dates.
 *
 * @param value - Value to parse
 * @param defaultValue - Default date to use if parsing fails
 * @returns Parsed Date or default value
 *
 * @example
 * ```typescript
 * const updatedAt = parseDateWithDefault(response.updatedAt, new Date());
 * ```
 */
export function parseDateWithDefault(
  value: string | Date | null | undefined,
  defaultValue: Date
): Date {
  return parseDate(value) ?? defaultValue;
}

// =============================================================================
// OBJECT TRANSFORMERS
// =============================================================================

/**
 * Fields that should be parsed as dates
 * Add common date field names here
 */
const DEFAULT_DATE_FIELDS = [
  "createdAt",
  "updatedAt",
  "deletedAt",
  "verifiedAt",
  "expiresAt",
  "readAt",
  "dismissedAt",
  "priceUpdatedAt",
  "rateUpdatedAt",
  "dataFreshness",
  "lastUpdated",
  "timestamp",
];

/**
 * Parse date fields in an object
 *
 * Automatically converts string date fields to Date objects.
 * Useful for parsing API responses that have date strings.
 *
 * @param obj - Object with potential date string fields
 * @param dateFields - Array of field names to parse as dates (defaults to common date fields)
 * @returns Object with parsed Date objects
 *
 * @example
 * ```typescript
 * const apiResponse = await fetch('/api/portfolios/123');
 * const data = await apiResponse.json();
 * const parsed = parseDatesInObject(data);
 * // parsed.createdAt is now a Date object
 * ```
 */
export function parseDatesInObject<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[] = DEFAULT_DATE_FIELDS
): T {
  const result = { ...obj };

  for (const field of dateFields) {
    if (field in result) {
      const value = result[field];
      if (typeof value === "string") {
        const parsed = parseDate(value);
        if (parsed) {
          (result as Record<string, unknown>)[field] = parsed;
        }
      }
    }
  }

  return result;
}

/**
 * Parse date fields in an array of objects
 *
 * @param arr - Array of objects with potential date string fields
 * @param dateFields - Array of field names to parse as dates
 * @returns Array with parsed Date objects
 *
 * @example
 * ```typescript
 * const apiResponse = await fetch('/api/alerts');
 * const { data } = await apiResponse.json();
 * const alerts = parseDatesInArray(data);
 * ```
 */
export function parseDatesInArray<T extends Record<string, unknown>>(
  arr: T[],
  dateFields: string[] = DEFAULT_DATE_FIELDS
): T[] {
  return arr.map((item) => parseDatesInObject(item, dateFields));
}

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

/**
 * Parse a typical API response with data containing date fields
 *
 * @param response - API response object with data property
 * @param dateFields - Fields to parse as dates
 * @returns Response with parsed dates
 *
 * @example
 * ```typescript
 * const result = await response.json();
 * const parsed = parseApiResponse<Portfolio>(result);
 * // parsed.data.createdAt is now a Date
 * ```
 */
export function parseApiResponse<T extends Record<string, unknown>>(
  response: { data: T; [key: string]: unknown },
  dateFields?: string[]
): { data: T; [key: string]: unknown } {
  return {
    ...response,
    data: parseDatesInObject(response.data, dateFields),
  };
}

/**
 * Parse a typical API response with array data containing date fields
 *
 * @param response - API response object with data array
 * @param dateFields - Fields to parse as dates
 * @returns Response with parsed dates
 *
 * @example
 * ```typescript
 * const result = await response.json();
 * const parsed = parseApiArrayResponse<Alert>(result);
 * // Each item in parsed.data has dates parsed
 * ```
 */
export function parseApiArrayResponse<T extends Record<string, unknown>>(
  response: { data: T[]; [key: string]: unknown },
  dateFields?: string[]
): { data: T[]; [key: string]: unknown } {
  return {
    ...response,
    data: parseDatesInArray(response.data, dateFields),
  };
}
