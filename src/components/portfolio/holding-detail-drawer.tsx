"use client";

/**
 * Holding Detail Drawer Component
 *
 * Story 2.2: View Portfolio and Holdings
 *
 * AC-2.2.4: Holding detail navigation - display detailed information about asset
 *
 * Task 5.1: Create holding detail drawer using Sheet component
 * Task 5.2: Display full asset details: symbol, name, quantity, purchase price, current price
 * Task 5.3: Display value in native currency and base currency
 * Task 5.4: Display exchange rate used for conversion
 * Task 5.5: Display allocation percentage
 * Task 5.6: Add action buttons: Edit, Remove, Toggle Ignored
 * Task 5.7: Use Sheet component from shadcn/ui
 */

import { useCallback, useState } from "react";
import { Edit, Trash2, EyeOff, Eye, ArrowRightLeft, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { formatRelativeTime } from "@/lib/types/freshness";
import { useToggleIgnore } from "@/hooks/use-toggle-ignore";
import { useDeleteAsset } from "@/hooks/use-delete-asset";
import { DeleteAssetDialog } from "./delete-asset-dialog";
import type { AssetWithValue } from "@/lib/services/portfolio-service";

interface HoldingDetailDrawerProps {
  holding: AssetWithValue | null;
  baseCurrency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HoldingDetailDrawer({
  holding,
  baseCurrency,
  open,
  onOpenChange,
}: HoldingDetailDrawerProps) {
  const { formatCurrency, formatPercent, formatNumber } = useNumberFormat();
  const { toggleIgnore, isToggling } = useToggleIgnore();
  const { deleteAsset, isDeleting } = useDeleteAsset();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Handle toggle ignore
  // Note: useToggleIgnore hook handles toast and router.refresh() internally
  const handleToggleIgnore = useCallback(async () => {
    if (!holding) return;
    await toggleIgnore(holding.id);
  }, [holding, toggleIgnore]);

  // Handle delete
  // Note: useDeleteAsset hook handles toast and router.refresh() internally
  const handleDelete = useCallback(async () => {
    if (!holding) return;

    const result = await deleteAsset(holding.id);
    if (result === true) {
      // Close drawer on successful deletion
      onOpenChange(false);
    }
  }, [holding, deleteAsset, onOpenChange]);

  if (!holding) {
    return null;
  }

  const needsConversion = holding.currency !== baseCurrency;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="holding-detail-drawer"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">{holding.symbol}</SheetTitle>
            {holding.isIgnored && (
              <Badge variant="secondary" className="gap-1">
                <EyeOff className="h-3 w-3" />
                Ignored
              </Badge>
            )}
          </div>
          <SheetDescription>{holding.name || "No name specified"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Position Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Position
            </h3>

            <div className="grid gap-3">
              {/* Quantity - Task 5.2 */}
              <DetailRow
                label="Quantity"
                value={formatNumber(parseFloat(holding.quantity), {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 8,
                })}
                testId="holding-quantity"
              />

              {/* Purchase Price - Task 5.2 */}
              <DetailRow
                label="Purchase Price"
                value={formatCurrency(parseFloat(holding.purchasePrice), holding.currency)}
                testId="holding-purchase-price"
              />

              {/* Current Price - Task 5.2 */}
              <DetailRow
                label="Current Price"
                value={formatCurrency(parseFloat(holding.currentPrice), holding.currency)}
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                testId="holding-current-price"
              />
            </div>
          </section>

          <Separator />

          {/* Value Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Value
            </h3>

            <div className="grid gap-3">
              {/* Value in Native Currency - Task 5.3 */}
              <DetailRow
                label={`Value (${holding.currency})`}
                value={formatCurrency(parseFloat(holding.valueNative), holding.currency)}
                testId="holding-value-native"
              />

              {/* Value in Base Currency - Task 5.3 */}
              <DetailRow
                label={`Value (${baseCurrency})`}
                value={formatCurrency(parseFloat(holding.valueBase), baseCurrency)}
                highlight
                testId="holding-value-base"
              />

              {/* Exchange Rate - Task 5.4 */}
              {needsConversion && (
                <DetailRow
                  label="Exchange Rate"
                  value={`1 ${holding.currency} = ${parseFloat(holding.exchangeRate).toFixed(4)} ${baseCurrency}`}
                  icon={<ArrowRightLeft className="h-4 w-4 text-muted-foreground" />}
                  testId="holding-exchange-rate"
                />
              )}

              {/* Allocation Percentage - Task 5.5 */}
              <DetailRow
                label="Allocation"
                value={
                  holding.isIgnored
                    ? "Excluded"
                    : formatPercent(parseFloat(holding.allocationPercent) / 100)
                }
                highlight={!holding.isIgnored}
                testId="holding-allocation"
              />
            </div>
          </section>

          <Separator />

          {/* Data Freshness */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Price updated: {formatRelativeTime(new Date(holding.priceUpdatedAt))}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(holding.priceUpdatedAt).toLocaleString()}
            </div>
          </section>

          <Separator />

          {/* Action Buttons - Task 5.6 */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Actions
            </h3>

            <div className="flex flex-col gap-2">
              {/* Toggle Ignored */}
              <Button
                variant="outline"
                className="justify-start"
                onClick={handleToggleIgnore}
                disabled={isToggling}
                data-testid="toggle-ignore-btn"
              >
                {holding.isIgnored ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Include in Allocations
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Ignore from Allocations
                  </>
                )}
              </Button>

              {/* Edit - placeholder for future story */}
              <Button
                variant="outline"
                className="justify-start"
                disabled
                data-testid="edit-holding-btn"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Holding
                <Badge variant="secondary" className="ml-auto text-xs">
                  Coming Soon
                </Badge>
              </Button>

              {/* Remove */}
              <Button
                variant="outline"
                className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsDeleteDialogOpen(true)}
                data-testid="remove-holding-btn"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from Portfolio
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>

      {/* Delete confirmation dialog */}
      <DeleteAssetDialog
        asset={
          holding
            ? {
                symbol: holding.symbol,
                value: holding.valueBase,
                currency: baseCurrency,
              }
            : null
        }
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </Sheet>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  testId?: string;
}

function DetailRow({ label, value, icon, highlight, testId }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={`font-mono ${highlight ? "font-semibold text-lg" : ""}`}
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}
