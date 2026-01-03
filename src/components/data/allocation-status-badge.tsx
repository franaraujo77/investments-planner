"use client";

/**
 * AllocationStatusBadge Component
 *
 * Story 7.5: Allocation Drift Alerts
 * AC-7.5.5: Positive Indicator When In Range
 *
 * Shows allocation status indicator on the dashboard:
 * - Green badge: "All allocations within target" when no drift alerts
 * - Amber badge: "N allocation(s) drifted" when drift alerts exist
 *
 * Features:
 * - Fetches drift alert count from API on mount
 * - Clickable to open AlertDropdown when alerts exist
 * - Lightweight component suitable for header/dashboard placement
 */

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface AllocationStatusBadgeProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show loading state */
  showLoading?: boolean;
  /** Click handler (e.g., to open AlertDropdown) */
  onClick?: () => void;
}

interface DriftAlertCount {
  count: number;
  hasAlerts: boolean;
}

// =============================================================================
// API FUNCTION
// =============================================================================

async function fetchDriftAlertCount(): Promise<DriftAlertCount> {
  const response = await fetch("/api/alerts?type=allocation_drift&isDismissed=false&limit=1", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch drift alert count");
  }

  const result = await response.json();
  return {
    count: result.meta?.totalCount ?? 0,
    hasAlerts: (result.meta?.totalCount ?? 0) > 0,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AllocationStatusBadge Component
 *
 * Shows a compact status indicator for portfolio allocation health.
 *
 * @example
 * ```tsx
 * // In dashboard header
 * <AllocationStatusBadge onClick={() => setAlertDropdownOpen(true)} />
 * ```
 */
export function AllocationStatusBadge({
  className,
  showLoading = true,
  onClick,
}: AllocationStatusBadgeProps) {
  const [status, setStatus] = useState<DriftAlertCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDriftAlertCount();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Loading state
  if (isLoading && showLoading) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5", className)}
        data-testid="allocation-status-loading"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking...</span>
      </Badge>
    );
  }

  // Error state - silent fail, don't show anything
  if (error || !status) {
    return null;
  }

  // AC-7.5.5: Positive indicator when all allocations in range
  if (!status.hasAlerts) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
          className
        )}
        data-testid="allocation-status-ok"
      >
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs">All allocations within target</span>
      </Badge>
    );
  }

  // Drift alerts exist - show count with click handler
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        onClick && "cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50",
        className
      )}
      onClick={onClick}
      data-testid="allocation-status-drift"
    >
      <AlertTriangle className="h-3 w-3" />
      <span className="text-xs">
        {status.count} allocation{status.count !== 1 ? "s" : ""} drifted
      </span>
    </Badge>
  );
}
