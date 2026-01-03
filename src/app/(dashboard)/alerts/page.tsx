import { Metadata } from "next";
import { AlertsListClient } from "@/components/alerts/alerts-list-client";

export const metadata: Metadata = {
  title: "Alerts",
  description: "View and manage your portfolio alerts",
};

/**
 * Alerts List Page
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.5: Alert grouping by asset class
 *
 * Server component that renders the alerts list.
 * Uses AlertsListClient for client-side interactivity (grouping, snooze, dismiss).
 */
export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Alerts</h1>
        <p className="text-muted-foreground">View and manage alerts for your portfolio.</p>
      </div>

      <AlertsListClient />
    </div>
  );
}
