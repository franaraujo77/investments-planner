"use client";

/**
 * Investment Confirmation Modal Component
 *
 * Story 3.8: Record Investment Amount
 * AC-3.8.3: Success toast with dynamic month name
 * AC-3.8.4: Portfolio data refresh after recording
 * AC-3.8.6: Store recommended vs actual amounts
 *
 * Modal for confirming and recording investment transactions.
 * Can be used for single or batch investments.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DollarSign, Loader2 } from "lucide-react";
import { Decimal } from "@/lib/calculations/decimal-config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyDisplay } from "@/components/fintech/currency-display";
import { SUPPORTED_CURRENCIES, INVESTMENT_MESSAGES } from "@/lib/validations/portfolio";

/**
 * Form schema for the modal
 */
const investmentModalSchema = z.object({
  quantity: z
    .string()
    .min(1, INVESTMENT_MESSAGES.QUANTITY_REQUIRED)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: INVESTMENT_MESSAGES.QUANTITY_POSITIVE }
    ),
  pricePerUnit: z
    .string()
    .min(1, INVESTMENT_MESSAGES.PRICE_REQUIRED)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: INVESTMENT_MESSAGES.PRICE_POSITIVE }
    ),
  currency: z.string().length(3, INVESTMENT_MESSAGES.CURRENCY_LENGTH),
});

type InvestmentModalFormValues = z.infer<typeof investmentModalSchema>;

interface InvestmentConfirmationModalProps {
  portfolioId: string;
  assetId: string;
  symbol: string;
  assetName?: string | undefined;
  defaultCurrency?: string | undefined;
  recommendedAmount?: string | undefined;
  trigger?: React.ReactNode | undefined;
  onSuccess?: (() => void) | undefined;
}

/**
 * Calculate total amount using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 */
function calculateTotal(quantity: string, pricePerUnit: string): string {
  if (!quantity || !pricePerUnit) return "0.0000";

  try {
    const qty = new Decimal(quantity);
    const price = new Decimal(pricePerUnit);

    if (qty.isNaN() || price.isNaN() || qty.lte(0) || price.lte(0)) {
      return "0.0000";
    }

    return qty.times(price).toFixed(4);
  } catch {
    return "0.0000";
  }
}

/**
 * Get dynamic month name for success toast
 * AC-3.8.3: "[Month] investment recorded"
 */
function getDynamicMonthName(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", { month: "long" });
}

export function InvestmentConfirmationModal({
  portfolioId,
  assetId,
  symbol,
  assetName,
  defaultCurrency = "USD",
  recommendedAmount,
  trigger,
  onSuccess,
}: InvestmentConfirmationModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<InvestmentModalFormValues>({
    resolver: zodResolver(investmentModalSchema) as Resolver<InvestmentModalFormValues>,
    mode: "onChange",
    defaultValues: {
      quantity: "",
      pricePerUnit: "",
      currency: defaultCurrency,
    },
  });

  const quantity = watch("quantity");
  const pricePerUnit = watch("pricePerUnit");
  const currency = watch("currency");

  // Calculate total amount reactively
  const totalAmount = calculateTotal(quantity, pricePerUnit);

  const onSubmit = useCallback(
    async (data: InvestmentModalFormValues) => {
      setIsSubmitting(true);

      // Build payload
      const payload = {
        investments: [
          {
            portfolioId,
            assetId,
            symbol,
            quantity: data.quantity,
            pricePerUnit: data.pricePerUnit,
            currency: data.currency,
            recommendedAmount: recommendedAmount ?? null,
          },
        ],
      };

      try {
        const response = await fetch("/api/investments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          // Handle specific error codes
          if (result.code === "ASSET_NOT_FOUND") {
            toast.error("Asset not found or you don't have access");
          } else if (result.code === "PORTFOLIO_NOT_FOUND") {
            toast.error("Portfolio not found or you don't have access");
          } else if (result.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to record investment");
          }
          return;
        }

        // Success - show toast with dynamic month name
        // AC-3.8.3: "[Month] investment recorded"
        const monthName = getDynamicMonthName();
        toast.success(`${monthName} investment recorded`);

        // Close modal and reset form
        setOpen(false);
        reset();

        // Trigger parent callback and refresh
        // AC-3.8.4: Portfolio data refresh
        onSuccess?.();
        router.refresh();
      } catch (_error) {
        // Error displayed to user via toast - no additional logging needed in client
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [portfolioId, assetId, symbol, recommendedAmount, onSuccess, router, reset]
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <DollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
            Record Investment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Record Investment</DialogTitle>
            <DialogDescription>Record an investment for {assetName || symbol}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Asset Info */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Asset</span>
              <span className="text-sm font-mono font-medium">{symbol}</span>
            </div>

            {/* Recommended Amount Display (if provided) */}
            {recommendedAmount && (
              <div className="p-3 border rounded-md border-dashed">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recommended Amount</span>
                  <CurrencyDisplay
                    value={recommendedAmount}
                    currency={currency}
                    className="font-medium text-primary"
                  />
                </div>
              </div>
            )}

            {/* Quantity and Price Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Quantity Field */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 10.5"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.quantity}
                  aria-describedby={errors.quantity ? "quantity-error" : undefined}
                  {...register("quantity")}
                />
                {errors.quantity && (
                  <p id="quantity-error" className="text-sm text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              {/* Price Per Unit Field */}
              <div className="space-y-2">
                <Label htmlFor="pricePerUnit">Price/Unit *</Label>
                <Input
                  id="pricePerUnit"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 150.50"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.pricePerUnit}
                  aria-describedby={errors.pricePerUnit ? "price-error" : undefined}
                  {...register("pricePerUnit")}
                />
                {errors.pricePerUnit && (
                  <p id="price-error" className="text-sm text-destructive">
                    {errors.pricePerUnit.message}
                  </p>
                )}
              </div>
            </div>

            {/* Currency Field */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || defaultCurrency}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="currency" aria-invalid={!!errors.currency}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.code} - {curr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Total Amount (Read-only, Calculated) */}
            <div className="p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Amount</span>
                <CurrencyDisplay
                  value={totalAmount}
                  currency={currency}
                  className="text-lg font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Recording...
                </>
              ) : (
                "Record Investment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
