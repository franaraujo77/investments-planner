"use client";

/**
 * Asset Class Card Component
 *
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * Displays a single asset class with inline editing, delete,
 * and expandable subclass section with allocation range editing.
 * AC-4.1.1: View asset class details
 * AC-4.1.3: Edit asset class name (inline)
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete asset class with warning (has assets)
 * AC-4.2.1: View subclasses within asset class
 * AC-4.3.1: View and set allocation ranges
 * AC-4.3.2: Min cannot exceed max validation
 * AC-4.4.2: Show warning when subclass max exceeds parent max
 * AC-4.4.3: Show warning when sum of subclass minimums exceeds parent max
 * AC-4.5.1: Set max assets limit
 * AC-4.5.4: Asset count display for classes
 * AC-4.6.1: Set minimum allocation value
 * AC-4.6.2: Display minimum allocation badge
 */

import { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useUpdateAssetClass,
  useDeleteAssetClass,
  useAssetCountStatus,
} from "@/hooks/use-asset-classes";
import { SubclassList } from "./subclass-list";
import { AllocationRangeEditor } from "./allocation-range-editor";
import { AssetCountInput } from "./asset-count-input";
import { AssetCountBadge } from "./asset-count-badge";
import { MinAllocationInput } from "./min-allocation-input";
import { MinAllocationBadge } from "./min-allocation-badge";
import type { AssetClass } from "@/lib/db/schema";

interface AssetClassCardProps {
  assetClass: AssetClass;
  onUpdate: () => void;
  onDelete: () => void;
  /** User's base currency for min allocation display (default: "USD") */
  currency?: string;
}

export function AssetClassCard({
  assetClass,
  onUpdate,
  onDelete,
  currency = "USD",
}: AssetClassCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(assetClass.name);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { updateAssetClass, isUpdating } = useUpdateAssetClass();
  const { deleteAssetClass, isDeleting, warning, clearWarning } = useDeleteAssetClass();
  const { getClassStatus, refresh: refreshAssetCount } = useAssetCountStatus();

  // Get asset count status for this class
  const classStatus = getClassStatus(assetClass.id);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle save
  const handleSave = async () => {
    if (editName.trim() === assetClass.name) {
      setIsEditing(false);
      return;
    }

    const result = await updateAssetClass(assetClass.id, { name: editName.trim() });
    if (result) {
      setIsEditing(false);
      onUpdate();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditName(assetClass.name);
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
    const success = await deleteAssetClass(assetClass.id, false);
    if (success) {
      onDelete();
    }
  };

  // Handle force delete (when there are associated assets)
  const handleForceDelete = async () => {
    const success = await deleteAssetClass(assetClass.id, true);
    if (success) {
      clearWarning();
      onDelete();
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card shadow-sm">
        {/* Header row */}
        <div className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50">
          <div className="flex items-center gap-3">
            {/* Expand/Collapse toggle for subclasses */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">Toggle subclasses</span>
            </Button>

            {/* Icon */}
            {assetClass.icon && (
              <span className="text-xl" role="img" aria-label={assetClass.name}>
                {assetClass.icon}
              </span>
            )}

            {/* Name - editable or display */}
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 w-48"
                maxLength={50}
                disabled={isUpdating}
              />
            ) : (
              <span className="font-medium">{assetClass.name}</span>
            )}

            {/* Asset Count Badge - Story 4.5 */}
            {classStatus && (
              <AssetCountBadge
                currentCount={classStatus.currentCount}
                maxAssets={classStatus.maxAssets}
                showWhenNoLimit={false}
              />
            )}

            {/* Min Allocation Badge - Story 4.6 */}
            <MinAllocationBadge value={assetClass.minAllocationValue} currency={currency} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSave}
                  disabled={isUpdating || editName.trim().length === 0}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  <span className="sr-only">Save</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Cancel</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">Delete</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Allocation Range section - always visible */}
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground w-24">Target Range:</span>
            <div className="flex-1 max-w-xs">
              <AllocationRangeEditor
                classId={assetClass.id}
                targetMin={assetClass.targetMin}
                targetMax={assetClass.targetMax}
                onUpdate={async (classId, input) => {
                  const result = await updateAssetClass(classId, input);
                  if (result) {
                    onUpdate();
                  }
                  return result;
                }}
                disabled={isEditing || isUpdating}
              />
            </div>

            {/* Max Assets Input - Story 4.5 */}
            <div className="ml-auto flex items-center gap-4">
              <AssetCountInput
                entityId={assetClass.id}
                maxAssets={assetClass.maxAssets ? parseInt(assetClass.maxAssets, 10) : null}
                onUpdate={async (entityId, maxAssets) => {
                  const result = await updateAssetClass(entityId, { maxAssets });
                  if (result) {
                    onUpdate();
                    refreshAssetCount();
                  }
                  return result;
                }}
                disabled={isEditing || isUpdating}
              />

              {/* Min Allocation Input - Story 4.6 */}
              <MinAllocationInput
                entityId={assetClass.id}
                minAllocationValue={assetClass.minAllocationValue}
                currency={currency}
                onUpdate={async (entityId, minAllocationValue) => {
                  const result = await updateAssetClass(entityId, { minAllocationValue });
                  if (result) {
                    onUpdate();
                  }
                  return result;
                }}
                disabled={isEditing || isUpdating}
              />
            </div>
          </div>
        </div>

        {/* Subclasses section - expandable */}
        {isExpanded && (
          <div className="border-t px-4 py-3 pl-12">
            <SubclassList classId={assetClass.id} />
          </div>
        )}
      </div>

      {/* Delete confirmation dialog (shown when assets would be affected) */}
      <AlertDialog open={!!warning} onOpenChange={() => clearWarning()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Delete Asset Class?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This asset class has <strong>{warning?.assetCount}</strong> associated asset(s).
              Deleting it will remove the classification from those assets.
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
