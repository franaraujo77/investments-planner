"use client";

/**
 * Alerts List Client Component
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.5: Alert grouping by asset class, snooze button
 * AC-7.6.2: Alert click navigation
 *
 * Story 7.8: Opportunity Alerts Enhancements
 * AC-7.8.1: Dismiss All in Group Action
 *
 * Displays user's alerts grouped by asset class with snooze and dismiss functionality.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { toast } from "sonner";
import {
  Bell,
  Loader2,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronDown,
  ChevronRight,
  AlarmClock,
  X,
  Settings,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyAlerts } from "@/components/empty-states";
import { cn } from "@/lib/utils";
import Link from "next/link";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of alerts to fetch from API */
const MAX_ALERTS_FETCH = 100;

/** Number of hours to snooze an alert */
const SNOOZE_DURATION_HOURS = 24;

// =============================================================================
// TYPES
// =============================================================================

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

/**
 * Metadata for drift alerts
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

type AlertMetadata = OpportunityAlertMetadata | DriftAlertMetadata | Record<string, unknown>;

interface Alert {
  id: string;
  type: "opportunity" | "allocation_drift" | "system";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  metadata: AlertMetadata;
  isRead: boolean;
  isDismissed: boolean;
  snoozedUntil: string | null;
  createdAt: string;
}

interface AlertsResponse {
  data: Alert[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Grouped alerts by asset class
 */
interface AlertGroup {
  assetClassName: string;
  assetClassId: string;
  alerts: Alert[];
  totalCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract asset class info from alert metadata
 */
function getAssetClassInfo(alert: Alert): { id: string; name: string } {
  const metadata = alert.metadata as OpportunityAlertMetadata | DriftAlertMetadata;

  if ("assetClassName" in metadata && "assetClassId" in metadata) {
    return {
      id: metadata.assetClassId,
      name: metadata.assetClassName,
    };
  }

  // Fallback for alerts without asset class info
  return { id: "other", name: "Other Alerts" };
}

/**
 * Group alerts by asset class
 * AC-7.6.5: Collapsible sections by asset class
 */
function groupAlertsByAssetClass(alerts: Alert[]): AlertGroup[] {
  const grouped = new Map<string, AlertGroup>();

  for (const alert of alerts) {
    const { id, name } = getAssetClassInfo(alert);

    if (!grouped.has(id)) {
      grouped.set(id, {
        assetClassId: id,
        assetClassName: name,
        alerts: [],
        totalCount: 0,
      });
    }

    const group = grouped.get(id)!;
    group.alerts.push(alert);
    group.totalCount++;
  }

  // Sort groups alphabetically by name, with "Other Alerts" at the end
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.assetClassId === "other") return 1;
    if (b.assetClassId === "other") return -1;
    return a.assetClassName.localeCompare(b.assetClassName);
  });
}

/**
 * Check if alert is currently snoozed
 */
