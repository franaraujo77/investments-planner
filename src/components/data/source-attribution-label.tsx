"use client";

/**
 * SourceAttributionLabel Component
 *
 * Story 6.8: Data Source Attribution
 * AC-6.8.1: Provider Name Displayed for Each Data Point
 * AC-6.8.2: Source Format String Display
 *
 * A label component that displays data source attribution with:
 * - Formatted string: "Price from Gemini API"
 * - Optional icon indicating data type
 * - Muted styling per UX spec
 * - Dark mode support
 *
 * @module @/components/data/source-attribution-label
 */

import { Database, Globe, TrendingUp, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SourceDataType,
  formatSourceAttribution,
  getProviderDisplayName,
} from "@/lib/types/source-attribution";

// =============================================================================
// TYPES
// =============================================================================

export interface SourceAttributionLabelProps {
  /** Type of data being attributed */
  dataType: SourceDataType | string;
  /** Provider source identifier (technical or display name) */
  source: string;
  /** Optional timestamp when data was fetched */
  timestamp?: Date;
  /** Whether to show an icon before the label */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant for the label */
  size?: "sm" | "default";
}

// =============================================================================
// ICON MAPPING
// =============================================================================

/**
 * Icon component for data type
 *
 * Renders the appropriate icon for a given data type.
 * Extracted to avoid creating components during render.
 */
function DataTypeIcon({
  dataType,
  className,
}: {
  dataType: SourceDataType | string;
  className?: string;
}) {
  switch (dataType) {
    case "price":
      return <TrendingUp className={className} aria-hidden="true" />;
    case "rate":
      return <Globe className={className} aria-hidden="true" />;
    case "fundamentals":
      return <Database className={className} aria-hidden="true" />;
    case "score":
      return <Calculator className={className} aria-hidden="true" />;
    default:
      return <Database className={className} aria-hidden="true" />;
  }
}

/**
 * Get the appropriate icon component for a data type
 *
 * Used by tests - returns the component type for comparison.
 *
 * @param dataType - Type of data
 * @returns Icon component type
 */
function getDataTypeIcon(dataType: SourceDataType | string) {
  switch (dataType) {
    case "price":
      return TrendingUp;
    case "rate":
      return Globe;
    case "fundamentals":
      return Database;
    case "score":
      return Calculator;
    default:
      return Database;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SourceAttributionLabel - displays formatted data source attribution
 *
 * AC-6.8.1: Shows human-readable provider name
 * AC-6.8.2: Consistent format "Price from Gemini API"
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SourceAttributionLabel
 *   dataType="price"
 *   source="gemini"
 * />
 * // Output: "Price from Gemini API"
 *
 * // With icon
 * <SourceAttributionLabel
 *   dataType="rate"
 *   source="exchangerate-api"
 *   showIcon
 * />
 * // Output: [Globe icon] "Rate from ExchangeRate-API"
 *
 * // Small size
 * <SourceAttributionLabel
 *   dataType="fundamentals"
 *   source="Gemini API"
 *   size="sm"
 * />
 * ```
 */
export function SourceAttributionLabel({
  dataType,
  source,
  timestamp,
  showIcon = false,
  className,
  size = "default",
}: SourceAttributionLabelProps) {
  const formattedAttribution = formatSourceAttribution(dataType, source);

  // Size classes
  const sizeClasses = size === "sm" ? "text-[10px]" : "text-xs";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-muted-foreground", sizeClasses, className)}
      data-testid="source-attribution-label"
      data-data-type={dataType}
      data-source={source}
    >
      {showIcon && <DataTypeIcon dataType={dataType} className={cn(iconSize, "flex-shrink-0")} />}
      <span>{formattedAttribution}</span>
      {timestamp && (
        <span className="text-muted-foreground/70">({formatTimestamp(timestamp)})</span>
      )}
    </span>
  );
}

/**
 * Format timestamp for inline display
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// =============================================================================
// COMPACT SOURCE LABEL
// =============================================================================

export interface CompactSourceLabelProps {
  /** Provider source identifier */
  source: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CompactSourceLabel - displays just the provider name
 *
 * Useful when the data type is already clear from context
 *
 * @example
 * ```tsx
 * <CompactSourceLabel source="gemini" />
 * // Output: "Gemini API"
 * ```
 */
export function CompactSourceLabel({ source, className }: CompactSourceLabelProps) {
  const displayName = getProviderDisplayName(source);

  return (
    <span
      className={cn("text-xs text-muted-foreground", className)}
      data-testid="compact-source-label"
    >
      {displayName}
    </span>
  );
}

// =============================================================================
// SOURCE BADGE VARIANT
// =============================================================================

export interface SourceBadgeProps {
  /** Provider source identifier */
  source: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SourceBadge - displays source as a small badge
 *
 * @example
 * ```tsx
 * <SourceBadge source="gemini" />
 * ```
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  const displayName = getProviderDisplayName(source);

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
        "bg-muted text-muted-foreground",
        className
      )}
      data-testid="source-badge"
    >
      {displayName}
    </span>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { getDataTypeIcon, formatTimestamp };
