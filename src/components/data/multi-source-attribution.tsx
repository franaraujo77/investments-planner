"use client";

/**
 * MultiSourceAttribution Component
 *
 * Story 7.1: Data Source Attribution
 * AC-7.1.4: Multiple Sources Display
 *
 * A component that displays data from multiple sources with an expandable view.
 * In collapsed state, shows primary source + "Data from [N] sources".
 * When expanded, shows all sources with their timestamps.
 *
 * Features:
 * - Collapsed state with primary source display
 * - Expandable list of all sources with timestamps
 * - Keyboard navigation (Enter/Space to toggle)
 * - ARIA accessibility attributes
 * - Smooth expand/collapse animation
 *
 * @module @/components/data/multi-source-attribution
 */

import { useState, useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceAttribution } from "@/lib/types/source-attribution";
import { formatRelativeTime } from "@/lib/types/freshness";
import { getProviderDisplayName } from "@/lib/types/source-attribution";

// =============================================================================
// TYPES
// =============================================================================

export interface MultiSourceAttributionProps {
  /** Array of source attributions to display */
  sources: SourceAttribution[];
  /** Index of the primary source to show when collapsed (default: 0) */
  primarySourceIndex?: number;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS (exported for testing)
// =============================================================================

/**
 * Get the primary source from the sources array
 *
 * @param sources - Array of source attributions
 * @param index - Index of the primary source (default: 0)
 * @returns The primary source or undefined if empty
 */
export function getPrimarySource(
  sources: SourceAttribution[],
  index?: number
): SourceAttribution | undefined {
  if (sources.length === 0) {
    return undefined;
  }

  const primaryIndex = index ?? 0;

  // If index is out of bounds, return first source
  if (primaryIndex < 0 || primaryIndex >= sources.length) {
    return sources[0];
  }

  return sources[primaryIndex];
}

/**
 * Get the count of sources
 *
 * @param sources - Array of source attributions
 * @returns Number of sources
 */
export function getSourceCount(sources: SourceAttribution[]): number {
  return sources.length;
}

/**
 * Format the source count label for display
 *
 * AC-7.1.4: "Data from [N] sources" with option to expand
 *
 * @param count - Number of sources
 * @returns Formatted label string
 */
export function formatSourceCountLabel(count: number): string {
  if (count === 0) {
    return "No sources";
  }

  if (count === 1) {
    return "Data from 1 source";
  }

  return `Data from ${count} sources`;
}

/**
 * Determine if the expand button should be shown
 *
 * @param sources - Array of source attributions
 * @returns True if there are multiple sources
 */
export function shouldShowExpandButton(sources: SourceAttribution[]): boolean {
  return sources.length > 1;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * MultiSourceAttribution - displays data from multiple sources
 *
 * AC-7.1.4: Multiple Sources Display
 * - Primary source is shown in collapsed state
 * - "Data from [N] sources" with option to expand
 * - All sources with timestamps shown when expanded
 *
 * @example
 * ```tsx
 * <MultiSourceAttribution
 *   sources={[
 *     { dataType: "price", source: "Gemini API", timestamp: new Date() },
 *     { dataType: "fundamentals", source: "Yahoo Finance", timestamp: new Date() },
 *   ]}
 * />
 * ```
 */
export function MultiSourceAttribution({
  sources,
  primarySourceIndex = 0,
  className,
}: MultiSourceAttributionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  const primarySource = getPrimarySource(sources, primarySourceIndex);
  const sourceCount = getSourceCount(sources);
  const showExpandButton = shouldShowExpandButton(sources);

  /**
   * Handle click to toggle expanded state
   */
  const handleClick = () => {
    if (showExpandButton) {
      setIsExpanded(!isExpanded);
    }
  };

  /**
   * Handle keyboard navigation
   *
   * AC-7.1.4: Support keyboard navigation (Enter/Space to toggle)
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && showExpandButton) {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  // Handle empty sources
  if (sources.length === 0) {
    return (
      <div
        data-testid="multi-source-attribution"
        className={cn("text-xs text-muted-foreground", className)}
      >
        No sources
      </div>
    );
  }

  return (
    <div data-testid="multi-source-attribution" className={cn("text-xs", className)}>
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        disabled={!showExpandButton}
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground",
          showExpandButton && "cursor-pointer hover:text-foreground transition-colors",
          !showExpandButton && "cursor-default"
        )}
      >
        {/* Primary Source */}
        <span className="font-medium">{getProviderDisplayName(primarySource?.source ?? "")}</span>

        {/* Source Count */}
        {showExpandButton && (
          <>
            <span className="text-muted-foreground/70">•</span>
            <span>{formatSourceCountLabel(sourceCount)}</span>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            )}
          </>
        )}
      </button>

      {/* Expanded Source List */}
      {isExpanded && (
        <div
          id={panelId}
          className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          data-testid="source-list"
        >
          {sources.map((source, index) => (
            <div
              key={`${source.source}-${source.dataType}-${index}`}
              data-testid={`source-item-${index}`}
              className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{getProviderDisplayName(source.source)}</span>
                <span className="text-muted-foreground/70">({source.dataType})</span>
              </div>
              {source.timestamp && (
                <span className="text-muted-foreground">
                  {formatRelativeTime(source.timestamp)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
