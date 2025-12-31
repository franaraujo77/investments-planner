"use client";

/**
 * Edit Holding Modal Component
 *
 * Story 2.6: Update and Remove Holdings
 *
 * AC-2.6.1: Edit Holding Action - Can update quantity and purchase price
 * AC-2.6.2: Update Holding Saves - Holding is updated and allocations recalculated
 *
 * Provides a modal dialog for editing an existing holding's quantity and purchase price.
 * Uses react-hook-form with Zod validation for form handling.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getFieldBorderClassName } from "@/components/forms/form-field-status";
import { type UpdateAssetInput } from "@/lib/validations/portfolio";
import type { AssetWithValue } from "@/lib/services/portfolio-service";
import { z } from "zod";

/**
 * Form-specific schema that requires both fields
 * Different from updateAssetSchema which allows partial updates
 */
const editHoldingFormSchema = z.object({
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Quantity must be positive" }
    ),
  purchasePrice: z
    .string()
    .min(1, "Price is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Price must be positive" }
    ),
});

/**
 * Form values interface - both fields required
 */
type EditHoldingFormValues = z.infer<typeof editHoldingFormSchema>;

/**
 * Props for EditHoldingModal component
 */
interface EditHoldingModalProps {
  /** The holding to edit */
  holding: AssetWithValue;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Optional callback on successful update (router.refresh() is called automatically) */
  onSuccess?: () => void;
}

/**
 * EditHoldingModal component
 *
 * AC-2.6.1: Edit Holding Action
 * - Displays modal with quantity and purchasePrice fields
 * - Pre-populates with current holding values
 *
 * AC-2.6.2: Update Holding Saves
 * - Submits via PATCH /api/assets/[assetId]
 * - Shows success toast on save
 * - Triggers router.refresh() to update allocations
 */
export function EditHoldingModal({
  holding,
  open,
  onOpenChange,
  onSuccess,
}: EditHoldingModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, touchedFields },
  } = useForm<EditHoldingFormValues>({
    resolver: zodResolver(editHoldingFormSchema),
    mode: "onChange",
    defaultValues: {
      quantity: holding.quantity,
      purchasePrice: holding.purchasePrice,
    },
  });

  // Compute border classes for form fields (Story 3.4: Visual Status Feedback)
  const quantityBorderClass = getFieldBorderClassName({
    hasError: !!errors.quantity,
    isTouched: !!touchedFields.quantity,
    isValid: !errors.quantity && !!touchedFields.quantity,
  });
  const priceBorderClass = getFieldBorderClassName({
    hasError: !!errors.purchasePrice,
    isTouched: !!touchedFields.purchasePrice,
    isValid: !errors.purchasePrice && !!touchedFields.purchasePrice,
  });

  /**
   * Handle form submission
   * AC-2.6.2: Update Holding Saves
   */
  const onSubmit = async (data: EditHoldingFormValues) => {
    setIsSubmitting(true);

    // Build payload for API
    const payload: UpdateAssetInput = {
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
    };

    try {
      const response = await fetch(`/api/assets/${holding.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (result.code === "NOT_FOUND" || result.code === "NOT_FOUND_ASSET") {
          toast.error("Asset not found");
        } else if (
          result.code === "VALIDATION_ERROR" ||
          result.code === "VALIDATION_INVALID_INPUT"
        ) {
          toast.error("Please check your input and try again");
        } else if (result.code === "AUTH_UNAUTHORIZED") {
          toast.error("Please log in to continue");
        } else {
          toast.error("Failed to update holding");
        }
        return;
      }

      // Success - show toast and trigger refresh
      toast.success("Holding updated successfully");
      onSuccess?.();
      router.refresh();
      onOpenChange(false);
    } catch (_error) {
      // Error displayed to user via toast - no additional logging needed in client
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle dialog open/close
   * Prevents closing during submission
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset form when closing
        reset({
          quantity: holding.quantity,
          purchasePrice: holding.purchasePrice,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="edit-holding-modal">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Holding</DialogTitle>
            <DialogDescription>
              Update quantity or purchase price for {holding.symbol}
              {holding.name ? ` (${holding.name})` : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Quantity Field - AC-3.4.5/3.4.6: Visual Status Feedback */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 100.5"
                disabled={isSubmitting}
                aria-invalid={!!errors.quantity}
                aria-describedby={errors.quantity ? "quantity-error" : undefined}
                data-testid="edit-quantity-input"
                className={cn("border", quantityBorderClass)}
                {...register("quantity")}
              />
              {errors.quantity && (
                <p id="quantity-error" role="alert" className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Purchase Price Field - AC-3.4.5/3.4.6: Visual Status Feedback */}
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <Input
                id="purchasePrice"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 150.50"
                disabled={isSubmitting}
                aria-invalid={!!errors.purchasePrice}
                aria-describedby={errors.purchasePrice ? "price-error" : undefined}
                data-testid="edit-price-input"
                className={cn("border", priceBorderClass)}
                {...register("purchasePrice")}
              />
              {errors.purchasePrice && (
                <p id="price-error" role="alert" className="text-sm text-destructive">
                  {errors.purchasePrice.message}
                </p>
              )}
            </div>

            {/* Currency display (read-only) */}
            <div className="text-sm text-muted-foreground">Currency: {holding.currency}</div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              data-testid="edit-cancel-btn"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting} data-testid="edit-save-btn">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
