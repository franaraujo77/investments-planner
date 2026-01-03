"use client";

/**
 * AlertDropdown Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * Story 7.5: Allocation Drift Alerts
 * AC-9.6.4: Empty Alerts State Shows "All Clear" Message
 * AC-7.5.3: Alert Click Navigation - clicking drift alert navigates to portfolio
 *
 * Dropdown component that displays user alerts in the header.
 * Shows EmptyAlerts state when there are no alerts.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, AlertTriangle, TrendingUp, Info, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyAlerts } from "@/components/empty-states";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Metadata for drift alerts
 * AC-7.5.3: Contains assetClassId for portfolio navigation
 */
interface DriftAlertMetadata {
  assetClassId: string;
  assetClassName: string;
  currentAllocation: string;
  targetMin: string;
  targetMax: string;
  driftAmount: string;
  direction: "over" | "under";
}

/**
 * Metadata for opportunity alerts
 */
interface OpportunityAlertMetadata {
  currentAssetId: string;
  currentAssetSymbol: string;
  betterAssetId: string;
  betterAssetSymbol: string;
  assetClassId: string;
  assetClassName: string;
}

type AlertMetadata = DriftAlertMetadata | OpportunityAlertMetadata | Record<string, unknown>;

interface Alert {
  id: string;
  type: "opportunity" | "allocation_drift" | "system";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  metadata: AlertMetadata;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AlertDropdown Component
 *
 * Displays a bell icon in the header that opens a dropdown showing alerts.
 * When there are no alerts, shows the EmptyAlerts state per AC-9.6.4.
 *
 * @example
 * ```tsx
 * <AlertDropdown />
 * ```
 */
export function AlertDropdown() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch alerts when dropdown opens
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alerts?limit=10&isDismissed=false");
      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }
      const result = await response.json();
      setAlerts(result.data || []);
    } catch (_error) {
      // Error handled via UI state - show empty state instead of breaking UI
      // Server-side logging happens in the API route
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch alerts on initial open
  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, fetchAlerts]);

  // Count unread alerts for badge
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  // Get icon for alert type
  // AC-7.5.4: Different icons for warning vs critical severity
  const getAlertIcon = (type: Alert["type"], severity: Alert["severity"]) => {
    switch (type) {
      case "opportunity":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "allocation_drift":
        // AC-7.5.4: Critical shows AlertOctagon, warning shows AlertTriangle
        if (severity === "critical") {
          return <AlertOctagon className="h-4 w-4 text-red-500" />;
        }
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  /**
   * AC-7.5.3: Handle alert click navigation
   * Drift alerts navigate to portfolio with highlighted class
   */
  const handleAlertClick = useCallback(
    (alert: Alert) => {
      // Close the dropdown
      setIsOpen(false);

      // Navigate based on alert type
      if (alert.type === "allocation_drift") {
        const metadata = alert.metadata as DriftAlertMetadata;
        if (metadata?.assetClassId) {
          router.push(`/portfolio?highlightClass=${metadata.assetClassId}`);
        } else {
          router.push("/portfolio");
        }
      } else if (alert.type === "opportunity") {
        // Opportunity alerts could navigate to asset comparison (future)
        const metadata = alert.metadata as OpportunityAlertMetadata;
        if (metadata?.currentAssetId) {
          router.push(`/portfolio?highlightAsset=${metadata.currentAssetId}`);
        }
      }
      // System alerts don't navigate anywhere
    },
    [router]
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Alerts${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" data-testid="alert-dropdown-content">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold">Alerts</span>
          {alerts.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs">
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            // AC-9.6.4: Empty Alerts State
            <div className="py-4 px-2">
              <EmptyAlerts className="py-8" />
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleAlertClick(alert)}
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                    !alert.isRead && "bg-muted/30",
                    // AC-7.5.4: Highlight critical alerts with subtle red border
                    alert.severity === "critical" && "border-l-2 border-l-red-500"
                  )}
                  data-testid={`alert-item-${alert.type}`}
                >
                  <div className="mt-0.5">{getAlertIcon(alert.type, alert.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", !alert.isRead && "font-medium")}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full">
                View all alerts
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
