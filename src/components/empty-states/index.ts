/**
 * Empty States Components
 *
 * Story 9.6: Empty States & Helpful Messaging
 *
 * Barrel export for all empty state components.
 * Provides helpful empty states throughout the app with:
 * - Consistent visual design (icon, title, message)
 * - Context-appropriate CTAs
 * - Encouraging messaging
 */

// Base component
export { EmptyState } from "./empty-state";
export type { EmptyStateProps, EmptyStateCta } from "./empty-state";

// Specific empty states
export { EmptyPortfolio } from "./empty-portfolio";
export type { EmptyPortfolioProps } from "./empty-portfolio";

export { EmptyAssets } from "./empty-assets";
export type { EmptyAssetsProps } from "./empty-assets";

export { EmptyRecommendations } from "./empty-recommendations";
export type { EmptyRecommendationsProps } from "./empty-recommendations";

export { EmptyAlerts } from "./empty-alerts";
export type { EmptyAlertsProps } from "./empty-alerts";

export { EmptyHistory } from "./empty-history";
export type { EmptyHistoryProps } from "./empty-history";
