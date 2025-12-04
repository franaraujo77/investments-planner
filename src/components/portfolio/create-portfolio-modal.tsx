"use client";

/**
 * Create Portfolio Modal Component
 *
 * Story 3.1: Create Portfolio
 * AC-3.1.2: Form with name input (50 char limit), character counter, validation
 * AC-3.1.3: Success toast and page refresh after creation
 * AC-3.1.4: Error handling for portfolio limit
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  createPortfolioSchema,
  type CreatePortfolioInput,
  PORTFOLIO_NAME_MAX_LENGTH,
} from "@/lib/validations/portfolio";

interface CreatePortfolioModalProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreatePortfolioModal({ trigger, onSuccess }: CreatePortfolioModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<CreatePortfolioInput>({
    resolver: zodResolver(createPortfolioSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
    },
  });

  const nameValue = watch("name") || "";
  const charactersRemaining = PORTFOLIO_NAME_MAX_LENGTH - nameValue.length;

  const onSubmit = async (data: CreatePortfolioInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/portfolios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (result.code === "LIMIT_EXCEEDED") {
          toast.error(result.error);
        } else if (result.code === "VALIDATION_ERROR") {
          toast.error("Please check your input and try again");
        } else {
          toast.error("Failed to create portfolio");
        }
        return;
      }

      // Success
      toast.success("Portfolio created successfully");
      setOpen(false);
      reset();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Error creating portfolio:", error);
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
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Portfolio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
            <DialogDescription>
              Give your portfolio a name to help you organize your investments.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Portfolio Name</Label>
                <span
                  className={`text-xs ${
                    charactersRemaining < 10 ? "text-destructive" : "text-muted-foreground"
                  }`}
                  aria-live="polite"
                >
                  {charactersRemaining} characters remaining
                </span>
              </div>
              <Input
                id="name"
                placeholder="e.g., Retirement Fund"
                maxLength={PORTFOLIO_NAME_MAX_LENGTH}
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
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
