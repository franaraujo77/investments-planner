"use client";

/**
 * Alert Preferences Section Component
 *
 * Story 9.3: Alert Preferences
 *
 * Client component that allows users to configure their alert notification preferences.
 *
 * AC-9.3.1: Toggle opportunity alerts
 * AC-9.3.2: Toggle drift alerts
 * AC-9.3.3: Configure drift threshold (1-20%)
 * AC-9.3.4: Select alert frequency (realtime/daily/weekly)
 * AC-9.3.5: Toggle email notifications
 * AC-9.3.7: Accessible UI with auto-save and visual feedback
 */

import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, Check, TrendingUp, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// =============================================================================
// TYPES
// =============================================================================

interface AlertPreferences {
  id: string;
  userId: string;
  opportunityAlertsEnabled: boolean;
  driftAlertsEnabled: boolean;
  driftThreshold: string;
  alertFrequency: "realtime" | "daily" | "weekly";
  emailNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

type PreferenceUpdate = Partial<
  Pick<
    AlertPreferences,
    | "opportunityAlertsEnabled"
    | "driftAlertsEnabled"
    | "driftThreshold"
    | "alertFrequency"
    | "emailNotifications"
  >
>;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Alert Preferences Section
 *
 * Displays a card with all alert preference settings.
 * Handles loading, optimistic updates, and error states.
 */
export function AlertPreferencesSection() {
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  /**
   * Fetches alert preferences from API
   */
  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/user/alert-preferences");

      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }

      const { data } = await response.json();
      setPreferences(data);
    } catch {
      toast.error("Failed to load alert preferences");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates a preference value
   *
   * Uses optimistic updates for immediate UI feedback.
   * Reverts on error and shows toast notification.
   */
  const updatePreference = useCallback(
    async (updates: PreferenceUpdate) => {
      if (!preferences) return;

      // Store previous state for rollback
      const previousPreferences = { ...preferences };

      // Optimistic update
      setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
      setIsSaving(true);
      setShowSaved(false);

      try {
        const response = await fetch("/api/user/alert-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to save");
        }

        const { data } = await response.json();
        setPreferences(data);

        // Show saved indicator briefly
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } catch (error) {
        // Rollback on error
        setPreferences(previousPreferences);
        toast.error(error instanceof Error ? error.message : "Failed to save preferences");
      } finally {
        setIsSaving(false);
      }
    },
    [preferences]
  );

  /**
   * Handles drift threshold input with validation
   */
  const handleThresholdChange = (value: string) => {
    // Allow empty for typing
    if (value === "") return;

    const num = parseFloat(value);
    if (isNaN(num)) return;

    // Clamp to valid range
    const clamped = Math.min(Math.max(num, 1), 20);
    const formatted = clamped.toFixed(2);

    updatePreference({ driftThreshold: formatted });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // Error state (no preferences)
  if (!preferences) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Alert Preferences</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Unable to load alert preferences. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Alert Preferences</h2>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {showSaved && !isSaving && (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Saved</span>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Configure how and when you receive alerts about your portfolio.
      </p>

      <div className="space-y-6">
        {/* AC-9.3.1: Opportunity Alerts Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="opportunity-alerts" className="flex items-center gap-2 cursor-pointer">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Opportunity Alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when a better scoring asset exists in the same class
            </p>
          </div>
          <Switch
            id="opportunity-alerts"
            checked={preferences.opportunityAlertsEnabled}
            onCheckedChange={(checked) => updatePreference({ opportunityAlertsEnabled: checked })}
            disabled={isSaving}
            aria-label="Toggle opportunity alerts"
          />
        </div>

        {/* AC-9.3.2: Drift Alerts Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="drift-alerts" className="flex items-center gap-2 cursor-pointer">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Drift Alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when your allocation drifts from your target
            </p>
          </div>
          <Switch
            id="drift-alerts"
            checked={preferences.driftAlertsEnabled}
            onCheckedChange={(checked) => updatePreference({ driftAlertsEnabled: checked })}
            disabled={isSaving}
            aria-label="Toggle drift alerts"
          />
        </div>

        {/* AC-9.3.3: Drift Threshold */}
        <div className="space-y-2">
          <Label htmlFor="drift-threshold">Drift Threshold</Label>
          <p className="text-sm text-muted-foreground">
            Alert when allocation drifts by this percentage (1-20%)
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="drift-threshold"
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={preferences.driftThreshold}
              onChange={(e) => handleThresholdChange(e.target.value)}
              onBlur={(e) => handleThresholdChange(e.target.value)}
              disabled={isSaving || !preferences.driftAlertsEnabled}
              className="w-24"
              aria-label="Drift threshold percentage"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        {/* AC-9.3.4: Alert Frequency */}
        <div className="space-y-2">
          <Label htmlFor="alert-frequency" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Alert Frequency
          </Label>
          <p className="text-sm text-muted-foreground">How often to check for new alerts</p>
          <Select
            value={preferences.alertFrequency}
            onValueChange={(value: "realtime" | "daily" | "weekly") =>
              updatePreference({ alertFrequency: value })
            }
            disabled={isSaving}
          >
            <SelectTrigger id="alert-frequency" className="w-[180px]">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Realtime</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* AC-9.3.5: Email Notifications */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications" className="flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">Receive alerts via email (coming soon)</p>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.emailNotifications}
            onCheckedChange={(checked) => updatePreference({ emailNotifications: checked })}
            disabled={isSaving}
            aria-label="Toggle email notifications"
          />
        </div>
      </div>
    </div>
  );
}
