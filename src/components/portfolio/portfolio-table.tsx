"use client";

/**
 * Portfolio Assets Table Component
 *
 * Story 3.2: Add Asset to Portfolio
 * Story 3.3: Update Asset Holdings
 * Story 3.4: Remove Asset from Portfolio
 * Story 3.5: Mark Asset as Ignored
 * Story 3.6: Portfolio Overview with Values
 * Story 5.10: View Asset Score
 * Story 9.6: Empty States & Helpful Messaging
 *
 * AC-3.2.5: Uses decimal.js for value calculations
 * AC-3.2.6: Displays assets with calculated total value
 * AC-3.3.1: Click on quantity/price field enters edit mode
 * AC-3.3.5: Total value recalculates after update
 * AC-3.4.1: Delete button on each asset row
 * AC-3.4.2: Confirmation dialog before deletion
 * AC-3.5.1: Ignore toggle on each asset row
 * AC-3.5.2: Ignored assets show visual indicator
 * AC-3.6.1: Portfolio table displays value columns
 * AC-3.6.2: Native currency display
 * AC-3.6.3: Base currency conversion
 * AC-3.6.5: Table sorting
 * AC-3.6.6: Table filtering
 * AC-5.10.1: Score badge display in asset rows
 * AC-9.6.2: Empty Assets State messaging
 */

import { useCallback, useMemo, useState } from "react";
import { ArrowUpDown, DollarSign, Search, Trash2 } from "lucide-react";
import { Decimal } from "@/lib/calculations/decimal-config";
import { AddAssetModal } from "./add-asset-modal";
import { EditableCell } from "./editable-cell";
import { DeleteAssetDialog } from "./delete-asset-dialog";
import { InvestmentConfirmationModal } from "./investment-confirmation-modal";
import { useUpdateAsset } from "@/hooks/use-update-asset";
import { useDeleteAsset } from "@/hooks/use-delete-asset";
import { useToggleIgnore } from "@/hooks/use-toggle-ignore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CurrencyDisplay } from "@/components/fintech/currency-display";
import { ScoreBadge } from "@/components/fintech/score-badge";
import { ScoreBreakdown } from "@/components/fintech/score-breakdown";
import { UnscoredIndicator } from "@/components/fintech/unscored-indicator";
import { useAssetScores } from "@/hooks/use-asset-score";
import { useScoreBreakdown } from "@/hooks/use-score-breakdown";
import type { PortfolioAsset, AssetWithValue } from "@/types/portfolio";

// =============================================================================
// PROPS TYPES
// =============================================================================

interface PortfolioTableProps {
  portfolioId: string;
  assets: PortfolioAsset[];
  defaultCurrency?: string;
  onAssetAdded?: () => void;
}

interface PortfolioTableWithValuesProps {
  portfolioId: string;
  assets: AssetWithValue[];
  baseCurrency: string;
  defaultCurrency?: string | undefined;
  onAssetAdded?: (() => void) | undefined;
  onInvestmentRecorded?: (() => void) | undefined;
}

// =============================================================================
// SORTING TYPES
// =============================================================================

type SortDirection = "asc" | "desc";
type SortKey =
  | "symbol"
  | "name"
  | "quantity"
  | "price"
  | "valueNative"
  | "valueBase"
  | "allocation"
  | "score";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format number for display with appropriate decimal places
 */
function formatQuantity(value: string): string {
  const decimal = new Decimal(value);
  const formatted = decimal.toFixed(8);
  return formatted.replace(/\.?0+$/, "");
}

/**
 * Format price for display (2-4 decimal places)
 */
function formatPrice(value: string): string {
  const decimal = new Decimal(value);
  const numValue = decimal.toNumber();
  const decimalPlaces = numValue % 1 === 0 ? 2 : 4;
  return decimal.toFixed(decimalPlaces);
}

/**
 * Calculate total value using decimal.js (CRITICAL: never use JS arithmetic)
 */
function calculateValue(quantity: string, price: string): string {
  const qty = new Decimal(quantity);
  const prc = new Decimal(price);
  return qty.times(prc).toFixed(2);
}

/**
 * Format currency amount for display
 */
