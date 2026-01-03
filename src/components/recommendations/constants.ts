/**
 * Recommendation Display Constants
 *
 * Story 6.3: Recommendation Display
 *
 * Centralized constants for recommendation calculations and display.
 */

/**
 * Target allocation range in percentage points (±5% from target midpoint)
 *
 * Used to calculate the acceptable range around a target allocation midpoint.
 * For example, if target midpoint is 20%, the target range is 15%-25%.
 *
 * Business rule: This defines what "on target" means for allocation guidance.
 */
export const TARGET_ALLOCATION_RANGE = 5;

/**
 * Calculate target min/max from midpoint
 *
 * Uses TARGET_ALLOCATION_RANGE as the ± offset from the target midpoint.
 * Results are clamped to 0-100 to ensure valid percentages.
 *
 * @param targetMidpoint - Target allocation percentage (midpoint)
 * @returns Object with min and max percentages as strings
 */
export function calculateTargetRange(targetMidpoint: string): {
  min: string;
  max: string;
} {
  const midpoint = parseFloat(targetMidpoint) || 0;
  // Note: toFixed is used here for internal data representation (stored as string),
  // not for direct user display. UI components use useNumberFormat() for display.
  // eslint-disable-next-line no-restricted-syntax -- internal calculation, not UI display
  const min = Math.max(midpoint - TARGET_ALLOCATION_RANGE, 0).toFixed(1);
  // eslint-disable-next-line no-restricted-syntax -- internal calculation, not UI display
  const max = Math.min(midpoint + TARGET_ALLOCATION_RANGE, 100).toFixed(1);
  return { min, max };
}
