"use client";

/**
 * DataWithAttribution Component
 *
 * Story 7.1: Data Source Attribution
 * AC-7.1.1: Click/Hover Data Point Attribution
 * AC-7.1.2: Timestamp Visibility
 *
 * A wrapper component that adds source attribution tooltips to any data point.
 * Shows provider name, timestamp, and document reference on hover or click.
 *
 * Features:
 * - Tooltip on hover (desktop)
 * - Click-to-expand (mobile)
 * - Relative and exact timestamp display
 * - Document reference support
 * - Keyboard accessible
 *
 * @module @/components/data/data-with-attribution
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SourceAttribution, DocumentReference } from "@/lib/types/source-attribution";
import { getProviderDisplayName, getDocumentTypeLabel } from "@/lib/types/source-attribution";
import { formatRelativeTime, formatExactTime } from "@/lib/types/freshness";
import { Database, Globe, TrendingUp, Calculator, FileText, ExternalLink } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface DataWithAttributionProps {
  /** The data value to display (wrapped content) */
  children: React.ReactNode;
  /** Source attribution information */
  attribution: SourceAttribution;
  /** Whether to show tooltip on hover (default: true) */
  showOnHover?: boolean;
  /** Whether to support click-to-expand (mobile fallback) */
  showOnClick?: boolean;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Icon mapping for data types
 * Defined as a constant to avoid creating components during render
 */
const DATA_TYPE_ICONS: Record<string, React.ElementType> = {
  price: TrendingUp,
  rate: Globe,
  fundamentals: Database,
  score: Calculator,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get icon for data type
 */
function getDataTypeIcon(dataType: string): React.ElementType {
  return DATA_TYPE_ICONS[dataType] ?? Database;
}

/**
 * Get label for data type
 */
function getDataTypeLabel(dataType: string): string {
  switch (dataType) {
    case "price":
      return "Price";
    case "rate":
      return "Exchange Rate";
    case "fundamentals":
      return "Fundamentals";
    case "score":
      return "Score";
    default:
      return "Data";
  }
}

// =============================================================================
// TOOLTIP CONTENT COMPONENT
// =============================================================================

interface AttributionTooltipContentProps {
  attribution: SourceAttribution;
}

function AttributionTooltipContent({ attribution }: AttributionTooltipContentProps) {
  const providerName = getProviderDisplayName(attribution.source);
  const dataTypeLabel = getDataTypeLabel(attribution.dataType);

  // Get icon from constant mapping (not creating during render)
  const IconComponent = DATA_TYPE_ICONS[attribution.dataType] ?? Database;

  return (
    <div className="space-y-2" data-testid="attribution-content">
      {/* Data Type and Source */}
      <div className="flex items-center gap-2">
        <IconComponent className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <div>
          <div className="font-medium text-sm">{dataTypeLabel}</div>
          <div className="text-xs text-muted-foreground">{providerName}</div>
        </div>
      </div>

      {/* Timestamp Display (AC-7.1.2) */}
      {attribution.timestamp && (
        <div className="text-xs space-y-0.5">
          <div className="text-muted-foreground">
            Updated {formatRelativeTime(attribution.timestamp)}
          </div>
          <div className="text-muted-foreground/70 text-[10px]">
            {formatExactTime(attribution.timestamp)}
          </div>
        </div>
      )}

      {/* Document Reference (AC-7.1.3) */}
      {attribution.documentRef && <DocumentReferenceDisplay docRef={attribution.documentRef} />}
    </div>
  );
}

// =============================================================================
// DOCUMENT REFERENCE DISPLAY
// =============================================================================

interface DocumentReferenceDisplayProps {
  docRef: DocumentReference;
}

function DocumentReferenceDisplay({ docRef }: DocumentReferenceDisplayProps) {
  const typeLabel = getDocumentTypeLabel(docRef.type);
  const dateStr = docRef.publicationDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="pt-1 border-t border-muted-foreground/20">
      <div className="flex items-start gap-1.5">
        <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="text-xs">
          <div className="font-medium">{docRef.title}</div>
          <div className="text-muted-foreground">
            {typeLabel} • {dateStr}
          </div>
          {docRef.filingId && (
            <div className="text-muted-foreground/70 text-[10px]">Ref: {docRef.filingId}</div>
          )}
          {docRef.url && (
            <a
              href={docRef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline text-[10px] mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
              View source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * DataWithAttribution - wraps any data point with source attribution tooltip
 *
 * AC-7.1.1: Click/Hover Data Point Attribution
 * AC-7.1.2: Timestamp Visibility
 *
 * @example
 * ```tsx
 * <DataWithAttribution
 *   attribution={{
 *     dataType: "price",
 *     source: "gemini",
 *     timestamp: new Date(),
 *   }}
 * >
 *   <span className="font-medium">R$ 28.45</span>
 * </DataWithAttribution>
 * ```
 */
export function DataWithAttribution({
  children,
  attribution,
  showOnHover = true,
  showOnClick = false,
  className,
}: DataWithAttributionProps) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Handle click for mobile support
   */
  const handleClick = () => {
    if (showOnClick) {
      setIsOpen(!isOpen);
    }
  };

  // If neither hover nor click is enabled, just render children
  if (!showOnHover && !showOnClick) {
    return <>{children}</>;
  }

  // Control tooltip state only when using click mode
  const tooltipProps = showOnClick
    ? { open: isOpen, onOpenChange: setIsOpen }
    : { onOpenChange: setIsOpen };

  return (
    <Tooltip {...tooltipProps}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-help",
            "hover:underline hover:decoration-dotted hover:underline-offset-4",
            className
          )}
          data-testid="data-with-attribution"
          onClick={handleClick}
          role={showOnClick ? "button" : undefined}
          tabIndex={showOnClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (showOnClick && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] p-3" data-testid="attribution-tooltip">
        <AttributionTooltipContent attribution={attribution} />
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { AttributionTooltipContent, DocumentReferenceDisplay, getDataTypeIcon, getDataTypeLabel };
