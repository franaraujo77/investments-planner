/**
 * ISIN (International Securities Identification Number) Utilities
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.3: ISIN as Universal Key
 *
 * Implements ISO 6166 ISIN validation and parsing.
 *
 * ISIN Format: CC-NNNNNNNNN-C (12 characters total)
 * - CC: 2-letter country code (ISO 3166-1 alpha-2)
 * - NNNNNNNNN: 9-character alphanumeric NSIN (National Securities Identifying Number)
 * - C: Check digit (Luhn algorithm mod 10)
 *
 * Examples:
 * - US0378331005 - Apple Inc. (US)
 * - BRPETRACNOR9 - Petrobras ON (Brazil)
 * - GB0002634946 - BAE Systems (UK)
 *
 * @module @/lib/utils/isin
 */

/**
 * Parsed ISIN components
 */
export interface ParsedIsin {
  countryCode: string; // 2-letter ISO country code
  nsin: string; // 9-character national identifier
  checkDigit: string; // Single check digit
  isValid: boolean; // Whether the ISIN is valid
}

/**
 * Result of ISIN validation
 */
export interface IsinValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a string matches ISIN format (basic structure)
 *
 * @param isin - The ISIN string to validate
 * @returns true if format is valid (12 alphanumeric chars starting with 2 letters)
 */
export function isValidIsinFormat(isin: string): boolean {
  if (typeof isin !== "string") {
    return false;
  }

  // ISIN must be exactly 12 characters
  if (isin.length !== 12) {
    return false;
  }

  // Must be uppercase alphanumeric
  if (!/^[A-Z0-9]{12}$/.test(isin)) {
    return false;
  }

  // First two characters must be letters (country code)
  if (!/^[A-Z]{2}/.test(isin)) {
    return false;
  }

  return true;
}

/**
 * Converts a character to its numeric value for Luhn algorithm
 * Letters A-Z become 10-35, digits remain as-is
 *
 * @param char - Single character to convert
 * @returns Numeric string representation
 */
function charToDigits(char: string): string {
  const code = char.charCodeAt(0);

  // A-Z (65-90) -> 10-35
  if (code >= 65 && code <= 90) {
    return (code - 55).toString();
  }

  // 0-9 -> 0-9
  return char;
}

/**
 * Calculates the ISIN check digit using the Luhn algorithm (mod 10)
 *
 * Algorithm:
 * 1. Convert letters to numbers (A=10, B=11, ..., Z=35)
 * 2. Concatenate all digits into a single string
 * 3. Starting from the rightmost digit, double every second digit
 * 4. If doubling results in > 9, subtract 9
 * 5. Sum all digits
 * 6. Check digit = (10 - (sum % 10)) % 10
 *
 * @param isinWithoutCheck - First 11 characters of ISIN (without check digit)
 * @returns The calculated check digit (0-9)
 */
export function calculateIsinCheckDigit(isinWithoutCheck: string): number {
  if (isinWithoutCheck.length !== 11) {
    throw new Error("ISIN without check digit must be 11 characters");
  }

  // Convert all characters to digits
  const digits = isinWithoutCheck.split("").map(charToDigits).join("");

  // Apply Luhn algorithm
  let sum = 0;
  let alternate = true; // Start with true for rightmost position

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]!, 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Validates an ISIN including check digit verification
 *
 * @param isin - The ISIN string to validate
 * @returns Validation result with isValid flag and optional error message
 *
 * @example
 * validateIsin("US0378331005") // { isValid: true }
 * validateIsin("US0378331006") // { isValid: false, error: "Invalid check digit" }
 */
