"use client";

/**
 * Subclass Card Component
 *
 * Story 4.2: Define Subclasses
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * Displays a single subclass with inline editing, delete, and allocation ranges.
 * AC-4.2.1: View subclass details
 * AC-4.2.3: Edit subclass name (inline)
 * AC-4.2.4: Delete subclass (no assets)
 * AC-4.2.5: Delete subclass with warning (has assets)
 * AC-4.4.1: View and set subclass allocation ranges
 * AC-4.4.5: Show "Flexible" indicator when ranges are null
 * AC-4.5.1: Set max assets limit for subclasses
 * AC-4.5.5: Asset count display for subclasses
 * AC-4.6.1: Set minimum allocation value for subclasses
 * AC-4.6.2: Display minimum allocation badge
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Trash2, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useUpdateSubclass,
  useDeleteSubclass,
  useAssetCountStatus,
} from "@/hooks/use-asset-classes";
import { AssetCountInput } from "./asset-count-input";
import { AssetCountBadge } from "./asset-count-badge";
import { MinAllocationInput } from "./min-allocation-input";
import { MinAllocationBadge } from "./min-allocation-badge";
import { cn } from "@/lib/utils";
import type { AssetSubclass } from "@/lib/db/schema";

interface SubclassCardProps {
  subclass: AssetSubclass;
  onUpdate: () => void;
  onDelete: () => void;
  /** Callback when allocation changes (to refresh validation) */
  onAllocationChange?: () => void;
  /** User's base currency for min allocation display (default: "USD") */
  currency?: string;
}

/**
 * Validate percentage format and range
 */
function isValidPercentage(value: string): boolean {
  if (!value) return true; // Empty is valid (nullable)
  const regex = /^(100(\.00?)?|\d{1,2}(\.\d{1,2})?)$/;
  if (!regex.test(value)) return false;
  const num = parseFloat(value);
  return num >= 0 && num <= 100;
}

