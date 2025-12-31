/**
 * Onboarding Tips Constants
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Contextual Onboarding Tips Display
 * AC-3.5.5: Allocation Editing Screen Tips
 *
 * Defines all onboarding tips with their content, positioning, and page associations.
 */

/**
 * Onboarding tip definition
 */
export interface OnboardingTip {
  /** Unique identifier for the tip */
  id: string;
  /** Short, action-oriented title (3-5 words) */
  title: string;
  /** Explanation of the feature (1-2 sentences, explains "why" not just "what") */
  description: string;
  /** Optional CSS selector for positioning the tip near a specific element */
  targetSelector?: string;
  /** Route path pattern where this tip should appear */
  page: string;
  /** Display order for tips on the same page */
  order: number;
}

/**
 * All onboarding tips for the application
 *
 * Tips are designed to:
 * - Use clear, jargon-free language
 * - Explain the "why" behind features
 * - Be encouraging rather than instructive
 */
export const ONBOARDING_TIPS: OnboardingTip[] = [
  {
    id: "pie-chart-interaction",
    title: "Portfolio Summary",
    description:
      "This card shows your portfolio's total value and allocation status. Hover over different sections to see details about your assets and data freshness.",
    page: "/portfolio/[portfolioId]",
    order: 1,
  },
  {
    id: "allocation-indicator",
    title: "Allocation Indicator",
    description:
      "This indicator shows your total allocation percentage. Aim for exactly 100% - green means you're fully allocated, while other colors indicate under or over-allocation.",
    page: "/portfolio/[portfolioId]",
    order: 2,
  },
  {
    id: "allocation-validation",
    title: "100% Allocation Rule",
    description:
      "Your portfolio allocations should sum to exactly 100%. Click on any holding to edit its allocation percentage. The Save button becomes active when allocations are valid.",
    page: "/portfolio/[portfolioId]",
    order: 3,
  },
];

/**
 * Get tips for a specific page
 *
 * @param page - The current route path
 * @returns Tips that should appear on this page, sorted by order
 */
export function getTipsForPage(page: string): OnboardingTip[] {
  return ONBOARDING_TIPS.filter((tip) => matchesPage(tip.page, page)).sort(
    (a, b) => a.order - b.order
  );
}

/**
 * Check if a route pattern matches a page path
 *
 * Supports dynamic route segments like [portfolioId]
 *
 * @param pattern - Route pattern (e.g., "/portfolio/[portfolioId]")
 * @param page - Actual page path (e.g., "/portfolio/123")
 * @returns true if the pattern matches the page
 */
export function matchesPage(pattern: string, page: string): boolean {
  // Convert pattern to regex
  // [param] becomes a wildcard matching any segment
  const regexPattern = pattern
    .replace(/\[[\w]+\]/g, "[^/]+") // Replace [param] with regex for any segment
    .replace(/\//g, "\\/"); // Escape forward slashes

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(page);
}

/**
 * Get a tip by its ID
 *
 * @param tipId - The unique tip identifier
 * @returns The tip definition or undefined if not found
 */
export function getTipById(tipId: string): OnboardingTip | undefined {
  return ONBOARDING_TIPS.find((tip) => tip.id === tipId);
}

/**
 * Get all tip IDs
 *
 * @returns Array of all tip IDs
 */
export function getAllTipIds(): string[] {
  return ONBOARDING_TIPS.map((tip) => tip.id);
}
