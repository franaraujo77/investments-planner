"use client";

/**
 * UnsavedChangesDialog Component
 *
 * Story 3.3: Allocation Validation
 * AC-3.3.3: Exit Warning for Incomplete Allocation
 *
 * Features:
 * - Shows warning when user tries to navigate with invalid allocation
 * - Uses shadcn AlertDialog for accessibility
 * - "Stay" and "Leave" actions
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/**
 * Props for the UnsavedChangesDialog component
 */
export interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Title for the dialog */
  title?: string;
  /** Description/message for the dialog */
  message?: string;
  /** Handler for "Stay" button click */
  onStay: () => void;
  /** Handler for "Leave" button click */
  onLeave: () => void;
}

/**
 * Default dialog content
 */
const DEFAULT_TITLE = "Unsaved Changes";
const DEFAULT_MESSAGE = "Your allocation doesn't equal 100%. Changes will be lost. Leave anyway?";

/**
 * UnsavedChangesDialog
 *
 * A confirmation dialog that warns users about losing their unsaved changes
 * when their allocation doesn't equal 100%.
 *
 * @example
 * ```tsx
 * const { showWarning, confirmLeave, cancelLeave, title, message } =
 *   useAllocationWarning({ isDirty, isValid });
 *
 * <UnsavedChangesDialog
 *   open={showWarning}
 *   title={title}
 *   message={message}
 *   onStay={cancelLeave}
 *   onLeave={confirmLeave}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  onStay,
  onLeave,
}: UnsavedChangesDialogProps) {
  // Handle escape key and click outside - treat as "Stay"
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onStay();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid="unsaved-changes-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay} data-testid="dialog-stay-button">
            Stay
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeave}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="dialog-leave-button"
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default UnsavedChangesDialog;
