"use client";

/**
 * Investment History Filters Component
 *
 * Story 2.8: Investment History
 *
 * AC-2.8.4: History Filtering
 * - Date range (from/to date pickers)
 * - Asset class (dropdown)
 * - Specific asset (dropdown with search)
 * - Filters are applied immediately without page reload
 *
 * AC-2.8.6: Regional Number Formatting
 * - Dates display in user's locale format
 */

import { useCallback } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, type DateRange } from "./date-range-filter";
import { Badge } from "@/components/ui/badge";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import type { InvestmentFilters } from "./investment-history-tab";

interface InvestmentHistoryFiltersProps {
  /** Current filter state */
  filters: InvestmentFilters;
  /** Callback when filters change */
  onChange: (filters: InvestmentFilters) => void;
  /** Available asset classes for filtering */
  availableAssetClasses?: string[];
  /** Available assets for autocomplete filtering */
  availableAssets?: Array<{ id: string; symbol: string; name?: string | null }>;
}

export function InvestmentHistoryFilters({
  filters,
  onChange,
  availableAssetClasses = [],
  availableAssets = [],
}: InvestmentHistoryFiltersProps) {
  // AC-2.8.6: Use locale-aware date formatting
  const { formatDate } = useNumberFormat();

  // Count active filters
  const activeFilterCount = [
    filters.from || filters.to,
    filters.assetClass,
    filters.assetId,
  ].filter(Boolean).length;

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      onChange({
        ...filters,
        from: range.from,
        to: range.to,
      });
    },
    [filters, onChange]
  );

  // Handle asset class change
  const handleAssetClassChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        assetClass: value === "all" ? undefined : value,
      });
    },
    [filters, onChange]
  );

  // Handle asset selection
  const handleAssetSelect = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        assetId: value === "all" ? undefined : value,
      });
    },
    [filters, onChange]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  // Clear specific filter
  const handleClearFilter = useCallback(
    (filterKey: keyof InvestmentFilters) => {
      const newFilters = { ...filters };
      if (filterKey === "from" || filterKey === "to") {
        delete newFilters.from;
        delete newFilters.to;
      } else {
        delete newFilters[filterKey];
      }
      onChange(newFilters);
    },
    [filters, onChange]
  );

  // Get selected asset details
  const selectedAsset = filters.assetId
    ? availableAssets.find((a) => a.id === filters.assetId)
    : null;

  return (
    <div className="space-y-4" data-testid="investment-history-filters">
      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          value={buildDateRange(filters.from, filters.to)}
          onChange={handleDateRangeChange}
        />

        {/* Asset Class Filter */}
        {availableAssetClasses.length > 0 && (
          <Select value={filters.assetClass ?? "all"} onValueChange={handleAssetClassChange}>
            <SelectTrigger className="w-[160px]" data-testid="asset-class-filter">
              <SelectValue placeholder="Asset Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableAssetClasses.map((assetClass) => (
                <SelectItem key={assetClass} value={assetClass}>
                  {assetClass}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Asset Filter (simplified dropdown) */}
        {availableAssets.length > 0 && (
          <Select value={filters.assetId ?? "all"} onValueChange={handleAssetSelect}>
            <SelectTrigger className="w-[200px]" data-testid="asset-filter">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {availableAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.symbol}
                  {asset.name && ` - ${asset.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear All Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-foreground"
            data-testid="clear-all-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {(filters.from || filters.to) && (
            <Badge variant="outline" className="gap-1 pr-1" data-testid="date-filter-badge">
              <span>
                {filters.from && filters.to
                  ? `${formatDate(filters.from, { dateStyle: "short" })} - ${formatDate(filters.to, { dateStyle: "short" })}`
                  : filters.from
                    ? `From ${formatDate(filters.from, { dateStyle: "short" })}`
                    : `Until ${formatDate(filters.to!, { dateStyle: "short" })}`}
              </span>
              <button
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
                onClick={() => handleClearFilter("from")}
                aria-label="Clear date filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.assetClass && (
            <Badge variant="outline" className="gap-1 pr-1" data-testid="asset-class-filter-badge">
              <span>Class: {filters.assetClass}</span>
              <button
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
                onClick={() => handleClearFilter("assetClass")}
                aria-label="Clear asset class filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {selectedAsset && (
            <Badge variant="outline" className="gap-1 pr-1" data-testid="asset-filter-badge">
              <span>Asset: {selectedAsset.symbol}</span>
              <button
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
                onClick={() => handleClearFilter("assetId")}
                aria-label="Clear asset filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Build a DateRange object compatible with exactOptionalPropertyTypes
 */
function buildDateRange(from: Date | undefined, to: Date | undefined): DateRange {
  const result: DateRange = {};
  if (from) result.from = from;
  if (to) result.to = to;
  return result;
}