export function validateIsin(isin: string): IsinValidationResult {
  // Basic format check
  if (!isValidIsinFormat(isin)) {
    return {
      isValid: false,
      error: "Invalid ISIN format. Must be 12 alphanumeric characters starting with 2 letters.",
    };
  }

  // Extract check digit and validate
  const providedCheckDigit = parseInt(isin.charAt(11), 10);
  const calculatedCheckDigit = calculateIsinCheckDigit(isin.substring(0, 11));

  if (providedCheckDigit !== calculatedCheckDigit) {
    return {
      isValid: false,
      error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${providedCheckDigit}.`,
    };
  }

  return { isValid: true };
}

/**
 * Checks if an ISIN string is valid (convenience function)
 *
 * @param isin - The ISIN string to validate
 * @returns true if the ISIN is valid
 */
export function isValidIsin(isin: string): boolean {
  return validateIsin(isin).isValid;
}

/**
 * Parses an ISIN into its components
 *
 * @param isin - The ISIN string to parse
 * @returns Parsed ISIN components
 *
 * @example
 * parseIsin("US0378331005")
 * // { countryCode: "US", nsin: "037833100", checkDigit: "5", isValid: true }
 */
export function parseIsin(isin: string): ParsedIsin {
  const validation = validateIsin(isin);

  return {
    countryCode: isin.substring(0, 2),
    nsin: isin.substring(2, 11),
    checkDigit: isin.substring(11, 12),
    isValid: validation.isValid,
  };
}

/**
 * Extracts the 2-letter country code from an ISIN
 *
 * @param isin - The ISIN string
 * @returns 2-letter ISO 3166-1 alpha-2 country code
 *
 * @example
 * getCountryFromIsin("US0378331005") // "US"
 * getCountryFromIsin("BRPETRACNOR9") // "BR"
 */
export function getCountryFromIsin(isin: string): string {
  if (typeof isin !== "string" || isin.length < 2) {
    return "";
  }
  return isin.substring(0, 2).toUpperCase();
}

/**
 * Normalizes an ISIN to uppercase
 *
 * @param isin - The ISIN string to normalize
 * @returns Uppercase ISIN or empty string if invalid
 */
export function normalizeIsin(isin: string): string {
  if (typeof isin !== "string") {
    return "";
  }
  return isin.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Generates a valid ISIN check digit and appends it to create a complete ISIN
 *
 * @param isinWithoutCheck - First 11 characters of ISIN
 * @returns Complete 12-character ISIN with check digit
 */
export function completeIsin(isinWithoutCheck: string): string {
  const normalized = normalizeIsin(isinWithoutCheck);

  if (normalized.length !== 11) {
    throw new Error("Input must be 11 characters (ISIN without check digit)");
  }

  const checkDigit = calculateIsinCheckDigit(normalized);
  return normalized + checkDigit.toString();
}

/**
 * Common ISIN country codes and their mappings
 * Used for jurisdiction inference
 */
export const ISIN_COUNTRY_MAPPINGS: Record<string, { country: string; jurisdiction?: string }> = {
  US: { country: "United States", jurisdiction: "US-SEC" },
  BR: { country: "Brazil", jurisdiction: "BR-CVM" },
  GB: { country: "United Kingdom", jurisdiction: "UK-FCA" },
  DE: { country: "Germany" },
  FR: { country: "France" },
  JP: { country: "Japan" },
  CA: { country: "Canada" },
  AU: { country: "Australia" },
  CH: { country: "Switzerland" },
  NL: { country: "Netherlands" },
  // EU countries without specific mappings
  IT: { country: "Italy" },
  ES: { country: "Spain" },
  PT: { country: "Portugal" },
  BE: { country: "Belgium" },
  AT: { country: "Austria" },
  IE: { country: "Ireland" },
  // XS is for international securities (Euroclear/Clearstream)
  XS: { country: "International" },
};

/**
 * Infers jurisdiction from ISIN country code
 *
 * @param isin - The ISIN string
 * @returns Jurisdiction code or undefined if not mapped
 */
export function inferJurisdictionFromIsin(isin: string): string | undefined {
  const countryCode = getCountryFromIsin(isin);
  return ISIN_COUNTRY_MAPPINGS[countryCode]?.jurisdiction;
}
