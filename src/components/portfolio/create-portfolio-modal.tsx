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

// =============================================================================
// TYPES
// =============================================================================

/**
 * Base props shared by both controlled and uncontrolled modes
 */
interface CreatePortfolioModalBaseProps {
  /**
   * Optional trigger element that opens the modal when clicked.
   *
   * **Uncontrolled mode:** Required - clicking the trigger opens the modal.
   * **Controlled mode:** Optional - the modal is controlled by the `open` prop,
   * so the trigger may not be needed if you're opening the modal externally
   * (e.g., from a separate button like in the empty state).
   *
   * @default Button with "Create Portfolio" text
   */
  trigger?: React.ReactNode;
  /** Callback fired after successful portfolio creation */
  onSuccess?: () => void;
}

/**
 * Props for uncontrolled mode (default) - modal manages its own open state
 */
interface CreatePortfolioModalUncontrolledProps extends CreatePortfolioModalBaseProps {
  open?: never;
  onOpenChange?: never;
}

/**
 * Props for controlled mode - parent manages the open state
 *
 * Both `open` and `onOpenChange` must be provided together to ensure
 * the modal can be opened and closed properly.
 */
interface CreatePortfolioModalControlledProps extends CreatePortfolioModalBaseProps {
  /** Whether the modal is open (controlled mode) */
  open: boolean;
  /** Callback fired when the modal open state should change (controlled mode) */
  onOpenChange: (open: boolean) => void;
}

/**
 * CreatePortfolioModal props - supports both controlled and uncontrolled modes
 *
 * @example Uncontrolled mode (default)
 * ```tsx
 * <CreatePortfolioModal onSuccess={() => router.refresh()} />
 * ```
 *
 * @example Controlled mode (for external state management)
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * <Button onClick={() => setIsOpen(true)}>Create Portfolio</Button>
 * <CreatePortfolioModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export type CreatePortfolioModalProps =
  | CreatePortfolioModalUncontrolledProps
  | CreatePortfolioModalControlledProps;

// =============================================================================
// COMPONENT
// =============================================================================

export function CreatePortfolioModal({
  trigger,
  onSuccess,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: CreatePortfolioModalProps) {
  const router = useRouter();
  // Use internal state if external control is not provided
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if we're using external or internal control
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (externalOnOpenChange ?? (() => {})) : setInternalOpen;

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
      {/* Only render trigger in uncontrolled mode to avoid conflicts with external state */}
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Portfolio
            </Button>
          )}
        </DialogTrigger>
      )}
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
