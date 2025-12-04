/**
 * Allocation Utility Functions (Client-Safe)
 *
 * Story 3.7: Allocation Percentage View
 *
 * Pure utility functions for allocation calculations that can be
 * used in both client and server components.
 *
 * IMPORTANT: This file must NOT import any server-only modules like:
 * - portfolio-service
 * - db/index
 * - Any module that uses 'postgres'
 */

import { Decimal } from "@/lib/calculations/decimal-config";

/**
 * Format percentage with 1 decimal precision
 * AC-3.7.4: Percentages show with 1 decimal precision
 *
 * @param value - String numeric value to format
 * @returns Formatted string with 1 decimal place (e.g., "42.5")
 */
export function formatAllocationPercent(value: string): string {
  try {
    return new Decimal(value).toFixed(1);
  } catch {
    return "0.0";
  }
}
