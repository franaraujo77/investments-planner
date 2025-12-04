"use client";

/**
 * Export Data Section Component
 *
 * Story 2.7: Data Export
 *
 * Client component that allows users to export all their data as a ZIP file.
 *
 * AC-2.7.1: "Export My Data" button on Settings page
 * AC-2.7.5: Progress indicator shows during generation, button disabled during export
 */

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Export Data Section
 *
 * Displays a card with export functionality for user data.
 * Handles the export flow including loading state and download trigger.
 */
export function ExportDataSection() {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Handles the export process
   *
   * AC-2.7.2: Downloads ZIP with portfolio.json, criteria.json, history.json, README.txt
   * AC-2.7.5: Shows loading state during export, disables button
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/export");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investments-planner-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Export downloaded successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-2">Export Your Data</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Download a copy of all your data including portfolios, scoring criteria, and investment
        history. The export will be in JSON format for easy backup and analysis.
      </p>

      <Button
        onClick={handleExport}
        disabled={isExporting}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export My Data
          </>
        )}
      </Button>
    </div>
  );
}
