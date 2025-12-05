"use client";

/**
 * Min Allocation Badge Component
 *
 * Story 4.6: Set Minimum Allocation Values
 *
 * AC-4.6.2: Display minimum allocation badge ("Min: $100")
 * AC-4.6.5: Currency Formatting
 *
 * Displays the minimum allocation value as a badge.
 * Shows tooltip explaining what the minimum does on hover.
 * Hidden when value is null or "0" (no minimum).
 */

import { cn, formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign } from "lucide-react";

interface MinAllocationBadgeProps {
  /** Minimum allocation value (null or "0" = no minimum, badge hidden) */
  value: string | null;
  /** Currency code for formatting (e.g., "USD", "BRL", "EUR") */
  currency: string;
  /** Optional additional class names */
  className?: string;
}

/**
 * Check if the value represents "no minimum"
 */
function hasMinimum(value: string | null): boolean {
  if (value === null || value === "" || value === "0" || value === "0.00") {
    return false;
  }
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue > 0;
}

export function MinAllocationBadge({
  value,
  currency = "USD",
  className,
}: MinAllocationBadgeProps) {
  // Don't show badge if no minimum is set
  if (!hasMinimum(value)) {
    return null;
  }

  const formattedValue = formatCurrency(value, currency);
  const tooltipText = `Recommendations below ${formattedValue} will be suppressed for this class/subclass`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              className
            )}
            role="status"
            aria-label={`Minimum allocation: ${formattedValue}`}
          >
            <DollarSign className="h-3 w-3" />
            <span>Min: {formattedValue}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
