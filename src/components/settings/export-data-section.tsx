"use client";

/**
 * Export Data Section Component
 *
 * Story 2.7: Data Export
 * Story 1.6: GDPR Compliance - AC-1.6.1, AC-1.6.2
 *
 * Client component that allows users to request their data export.
 * Export is generated asynchronously and sent via email.
 *
 * AC-1.6.1: Request export, receive email with download link (within 24h)
 * AC-1.6.2: Export contains all user data in JSON format
 */

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Export Data Section
 *
 * Displays a card with export request functionality for user data.
 * Handles the export request flow including loading state.
 */
export function ExportDataSection() {
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * Handles the export request
   *
   * Story 1.6: GDPR Compliance
   * AC-1.6.1: Request queued, email sent when ready
   * Rate limited to 1 request per 24 hours
   */
  const handleExportRequest = async () => {
    setIsRequesting(true);
    try {
      const response = await fetch("/api/user/export", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Export request failed");
      }

      toast.success("Export request received! You'll receive an email with your download link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request export");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-2">Export Your Data</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Request a copy of all your data including your profile, portfolios, scoring criteria, and
        investment history. The export will be generated and you&apos;ll receive an email with a
        download link within 24 hours.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Note: You can request one export every 24 hours. The download link expires after 24 hours.
      </p>

      <Button
        onClick={handleExportRequest}
        disabled={isRequesting}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {isRequesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Request Data Export
          </>
        )}
      </Button>
    </div>
  );
}