function isAlertSnoozed(alert: Alert): boolean {
  if (!alert.snoozedUntil) return false;
  return new Date(alert.snoozedUntil) > new Date();
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AlertsListClient() {
  const router = useRouter();
  const { formatDateTime } = useNumberFormat();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [snoozing, setSnoozing] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  // Story 7.8: AC-7.8.1 - Track bulk dismissing groups
  const [bulkDismissing, setBulkDismissing] = useState<string | null>(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState<string | null>(null);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`/api/alerts?limit=${MAX_ALERTS_FETCH}&isDismissed=false`);
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const result: AlertsResponse = await response.json();
      setAlerts(result.data);
    } catch (_error) {
      // Show user-friendly error feedback
      toast.error("Failed to load alerts. Please try again.");
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Group alerts by asset class
  const alertGroups = useMemo(() => {
    // Filter out snoozed alerts from display
    const visibleAlerts = alerts.filter((a) => !isAlertSnoozed(a));
    return groupAlertsByAssetClass(visibleAlerts);
  }, [alerts]);

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Expand all groups by default on first load
  useEffect(() => {
    if (alertGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(alertGroups.map((g) => g.assetClassId)));
    }
  }, [alertGroups, expandedGroups.size]);

  /**
   * AC-7.6.5: Snooze alert for 24 hours
   */
  const handleSnooze = useCallback(async (alertId: string) => {
    setSnoozing(alertId);
    try {
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + SNOOZE_DURATION_HOURS);

      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozedUntil: snoozedUntil.toISOString() }),
      });

      if (!response.ok) throw new Error("Failed to snooze alert");

      // Update local state
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, snoozedUntil: snoozedUntil.toISOString() } : a))
      );
    } catch (_error) {
      // Show user-friendly error feedback
      toast.error("Failed to snooze alert. Please try again.");
    } finally {
      setSnoozing(null);
    }
  }, []);

  /**
   * Dismiss alert
   */
  const handleDismiss = useCallback(async (alertId: string) => {
    setDismissing(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDismissed: true }),
      });

      if (!response.ok) throw new Error("Failed to dismiss alert");

      // Remove from local state
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (_error) {
      // Show user-friendly error feedback
      toast.error("Failed to dismiss alert. Please try again.");
    } finally {
      setDismissing(null);
    }
  }, []);

  /**
   * Story 7.8: AC-7.8.1 - Dismiss all alerts in a group
   */
  const handleBulkDismiss = useCallback(
    async (groupId: string) => {
      // Find the group and get all alert IDs
      const group = alertGroups.find((g) => g.assetClassId === groupId);
      if (!group || group.alerts.length === 0) return;

      const alertIds = group.alerts.map((a) => a.id);

      setBulkDismissing(groupId);
      setShowDismissConfirm(null);

      try {
        const response = await fetch("/api/alerts/bulk-dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertIds }),
        });

        if (!response.ok) throw new Error("Failed to dismiss alerts");

        const result = await response.json();

        // Remove dismissed alerts from local state
        setAlerts((prev) => prev.filter((a) => !alertIds.includes(a.id)));

        // Show success toast with count
        const dismissedCount = result.data?.dismissedCount ?? alertIds.length;
        toast.success(`${dismissedCount} alert${dismissedCount !== 1 ? "s" : ""} dismissed`);
      } catch (_error) {
        toast.error("Failed to dismiss alerts. Please try again.");
      } finally {
        setBulkDismissing(null);
      }
    },
    [alertGroups]
  );

  /**
   * AC-7.6.2: Handle alert click navigation
   */
  const handleAlertClick = useCallback(
    (alert: Alert) => {
      if (alert.type === "opportunity") {
        const metadata = alert.metadata as OpportunityAlertMetadata;
        if (metadata?.currentAssetId) {
          router.push(`/portfolio?highlightAsset=${metadata.currentAssetId}`);
        }
      } else if (alert.type === "allocation_drift") {
        const metadata = alert.metadata as DriftAlertMetadata;
        if (metadata?.assetClassId) {
          router.push(`/portfolio?highlightClass=${metadata.assetClassId}`);
        }
      }
    },
    [router]
  );

  // Get icon for alert type
  const getAlertIcon = (type: Alert["type"], severity: Alert["severity"]) => {
    switch (type) {
      case "opportunity":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "allocation_drift":
        if (severity === "critical") {
          return <AlertOctagon className="h-4 w-4 text-red-500" />;
        }
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (alertGroups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyAlerts />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with settings link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>{alerts.filter((a) => !isAlertSnoozed(a)).length} active alerts</span>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Alert Settings
          </Link>
        </Button>
      </div>

      {/* Grouped alerts */}
      <div className="space-y-4">
        {alertGroups.map((group) => (
          <Card key={group.assetClassId} data-testid={`alert-group-${group.assetClassId}`}>
            <Collapsible
              open={expandedGroups.has(group.assetClassId)}
              onOpenChange={() => toggleGroup(group.assetClassId)}
            >
              <CardHeader className="py-4">
                <CardTitle className="flex items-center justify-between text-base font-medium">
                  <CollapsibleTrigger className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded transition-colors p-1 -m-1">
                    {expandedGroups.has(group.assetClassId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{group.assetClassName}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({group.totalCount} alert{group.totalCount !== 1 ? "s" : ""})
                    </span>
                  </CollapsibleTrigger>
                  {/* Story 7.8: AC-7.8.1 - Dismiss All button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDismissConfirm(group.assetClassId);
                    }}
                    disabled={bulkDismissing === group.assetClassId}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid={`dismiss-all-${group.assetClassId}`}
                  >
                    {bulkDismissing === group.assetClassId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Dismiss All
                  </Button>
                </CardTitle>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {group.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "flex items-start gap-4 py-4 first:pt-0 last:pb-0",
                          !alert.isRead && "bg-muted/30 -mx-6 px-6",
                          alert.severity === "critical" && "border-l-2 border-l-red-500"
                        )}
                        data-testid={`alert-item-${alert.id}`}
                      >
                        {/* Alert icon */}
                        <div className="mt-1">{getAlertIcon(alert.type, alert.severity)}</div>

                        {/* Alert content (clickable) */}
                        <button
                          type="button"
                          onClick={() => handleAlertClick(alert)}
                          className="flex-1 text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                        >
                          <p className={cn("text-sm", !alert.isRead && "font-medium")}>
                            {alert.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDateTime(new Date(alert.createdAt))}
                          </p>
                        </button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {/* AC-7.6.5: Snooze button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSnooze(alert.id);
                            }}
                            disabled={snoozing === alert.id}
                            title="Snooze for 24 hours"
                            data-testid={`snooze-alert-${alert.id}`}
                          >
                            {snoozing === alert.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlarmClock className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Dismiss button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(alert.id);
                            }}
                            disabled={dismissing === alert.id}
                            title="Dismiss alert"
                            data-testid={`dismiss-alert-${alert.id}`}
                          >
                            {dismissing === alert.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Story 7.8: AC-7.8.1 - Confirmation dialog for bulk dismiss */}
      <AlertDialog
        open={showDismissConfirm !== null}
        onOpenChange={(open) => !open && setShowDismissConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss all alerts in this group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will dismiss{" "}
              {alertGroups.find((g) => g.assetClassId === showDismissConfirm)?.totalCount ?? 0}{" "}
              alert
              {(alertGroups.find((g) => g.assetClassId === showDismissConfirm)?.totalCount ?? 0) !==
              1
                ? "s"
                : ""}{" "}
              in the{" "}
              <strong>
                {alertGroups.find((g) => g.assetClassId === showDismissConfirm)?.assetClassName}
              </strong>{" "}
              category. Dismissed alerts will not reappear unless the score difference increases
              significantly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDismissConfirm && handleBulkDismiss(showDismissConfirm)}
            >
              Dismiss All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
