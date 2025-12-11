/**
 * Freshness Types and Utilities
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.2: Colors Based on Data Age
 *
 * Types and utility functions for determining data freshness status
 * and formatting timestamps for display.
 *
 * @module @/lib/types/freshness
 */

// Re-export FreshnessInfo from providers/types for convenience
export type { FreshnessInfo } from "@/lib/providers/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Freshness status levels for visual display
 *
 * AC-6.7.2: Color coding based on data age
 * - fresh: < 24 hours (green)
 * - stale: 1-3 days (amber)
 * - very-stale: > 3 days (red)
 */
export type FreshnessStatus = "fresh" | "stale" | "very-stale";

/**
 * Freshness thresholds in milliseconds
 */
export const FRESHNESS_THRESHOLDS = {
  /** Fresh threshold: 24 hours in ms */
  FRESH_MS: 24 * 60 * 60 * 1000,
  /** Stale threshold: 3 days (72 hours) in ms */
  STALE_MS: 3 * 24 * 60 * 60 * 1000,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Determine freshness status based on data age
 *
 * AC-6.7.2: Colors Based on Data Age
 * - Green: Data is less than 24 hours old
 * - Amber: Data is 1-3 days old
 * - Red: Data is more than 3 days old
 *
 * @param fetchedAt - Date when data was fetched
 * @param now - Optional current time (for testing)
 * @returns Freshness status: 'fresh', 'stale', or 'very-stale'
 *
 * @example
 * ```ts
 * const status = getFreshnessStatus(new Date('2025-12-10T12:00:00'));
 * // Returns 'fresh' if < 24h, 'stale' if 1-3 days, 'very-stale' if > 3 days
 * ```
 */
export function getFreshnessStatus(fetchedAt: Date, now: Date = new Date()): FreshnessStatus {
  const ageMs = now.getTime() - fetchedAt.getTime();

  if (ageMs < FRESHNESS_THRESHOLDS.FRESH_MS) {
    return "fresh";
  }

  if (ageMs < FRESHNESS_THRESHOLDS.STALE_MS) {
    return "stale";
  }

  return "very-stale";
}

/**
 * Format a date as relative time (e.g., "2h ago", "3 days ago")
 *
 * AC-6.7.1: Display relative time on badge
 *
 * @param date - Date to format
 * @param now - Optional current time (for testing)
 * @returns Human-readable relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2h ago"
 * formatRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) // "3 days ago"
 * ```
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates
  if (diffMs < 0) {
    return "just now";
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  if (hours > 0) {
    return hours === 1 ? "1h ago" : `${hours}h ago`;
  }

  if (minutes > 0) {
    return minutes === 1 ? "1m ago" : `${minutes}m ago`;
  }

  return "just now";
}

/**
 * Format a date as exact timestamp for tooltip display
 *
 * AC-6.7.3: Hover Shows Exact Timestamp
 * Format: "Dec 10, 2025, 3:00 AM"
 *
 * @param date - Date to format
 * @returns Formatted date string in locale format
 *
 * @example
 * ```ts
 * formatExactTime(new Date('2025-12-10T03:00:00'))
 * // "Dec 10, 2025, 3:00 AM"
 * ```
 */
export function formatExactTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get CSS color classes for freshness status
 *
 * AC-6.7.2: Visual color coding for freshness
 *
 * @param status - Freshness status
 * @returns Object with Tailwind CSS classes for badge styling
 */
export function getFreshnessColorClasses(status: FreshnessStatus): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (status) {
    case "fresh":
      return {
        bg: "bg-green-500/10",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-500/20",
        icon: "text-green-500",
      };
    case "stale":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/20",
        icon: "text-amber-500",
      };
    case "very-stale":
      return {
        bg: "bg-red-500/10",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/20",
        icon: "text-red-500",
      };
  }
}

/**
 * Get accessible description for freshness status
 *
 * @param status - Freshness status
 * @param relativeTime - Relative time string
 * @returns Accessible description for screen readers
 */
export function getFreshnessAriaLabel(status: FreshnessStatus, relativeTime: string): string {
  const statusDescriptions: Record<FreshnessStatus, string> = {
    fresh: "Data is fresh",
    stale: "Data is stale",
    "very-stale": "Data is very stale",
  };

  return `${statusDescriptions[status]}, last updated ${relativeTime}`;
}