function formatCurrency(value: string, currency: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format allocation percentage for display
 */
function formatAllocation(value: string): string {
  const num = parseFloat(value);
  return `${num.toFixed(2)}%`;
}

// =============================================================================
// SORTABLE HEADER
// =============================================================================

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

// =============================================================================
// ASSET ROW COMPONENT (Basic - without values)
// =============================================================================

function AssetRow({
  asset,
  onDeleteClick,
}: {
  asset: PortfolioAsset;
  onDeleteClick: (asset: PortfolioAsset, value: string) => void;
}) {
  const { updateAsset } = useUpdateAsset();
  const { toggleIgnore, isToggling } = useToggleIgnore();
  const value = calculateValue(asset.quantity, asset.purchasePrice);

  const handleQuantitySave = useCallback(
    async (newValue: string): Promise<true | string> => {
      return updateAsset(asset.id, { quantity: newValue });
    },
    [updateAsset, asset.id]
  );

  const handlePriceSave = useCallback(
    async (newValue: string): Promise<true | string> => {
      return updateAsset(asset.id, { purchasePrice: newValue });
    },
    [updateAsset, asset.id]
  );

  const handleDeleteClick = useCallback(() => {
    onDeleteClick(asset, value);
  }, [asset, value, onDeleteClick]);

  const handleIgnoreToggle = useCallback(async () => {
    await toggleIgnore(asset.id);
  }, [toggleIgnore, asset.id]);

  const ignoredClass = asset.isIgnored ? "text-muted-foreground" : "";

  return (
    <TableRow className={asset.isIgnored ? "opacity-60" : ""}>
      <TableCell className={`font-medium ${ignoredClass}`}>
        <div className="flex items-center gap-2">
          <span className={asset.isIgnored ? "line-through" : ""}>{asset.symbol}</span>
          {asset.isIgnored && (
            <Badge variant="secondary" className="text-xs">
              Ignored
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{asset.name || "-"}</TableCell>
      <TableCell className={`text-right ${ignoredClass}`}>
        <EditableCell
          value={asset.quantity}
          onSave={handleQuantitySave}
          type="quantity"
          formatDisplay={formatQuantity}
          testId={`quantity-${asset.symbol}`}
        />
      </TableCell>
      <TableCell className={`text-right ${ignoredClass}`}>
        <EditableCell
          value={asset.purchasePrice}
          onSave={handlePriceSave}
          type="price"
          formatDisplay={formatPrice}
          testId={`price-${asset.symbol}`}
        />
      </TableCell>
      <TableCell className={`text-right font-mono font-medium ${ignoredClass}`}>
        {formatCurrency(value, asset.currency)}
      </TableCell>
      <TableCell className={ignoredClass}>{asset.currency}</TableCell>
      <TableCell className="w-20">
        <Switch
          checked={asset.isIgnored ?? false}
          onCheckedChange={handleIgnoreToggle}
          disabled={isToggling}
          data-testid={`ignore-${asset.symbol}`}
          aria-label={`${asset.isIgnored ? "Restore" : "Ignore"} ${asset.symbol}`}
        />
      </TableCell>
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDeleteClick}
          data-testid={`delete-${asset.symbol}`}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete {asset.symbol}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// ASSET ROW WITH VALUES COMPONENT (Story 3.6)
// =============================================================================

function AssetRowWithValues({
  asset,
  baseCurrency,
  onDeleteClick,
  onInvestmentRecorded,
  scoreData,
  unscoredReason,
  onScoreClick,
}: {
  asset: AssetWithValue;
  baseCurrency: string;
  onDeleteClick: (asset: AssetWithValue, value: string) => void;
  onInvestmentRecorded?: (() => void) | undefined;
  scoreData?: {
    score: string;
    calculatedAt: Date;
    breakdown: { matched: boolean }[];
  } | null;
  unscoredReason?: { code: string; message: string } | null;
  onScoreClick?: (assetId: string) => void;
}) {
  const { updateAsset } = useUpdateAsset();
  const { toggleIgnore, isToggling } = useToggleIgnore();

  const handleQuantitySave = useCallback(
    async (newValue: string): Promise<true | string> => {
      return updateAsset(asset.id, { quantity: newValue });
    },
    [updateAsset, asset.id]
  );

  const handlePriceSave = useCallback(
    async (newValue: string): Promise<true | string> => {
      return updateAsset(asset.id, { purchasePrice: newValue });
    },
    [updateAsset, asset.id]
  );

  const handleDeleteClick = useCallback(() => {
    onDeleteClick(asset, asset.valueBase);
  }, [asset, onDeleteClick]);

  const handleIgnoreToggle = useCallback(async () => {
    await toggleIgnore(asset.id);
  }, [toggleIgnore, asset.id]);

  const ignoredClass = asset.isIgnored ? "text-muted-foreground" : "";
  const needsConversion = asset.currency !== baseCurrency;

  return (
    <TableRow className={asset.isIgnored ? "opacity-60" : ""}>
      {/* Symbol */}
      <TableCell className={`font-medium ${ignoredClass}`}>
        <div className="flex items-center gap-2">
          <span className={asset.isIgnored ? "line-through" : ""}>{asset.symbol}</span>
          {asset.isIgnored && (
            <Badge variant="secondary" className="text-xs">
              Ignored
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Name */}
      <TableCell className="text-muted-foreground">{asset.name || "-"}</TableCell>

      {/* Quantity (editable) */}
      <TableCell className={`text-right ${ignoredClass}`}>
        <EditableCell
          value={asset.quantity}
          onSave={handleQuantitySave}
          type="quantity"
          formatDisplay={formatQuantity}
          testId={`quantity-${asset.symbol}`}
        />
      </TableCell>

      {/* Current Price */}
      <TableCell className={`text-right ${ignoredClass}`}>
        <EditableCell
          value={asset.purchasePrice}
          onSave={handlePriceSave}
          type="price"
          formatDisplay={formatPrice}
          testId={`price-${asset.symbol}`}
        />
      </TableCell>

      {/* Value (Native Currency) - AC-3.6.2 */}
      <TableCell className={`text-right font-mono ${ignoredClass}`}>
        <CurrencyDisplay value={asset.valueNative} currency={asset.currency} size="sm" />
      </TableCell>

      {/* Value (Base Currency) - AC-3.6.3 */}
      <TableCell className={`text-right font-mono font-medium ${ignoredClass}`}>
        {needsConversion ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                <CurrencyDisplay value={asset.valueBase} currency={baseCurrency} size="sm" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div>
                  Exchange rate: 1 {asset.currency} = {parseFloat(asset.exchangeRate).toFixed(4)}{" "}
                  {baseCurrency}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <CurrencyDisplay value={asset.valueBase} currency={baseCurrency} size="sm" />
        )}
      </TableCell>

      {/* Allocation % */}
      <TableCell className={`text-right ${ignoredClass}`}>
        {asset.isIgnored ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          formatAllocation(asset.allocationPercent)
        )}
      </TableCell>

      {/* Score - Story 5.10, AC-5.10.1 */}
      <TableCell className="text-center">
        {scoreData ? (
          <ScoreBadge
            score={scoreData.score}
            calculatedAt={scoreData.calculatedAt}
            criteriaMatched={{
              matched: scoreData.breakdown.filter((b) => b.matched).length,
              total: scoreData.breakdown.length,
            }}
            assetId={asset.id}
            onClick={onScoreClick ? () => onScoreClick(asset.id) : undefined}
            size="sm"
          />
        ) : unscoredReason ? (
          <UnscoredIndicator
            reason={{
              code: unscoredReason.code as
                | "NO_CRITERIA"
                | "MISSING_FUNDAMENTALS"
                | "NOT_CALCULATED",
              message: unscoredReason.message,
            }}
            assetId={asset.id}
            size="sm"
          />
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>

      {/* Ignore Toggle */}
      <TableCell className="w-20">
        <Switch
          checked={asset.isIgnored ?? false}
          onCheckedChange={handleIgnoreToggle}
          disabled={isToggling}
          data-testid={`ignore-${asset.symbol}`}
          aria-label={`${asset.isIgnored ? "Restore" : "Ignore"} ${asset.symbol}`}
        />
      </TableCell>

      {/* Record Investment Button - Story 3.8 */}
      <TableCell className="w-10">
        <InvestmentConfirmationModal
          portfolioId={asset.portfolioId}
          assetId={asset.id}
          symbol={asset.symbol}
          assetName={asset.name ?? undefined}
          defaultCurrency={asset.currency}
          onSuccess={onInvestmentRecorded}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              data-testid={`invest-${asset.symbol}`}
            >
              <DollarSign className="h-4 w-4" />
              <span className="sr-only">Record investment for {asset.symbol}</span>
            </Button>
          }
        />
      </TableCell>

      {/* Delete Button */}
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDeleteClick}
          data-testid={`delete-${asset.symbol}`}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete {asset.symbol}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// DELETION TYPES
// =============================================================================

interface AssetForDeletion {
  id: string;
  symbol: string;
  value: string;
  currency: string;
}

// =============================================================================
// BASIC PORTFOLIO TABLE (backward compatible)
// =============================================================================

export function PortfolioTable({
  portfolioId,
  assets,
  defaultCurrency = "USD",
  onAssetAdded,
}: PortfolioTableProps) {
  const { deleteAsset, isDeleting } = useDeleteAsset();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetForDeletion | null>(null);

  const handleDeleteClick = useCallback((asset: PortfolioAsset, value: string) => {
    setAssetToDelete({
      id: asset.id,
      symbol: asset.symbol,
      value,
      currency: asset.currency,
    });
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!assetToDelete) return;

    const result = await deleteAsset(assetToDelete.id);
    if (result === true) {
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  }, [assetToDelete, deleteAsset]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setAssetToDelete(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Assets</h3>
        <AddAssetModal
          portfolioId={portfolioId}
          defaultCurrency={defaultCurrency}
          onSuccess={onAssetAdded}
        />
      </div>

      {assets.length === 0 ? (
        /* AC-9.6.2: Empty Assets State messaging */
        <div className="text-center py-8 text-muted-foreground" data-testid="empty-assets-inline">
          <p className="font-medium text-foreground">Your portfolio is empty</p>
          <p className="text-sm mt-1">Add assets to get personalized investment recommendations.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="w-20">Ignore</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} onDeleteClick={handleDeleteClick} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteAssetDialog
        asset={assetToDelete}
        open={deleteDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}

// =============================================================================
// ENHANCED PORTFOLIO TABLE WITH VALUES (Story 3.6)
// =============================================================================

export function PortfolioTableWithValues({
  portfolioId,
  assets,
  baseCurrency,
  defaultCurrency = "USD",
  onAssetAdded,
  onInvestmentRecorded,
}: PortfolioTableWithValuesProps) {
  const { deleteAsset, isDeleting } = useDeleteAsset();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetForDeletion | null>(null);

  // Story 5.10: Fetch scores for all assets
  const assetIds = useMemo(() => assets.map((a) => a.id), [assets]);
  const { scores, unscoredReasons } = useAssetScores(assetIds, { enabled: assets.length > 0 });

  // Story 5.11: Score breakdown panel state
  const [breakdownAssetId, setBreakdownAssetId] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const { breakdown: breakdownData } = useScoreBreakdown(breakdownAssetId, {
    enabled: breakdownOpen,
  });

  // Get the asset info for the breakdown panel
  const breakdownAsset = useMemo(() => {
    if (!breakdownAssetId) return null;
    return assets.find((a) => a.id === breakdownAssetId) ?? null;
  }, [breakdownAssetId, assets]);

  // Handle score badge click - opens breakdown panel (AC-5.11.1)
  const handleScoreClick = useCallback((assetId: string) => {
    setBreakdownAssetId(assetId);
    setBreakdownOpen(true);
  }, []);

  // Handle breakdown panel close
  const handleBreakdownClose = useCallback((open: boolean) => {
    setBreakdownOpen(open);
    if (!open) {
      // Delay clearing the asset ID to allow animation to complete
      setTimeout(() => setBreakdownAssetId(null), 300);
    }
  }, []);

  // AC-3.6.6: Search/filter state
  const [searchQuery, setSearchQuery] = useState("");

  // AC-3.6.5: Sorting state
  const [sortState, setSortState] = useState<SortState>({
    key: "symbol",
    direction: "asc",
  });

  // Handle sort toggle
  const handleSort = useCallback((key: SortKey) => {
    setSortState((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    // First filter by search query (AC-3.6.6)
    let result = assets;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = assets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query) ||
          (asset.name?.toLowerCase().includes(query) ?? false)
      );
    }

    // Then sort (AC-3.6.5)
    const sorted = [...result].sort((a, b) => {
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
        case "valueNative":
          comparison = parseFloat(a.valueNative) - parseFloat(b.valueNative);
          break;
        case "valueBase":
          comparison = parseFloat(a.valueBase) - parseFloat(b.valueBase);
          break;
        case "allocation":
          comparison = parseFloat(a.allocationPercent) - parseFloat(b.allocationPercent);
          break;
        case "score": {
          // Story 5.10: Sort by score, unscored assets go to end
          const scoreA = scores.get(a.id)?.score;
          const scoreB = scores.get(b.id)?.score;
          const numA = scoreA ? parseFloat(scoreA) : -1;
          const numB = scoreB ? parseFloat(scoreB) : -1;
          comparison = numA - numB;
          break;
        }
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [assets, searchQuery, sortState, scores]);

  const handleDeleteClick = useCallback((asset: AssetWithValue, value: string) => {
    setAssetToDelete({
      id: asset.id,
      symbol: asset.symbol,
      value,
      currency: asset.currency,
    });
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!assetToDelete) return;

    const result = await deleteAsset(assetToDelete.id);
    if (result === true) {
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  }, [assetToDelete, deleteAsset]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setAssetToDelete(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-medium">Assets</h3>
        <div className="flex items-center gap-2">
          {/* AC-3.6.6: Search/Filter Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter by symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 pl-8"
              data-testid="asset-search"
            />
          </div>
          <AddAssetModal
            portfolioId={portfolioId}
            defaultCurrency={defaultCurrency}
            onSuccess={onAssetAdded}
          />
        </div>
      </div>

      {assets.length === 0 ? (
        /* AC-9.6.2: Empty Assets State messaging */
        <div className="text-center py-8 text-muted-foreground" data-testid="empty-assets-inline">
          <p className="font-medium text-foreground">Your portfolio is empty</p>
          <p className="text-sm mt-1">Add assets to get personalized investment recommendations.</p>
        </div>
      ) : filteredAndSortedAssets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No assets match &quot;{searchQuery}&quot;</p>
          <p className="text-sm mt-1">Try a different search term.</p>
        </div>
      ) : (
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
                  label="Price"
                  sortKey="price"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Value (Native)"
                  sortKey="valueNative"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label={`Value (${baseCurrency})`}
                  sortKey="valueBase"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Alloc %"
                  sortKey="allocation"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Score"
                  sortKey="score"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-center"
                />
                <TableHead className="w-20">Ignore</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedAssets.map((asset) => {
                const scoreData = scores.get(asset.id);
                const unscoredReason = unscoredReasons.get(asset.id);
                return (
                  <AssetRowWithValues
                    key={asset.id}
                    asset={asset}
                    baseCurrency={baseCurrency}
                    onDeleteClick={handleDeleteClick}
                    onInvestmentRecorded={onInvestmentRecorded}
                    scoreData={
                      scoreData
                        ? {
                            score: scoreData.score,
                            calculatedAt: scoreData.calculatedAt,
                            breakdown: scoreData.breakdown,
                          }
                        : null
                    }
                    unscoredReason={unscoredReason ?? null}
                    onScoreClick={handleScoreClick}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteAssetDialog
        asset={assetToDelete}
        open={deleteDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      {/* Story 5.11: Score Breakdown Panel */}
      {breakdownAsset && breakdownData && (
        <ScoreBreakdown
          open={breakdownOpen}
          onOpenChange={handleBreakdownClose}
          assetId={breakdownAsset.id}
          symbol={breakdownAsset.symbol}
          name={breakdownAsset.name ?? undefined}
          score={breakdownData.score}
          breakdown={breakdownData.breakdown}
          calculatedAt={breakdownData.calculatedAt}
          criteriaVersionId={breakdownData.criteriaVersionId}
          targetMarket={breakdownData.targetMarket}
        />
      )}
    </div>
  );
}
