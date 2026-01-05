/**
 * Disclaimer Components - Barrel Export
 *
 * Story 7.4: Financial Disclaimers
 * Story 9.4: Full-screen Disclaimer Modal
 *
 * Exports all disclaimer-related components for easy import.
 */

export { DisclaimerModal } from "./disclaimer-modal";
export { DisclaimerCheck } from "./disclaimer-check";
export {
  DisclaimerFooter,
  type DisclaimerFooterProps,
  // Exported for testing
  FOOTER_TEXT,
  getFooterText,
  shouldShowIcon,
  getPaddingClass,
} from "./disclaimer-footer";
