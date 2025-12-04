"use client";

/**
 * History Page Client Component
 *
 * Story 3.9: Investment History View
 *
 * Handles client-side interactivity for history page:
 * - Date range filtering (AC-3.9.5)
 * - Timeline display (AC-3.9.1, AC-3.9.2)
 * - CSV export (AC-3.9.4)
 * - Empty state (AC-3.9.6)
 */

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { History, FileSpreadsheet, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvestmentTimeline } from "@/components/portfolio/investment-timeline";
import { DateRangeFilter, type DateRange } from "@/components/portfolio/date-range-filter";
import { useInvestmentHistory } from "@/hooks/use-investments";
import type { Investment } from "@/lib/db/schema";
import { exportInvestmentsToCSV, downloadCSV } from "@/lib/services/csv-export";

interface HistoryPageClientProps {
  initialHistory: Investment[];
}

export function HistoryPageClient({ initialHistory }: HistoryPageClientProps) {
  const [dateRange, setDateRange] = useState<DateRange>({});
  const { investments: filteredInvestments, isLoading, fetchHistory } = useInvestmentHistory();

  // Use initial history on first render, then filtered results
  const investments = useMemo(() => {
    // If we have a date filter applied and loaded filtered data, use it
    if ((dateRange.from || dateRange.to) && !isLoading) {
      return filteredInvestments;
    }
    // Otherwise use initial data from server
    return initialHistory;
  }, [dateRange, filteredInvestments, isLoading, initialHistory]);

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range);
      // Fetch filtered data - only pass defined values
      const options: { from?: Date; to?: Date } = {};
      if (range.from) options.from = range.from;
      if (range.to) options.to = range.to;
      fetchHistory(options);
    },
    [fetchHistory]
  );

  // Handle CSV export
  const handleExport = useCallback(() => {
    if (investments.length === 0) return;

    const csvContent = exportInvestmentsToCSV(investments);
    const today = new Date().toISOString().split("T")[0];
    const filename = `investment-history-${today}.csv`;
    downloadCSV(csvContent, filename);
  }, [investments]);

  // Empty state - AC-3.9.6
  if (initialHistory.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <History className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No investments recorded yet</h2>
          <p className="mt-2 text-center text-muted-foreground max-w-md">
            Your investment history will appear here after you record your first investment in your
            portfolio.
          </p>
          <Button asChild className="mt-6">
            <Link href="/portfolio">Record your first investment</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={investments.length === 0}
          className="flex items-center gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {/* Timeline Display */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              <span className="text-muted-foreground">Loading investments...</span>
            </div>
          </CardContent>
        </Card>
      ) : investments.length > 0 ? (
        <InvestmentTimeline investments={investments} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-medium">No investments in selected range</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your date filter to see more results.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => handleDateRangeChange({})}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary info */}
      {investments.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {investments.length} investment{investments.length !== 1 ? "s" : ""}
          {dateRange.from || dateRange.to ? " in selected date range" : ""}
        </p>
      )}
    </div>
  );
}
