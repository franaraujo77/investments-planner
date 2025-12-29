"use client";

/**
 * Holdings Table Component
 *
 * Story 2.2: View Portfolio and Holdings
 *
 * AC-2.2.1: Display columns: Asset Symbol, Name, Quantity, Current Price, Value (native), Value (base), Allocation %
 * AC-2.2.2: Use useNumberFormat() hook for i18n formatting
 * AC-2.2.4: Row click opens holding detail drawer
 */

import { useMemo, useState, useCallback } from "react";
import { ArrowUpDown, Clock, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { formatRelativeTime, getFreshnessStatus } from "@/lib/types/freshness";
import type { AssetWithValue } from "@/lib/services/portfolio-service";

interface HoldingsTableProps {
  assets: AssetWithValue[];
  baseCurrency: string;
  onHoldingClick: (holding: AssetWithValue) => void;
}

type SortKey = "symbol" | "name" | "quantity" | "price" | "valueBase" | "allocation";
type SortDirection = "asc" | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export function HoldingsTable({ assets, baseCurrency, onHoldingClick }: HoldingsTableProps) {
  const { formatNumber, formatCurrency, formatPercent } = useNumberFormat();

  // Task 2.4: Sort by allocation % descending by default
  const [sortState, setSortState] = useState<SortState>({
    key: "allocation",
    direction: "desc",
  });

  // Handle sort toggle
  const handleSort = useCallback((key: SortKey) => {
    setSortState((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Sort assets
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      let comparison = 0;

      switch (sortState.key) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "name":
          comparison = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "quantity":
          comparison = parseFloat(a.quantity) - parseFloat(b.quantity);
          break;
        case "price":
          comparison = parseFloat(a.currentPrice) - parseFloat(b.currentPrice);
          break;
        case "valueBase":
          comparison = parseFloat(a.valueBase) - parseFloat(b.valueBase);
          break;
        case "allocation":
          comparison = parseFloat(a.allocationPercent) - parseFloat(b.allocationPercent);
          break;
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [assets, sortState]);

  return (
    <div className="space-y-4" data-testid="holdings-table">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <span className="text-sm text-muted-foreground">
          {assets.length} {assets.length === 1 ? "asset" : "assets"}
        </span>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Symbol"
                sortKey="symbol"
                currentSort={sortState}
                onSort={handleSort}
              />
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSort={sortState}
                onSort={handleSort}
              />
              <SortableHeader
                label="Quantity"
                sortKey="quantity"
                currentSort={sortState}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Current Price"
                sortKey="price"
                currentSort={sortState}
                onSort={handleSort}
                className="text-right"
              />
              <TableHead className="text-right">Value (Native)</TableHead>
              <SortableHeader
                label={`Value (${baseCurrency})`}
                sortKey="valueBase"
                currentSort={sortState}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Allocation"
                sortKey="allocation"
                currentSort={sortState}
                onSort={handleSort}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssets.map((asset) => (
              <HoldingRow
                key={asset.id}
                asset={asset}
                baseCurrency={baseCurrency}
                onClick={() => onHoldingClick(asset)}
                formatNumber={formatNumber}
                formatCurrency={formatCurrency}
                formatPercent={formatPercent}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortableHeader({ label, sortKey, currentSort, onSort, className }: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=active]:font-bold"
        onClick={() => onSort(sortKey)}
        data-state={isActive ? "active" : "inactive"}
      >
        {label}
        <ArrowUpDown className="ml-1 h-3 w-3" />
        {direction && (
          <span className="sr-only">
            (sorted {direction === "asc" ? "ascending" : "descending"})
          </span>
        )}
      </Button>
    </TableHead>
  );
}

interface HoldingRowProps {
  asset: AssetWithValue;
  baseCurrency: string;
  onClick: () => void;
  formatNumber: (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
  ) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatPercent: (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
  ) => string;
}

function HoldingRow({
  asset,
  baseCurrency,
  onClick,
  formatNumber,
  formatCurrency,
  formatPercent,
}: HoldingRowProps) {
  const isIgnored = asset.isIgnored;
  const needsConversion = asset.currency !== baseCurrency;

  // Calculate data freshness for this asset - use canonical freshness thresholds
  const freshnessStatus = getFreshnessStatus(new Date(asset.priceUpdatedAt));
  const isFresh = freshnessStatus === "fresh";

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${isIgnored ? "opacity-60" : ""}`}
      onClick={onClick}
      data-testid="holding-row"
      data-symbol={asset.symbol}
    >
      {/* Symbol */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className={isIgnored ? "line-through text-muted-foreground" : ""}>
            {asset.symbol}
          </span>
          {isIgnored && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs gap-1">
                  <EyeOff className="h-3 w-3" />
                  Ignored
                </Badge>
              </TooltipTrigger>
              <TooltipContent>This asset is excluded from allocation calculations</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Name */}
      <TableCell className="text-muted-foreground">{asset.name || "-"}</TableCell>

      {/* Quantity - Task 2.3: Use useNumberFormat */}
      <TableCell className="text-right font-mono">
        {formatNumber(parseFloat(asset.quantity), {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8,
        })}
      </TableCell>

      {/* Current Price - Task 2.3: Use useNumberFormat */}
      <TableCell className="text-right font-mono">
        <div className="flex items-center justify-end gap-1">
          {formatCurrency(parseFloat(asset.currentPrice), asset.currency)}
          {/* Task 2.6: Data freshness indicator */}
          {!isFresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Clock className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                Price last updated: {formatRelativeTime(new Date(asset.priceUpdatedAt))}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Value (Native Currency) */}
      <TableCell className="text-right font-mono">
        {formatCurrency(parseFloat(asset.valueNative), asset.currency)}
      </TableCell>

      {/* Value (Base Currency) - with exchange rate tooltip if different currency */}
      <TableCell className="text-right font-mono font-medium">
        {needsConversion ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                {formatCurrency(parseFloat(asset.valueBase), baseCurrency)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                Exchange rate: 1 {asset.currency} = {parseFloat(asset.exchangeRate).toFixed(4)}{" "}
                {baseCurrency}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          formatCurrency(parseFloat(asset.valueBase), baseCurrency)
        )}
      </TableCell>

      {/* Allocation % - Task 2.3: Use useNumberFormat */}
      <TableCell className="text-right">
        {isIgnored ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          formatPercent(parseFloat(asset.allocationPercent) / 100)
        )}
      </TableCell>
    </TableRow>
  );
}