export function SubclassCard({
  subclass,
  onUpdate,
  onDelete,
  onAllocationChange,
  currency = "USD",
}: SubclassCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subclass.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allocation range state
  const [minValue, setMinValue] = useState(subclass.targetMin ?? "");
  const [maxValue, setMaxValue] = useState(subclass.targetMax ?? "");
  const [isUpdatingAllocation, setIsUpdatingAllocation] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const { updateSubclass, isUpdating } = useUpdateSubclass();
  const { deleteSubclass, isDeleting, warning, clearWarning } = useDeleteSubclass();
  const { getSubclassStatus, refresh: refreshAssetCount } = useAssetCountStatus();

  // Get asset count status for this subclass
  const subclassStatus = getSubclassStatus(subclass.id);

  // Sync allocation state with prop changes
  useEffect(() => {
    setMinValue(subclass.targetMin ?? "");
    setMaxValue(subclass.targetMax ?? "");
  }, [subclass.targetMin, subclass.targetMax]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Determine if subclass is "Flexible" (no allocation constraints)
  const isFlexible = !subclass.targetMin && !subclass.targetMax;

  /**
   * Validate min <= max
   */
  const validateRange = useCallback((min: string, max: string): string | null => {
    // Validate formats first
    if (min && !isValidPercentage(min)) {
      return "Invalid min percentage format (0-100, up to 2 decimals)";
    }
    if (max && !isValidPercentage(max)) {
      return "Invalid max percentage format (0-100, up to 2 decimals)";
    }

    // Validate min <= max
    if (min && max) {
      const minNum = parseFloat(min);
      const maxNum = parseFloat(max);
      if (minNum > maxNum) {
        return "Minimum cannot exceed maximum";
      }
    }

    return null;
  }, []);

  /**
   * Handle save allocation on blur
   */
  const handleAllocationSave = useCallback(async () => {
    // Validate
    const validationError = validateRange(minValue, maxValue);
    if (validationError) {
      setAllocationError(validationError);
      return;
    }

    setAllocationError(null);

    // Check if values changed
    const newMin = minValue || null;
    const newMax = maxValue || null;

    if (newMin === subclass.targetMin && newMax === subclass.targetMax) {
      return; // No change
    }

    setIsUpdatingAllocation(true);

    try {
      await updateSubclass(subclass.id, {
        targetMin: newMin,
        targetMax: newMax,
      });

      // Show saved indicator briefly
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);

      // Notify parent to refresh validation
      onAllocationChange?.();
      onUpdate();
    } catch {
      setAllocationError("Failed to save allocation range");
    } finally {
      setIsUpdatingAllocation(false);
    }
  }, [
    subclass.id,
    subclass.targetMin,
    subclass.targetMax,
    minValue,
    maxValue,
    validateRange,
    updateSubclass,
    onAllocationChange,
    onUpdate,
  ]);

  /**
   * Handle min input change
   */
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinValue(value);

    // Clear error if corrected
    const validationError = validateRange(value, maxValue);
    if (allocationError && !validationError) {
      setAllocationError(null);
    }
  };

  /**
   * Handle max input change
   */
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxValue(value);

    // Clear error if corrected
    const validationError = validateRange(minValue, value);
    if (allocationError && !validationError) {
      setAllocationError(null);
    }
  };

  // Handle name save
  const handleSave = async () => {
    if (editName.trim() === subclass.name) {
      setIsEditing(false);
      return;
    }

    const result = await updateSubclass(subclass.id, { name: editName.trim() });
    if (result) {
      setIsEditing(false);
      onUpdate();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditName(subclass.name);
    setIsEditing(false);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Handle delete
  const handleDelete = async () => {
    const success = await deleteSubclass(subclass.id, false);
    if (success) {
      onDelete();
    }
  };

  // Handle force delete (when there are associated assets)
  const handleForceDelete = async () => {
    const success = await deleteSubclass(subclass.id, true);
    if (success) {
      clearWarning();
      onDelete();
    }
  };

  return (
    <>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/50">
        {/* Top row: Name and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Name - editable or display */}
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 w-40 text-sm"
                maxLength={50}
                disabled={isUpdating}
              />
            ) : (
              <span className="font-medium text-foreground">{subclass.name}</span>
            )}

            {/* AC-4.4.5: Flexible indicator */}
            {isFlexible && !isEditing && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Flexible
              </Badge>
            )}

            {/* Asset Count Badge - Story 4.5 */}
            {subclassStatus && !isEditing && (
              <AssetCountBadge
                currentCount={subclassStatus.currentCount}
                maxAssets={subclassStatus.maxAssets}
                showWhenNoLimit={false}
              />
            )}

            {/* Min Allocation Badge - Story 4.6 */}
            {!isEditing && (
              <MinAllocationBadge value={subclass.minAllocationValue} currency={currency} />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleSave}
                  disabled={isUpdating || editName.trim().length === 0}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                  <span className="sr-only">Save</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                  <span className="sr-only">Cancel</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  <span className="sr-only">Delete</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bottom row: Allocation range editor */}
        {!isEditing && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-end gap-3">
              {/* Min input */}
              <div className="flex-1">
                <Label htmlFor={`min-${subclass.id}`} className="text-xs text-muted-foreground">
                  Min %
                </Label>
                <div className="relative">
                  <Input
                    id={`min-${subclass.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={minValue}
                    onChange={handleMinChange}
                    onBlur={handleAllocationSave}
                    disabled={isUpdatingAllocation}
                    className={cn(
                      "h-7 pr-6 text-sm",
                      allocationError &&
                        allocationError.toLowerCase().includes("min") &&
                        "border-destructive"
                    )}
                    aria-label="Minimum allocation percentage"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              <span className="text-muted-foreground pb-1">-</span>

              {/* Max input */}
              <div className="flex-1">
                <Label htmlFor={`max-${subclass.id}`} className="text-xs text-muted-foreground">
                  Max %
                </Label>
                <div className="relative">
                  <Input
                    id={`max-${subclass.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="100"
                    value={maxValue}
                    onChange={handleMaxChange}
                    onBlur={handleAllocationSave}
                    disabled={isUpdatingAllocation}
                    className={cn(
                      "h-7 pr-6 text-sm",
                      allocationError &&
                        allocationError.toLowerCase().includes("max") &&
                        "border-destructive"
                    )}
                    aria-label="Maximum allocation percentage"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              {/* Status indicator */}
              <div className="w-5 pb-1">
                {isUpdatingAllocation && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {showSaved && !isUpdatingAllocation && <Check className="h-4 w-4 text-green-600" />}
              </div>

              {/* Separator */}
              <div className="border-l border-border/50 h-8 mx-2"></div>

              {/* Max Assets Input - Story 4.5 */}
              <AssetCountInput
                entityId={subclass.id}
                maxAssets={subclass.maxAssets ? parseInt(subclass.maxAssets, 10) : null}
                onUpdate={async (entityId, maxAssets) => {
                  const result = await updateSubclass(entityId, { maxAssets });
                  if (result) {
                    onUpdate();
                    refreshAssetCount();
                  }
                  return result;
                }}
                disabled={isUpdatingAllocation}
                label="Max"
              />

              {/* Min Allocation Input - Story 4.6 */}
              <MinAllocationInput
                entityId={subclass.id}
                minAllocationValue={subclass.minAllocationValue}
                currency={currency}
                onUpdate={async (entityId, minAllocationValue) => {
                  const result = await updateSubclass(entityId, { minAllocationValue });
                  if (result) {
                    onUpdate();
                  }
                  return result;
                }}
                disabled={isUpdatingAllocation}
              />
            </div>

            {/* Error message */}
            {allocationError && (
              <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>{allocationError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog (shown when assets would be affected) */}
      <AlertDialog open={!!warning} onOpenChange={() => clearWarning()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Delete Subclass?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This subclass has <strong>{warning?.assetCount}</strong> associated asset(s). Deleting
              it will remove the classification from those assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={clearWarning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
