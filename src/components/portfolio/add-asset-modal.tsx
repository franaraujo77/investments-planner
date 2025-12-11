"use client";

/**
 * Add Asset Modal Component
 *
 * Story 3.2: Add Asset to Portfolio
 * AC-3.2.2: Form with symbol, name, quantity, price, currency fields
 * AC-3.2.3: Positive value validation
 * AC-3.2.4: Duplicate asset error handling
 * AC-3.2.6: Success toast and portfolio refresh after creation
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

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
import {
  addAssetSchema,
  type AddAssetInput,
  ASSET_SYMBOL_MAX_LENGTH,
  ASSET_NAME_MAX_LENGTH,
  SUPPORTED_CURRENCIES,
} from "@/lib/validations/portfolio";

// Form values type - matches what react-hook-form expects
// Different from AddAssetInput because form always has name as string (can be empty)
interface AddAssetFormValues {
  symbol: string;
  name: string;
  quantity: string;
  purchasePrice: string;
  currency: string;
}

interface AddAssetModalProps {
  portfolioId: string;
  defaultCurrency?: string | undefined;
  trigger?: React.ReactNode | undefined;
  onSuccess?: (() => void) | undefined;
}

export function AddAssetModal({
  portfolioId,
  defaultCurrency = "USD",
  trigger,
  onSuccess,
}: AddAssetModalProps) {
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
  } = useForm<AddAssetFormValues>({
    resolver: zodResolver(addAssetSchema) as Resolver<AddAssetFormValues>,
    mode: "onChange",
    defaultValues: {
      symbol: "",
      name: "",
      quantity: "",
      purchasePrice: "",
      currency: defaultCurrency,
    },
  });

  const symbolValue = watch("symbol") || "";
  const nameValue = watch("name") || "";

  const onSubmit = async (data: AddAssetFormValues) => {
    setIsSubmitting(true);

    // Convert form values to API payload
    const payload: AddAssetInput = {
      symbol: data.symbol,
      name: data.name || undefined,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
      currency: data.currency,
    };

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (result.code === "ASSET_EXISTS") {
          toast.error(result.error);
        } else if (result.code === "NOT_FOUND") {
          toast.error("Portfolio not found");
        } else if (result.code === "VALIDATION_ERROR") {
          toast.error("Please check your input and try again");
        } else {
          toast.error("Failed to add asset");
        }
        return;
      }

      // Success
      toast.success("Asset added successfully");
      setOpen(false);
      reset();
      onSuccess?.();
      router.refresh();
    } catch (_error) {
      // Error displayed to user via toast - no additional logging needed in client
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Asset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
            <DialogDescription>Add a new asset to track in your portfolio.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Symbol Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="symbol">Symbol *</Label>
                <span className="text-xs text-muted-foreground">
                  {ASSET_SYMBOL_MAX_LENGTH - symbolValue.length} chars remaining
                </span>
              </div>
              <Input
                id="symbol"
                placeholder="e.g., AAPL, BTC, PETR4"
                maxLength={ASSET_SYMBOL_MAX_LENGTH}
                aria-invalid={!!errors.symbol}
                aria-describedby={errors.symbol ? "symbol-error" : undefined}
                className="uppercase"
                {...register("symbol")}
              />
              {errors.symbol && (
                <p id="symbol-error" className="text-sm text-destructive">
                  {errors.symbol.message}
                </p>
              )}
            </div>

            {/* Name Field (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Name (optional)</Label>
                <span className="text-xs text-muted-foreground">
                  {ASSET_NAME_MAX_LENGTH - nameValue.length} chars remaining
                </span>
              </div>
              <Input
                id="name"
                placeholder="e.g., Apple Inc."
                maxLength={ASSET_NAME_MAX_LENGTH}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

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

              {/* Purchase Price Field */}
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Price *</Label>
                <Input
                  id="purchasePrice"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 150.50"
                  aria-invalid={!!errors.purchasePrice}
                  aria-describedby={errors.purchasePrice ? "price-error" : undefined}
                  {...register("purchasePrice")}
                />
                {errors.purchasePrice && (
                  <p id="price-error" className="text-sm text-destructive">
                    {errors.purchasePrice.message}
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
                  <Select onValueChange={field.onChange} value={field.value || defaultCurrency}>
                    <SelectTrigger id="currency" aria-invalid={!!errors.currency}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p id="currency-error" className="text-sm text-destructive">
                  {errors.currency.message}
                </p>
              )}
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
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
