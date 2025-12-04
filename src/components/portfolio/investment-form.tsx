"use client";

/**
 * Investment Form Component
 *
 * Story 3.8: Record Investment Amount
 * AC-3.8.1: Investment record with all required fields
 * AC-3.8.5: Form validation for positive values
 * AC-3.8.6: Optional recommended amount display
 *
 * Used for recording individual investment transactions.
 * Shows quantity, price per unit, calculated total, and currency.
 */

import { useEffect, useMemo } from "react";
import { useForm, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Decimal } from "@/lib/calculations/decimal-config";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 * Form validation schema
 * AC-3.8.5: Validation for positive values
 */
const investmentFormSchema = z.object({
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

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

export interface InvestmentFormData {
  quantity: string;
  pricePerUnit: string;
  totalAmount: string;
  currency: string;
}

interface InvestmentFormProps {
  portfolioId: string;
  assetId: string;
  symbol: string;
  defaultCurrency?: string;
  recommendedAmount?: string;
  onChange?: (data: InvestmentFormData, isValid: boolean) => void;
  disabled?: boolean;
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

export function InvestmentForm({
  symbol,
  defaultCurrency = "USD",
  recommendedAmount,
  onChange,
  disabled = false,
}: InvestmentFormProps) {
  const {
    register,
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema) as Resolver<InvestmentFormValues>,
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
  const totalAmount = useMemo(() => {
    return calculateTotal(quantity, pricePerUnit);
  }, [quantity, pricePerUnit]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(
      {
        quantity: quantity || "",
        pricePerUnit: pricePerUnit || "",
        totalAmount,
        currency: currency || defaultCurrency,
      },
      isValid
    );
  }, [quantity, pricePerUnit, totalAmount, currency, isValid, onChange, defaultCurrency]);

  return (
    <div className="space-y-4">
      {/* Symbol Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Asset</span>
        <span className="text-sm font-mono">{symbol}</span>
      </div>

      {/* Recommended Amount Display (if provided) */}
      {recommendedAmount && (
        <div className="p-3 bg-muted rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recommended Amount</span>
            <CurrencyDisplay
              value={recommendedAmount}
              currency={currency}
              className="font-medium"
            />
          </div>
        </div>
      )}

      {/* Quantity and Price Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quantity Field */}
        <div className="space-y-2">
          <Label htmlFor={`quantity-${symbol}`}>Quantity *</Label>
          <Input
            id={`quantity-${symbol}`}
            type="text"
            inputMode="decimal"
            placeholder="e.g., 10.5"
            disabled={disabled}
            aria-invalid={!!errors.quantity}
            aria-describedby={errors.quantity ? `quantity-error-${symbol}` : undefined}
            {...register("quantity")}
          />
          {errors.quantity && (
            <p id={`quantity-error-${symbol}`} className="text-sm text-destructive">
              {errors.quantity.message}
            </p>
          )}
        </div>

        {/* Price Per Unit Field */}
        <div className="space-y-2">
          <Label htmlFor={`price-${symbol}`}>Price/Unit *</Label>
          <Input
            id={`price-${symbol}`}
            type="text"
            inputMode="decimal"
            placeholder="e.g., 150.50"
            disabled={disabled}
            aria-invalid={!!errors.pricePerUnit}
            aria-describedby={errors.pricePerUnit ? `price-error-${symbol}` : undefined}
            {...register("pricePerUnit")}
          />
          {errors.pricePerUnit && (
            <p id={`price-error-${symbol}`} className="text-sm text-destructive">
              {errors.pricePerUnit.message}
            </p>
          )}
        </div>
      </div>

      {/* Currency and Total Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Currency Field */}
        <div className="space-y-2">
          <Label htmlFor={`currency-${symbol}`}>Currency *</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value || defaultCurrency}
                disabled={disabled}
              >
                <SelectTrigger id={`currency-${symbol}`} aria-invalid={!!errors.currency}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Total Amount (Read-only, Calculated) */}
        <div className="space-y-2">
          <Label>Total Amount</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted px-3">
            <CurrencyDisplay
              value={totalAmount}
              currency={currency}
              className="text-sm font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
