"use client";

/**
 * Copy Criteria Dialog Component
 *
 * Story 5.5: Copy Criteria Set
 *
 * AC-5.5.1: Copy action available on criteria sets
 * AC-5.5.2: Target market selection with name input
 * AC-5.5.3: Name pre-filled with "(Copy)" suffix
 * AC-5.5.4: Copy confirmation
 *
 * Dialog for copying a criteria set with name and target market options.
 */

import { useState, useCallback, useMemo, useLayoutEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { getMarketDisplayName, getAvailableMarkets } from "@/lib/constants/markets";

// =============================================================================
// TYPES
// =============================================================================

export interface SourceCriteriaSet {
  id: string;
  name: string;
  assetType: string;
  targetMarket: string;
  criteriaCount: number;
}

export interface CopyOptions {
  name?: string;
  targetMarket?: string;
}

interface CopyCriteriaDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Source criteria set to copy */
  sourceSet: SourceCriteriaSet;
  /** User's existing markets for the select dropdown */
  userMarkets?: string[];
  /** Callback when copy is confirmed */
  onCopy: (options: CopyOptions) => Promise<void>;
  /** Whether copy operation is in progress */
  isCopying?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Dialog for copying a criteria set
 *
 * Features:
 * - Shows source set details (name, criteria count)
 * - Name input pre-filled with "(Copy)" suffix
 * - Target market dropdown with predefined + user markets
 * - Loading state during copy operation
 */
export function CopyCriteriaDialog({
  open,
  onOpenChange,
  sourceSet,
  userMarkets = [],
  onCopy,
  isCopying = false,
}: CopyCriteriaDialogProps) {
  // Default values computed from sourceSet
  const defaultName = useMemo(() => `${sourceSet.name} (Copy)`, [sourceSet.name]);
  const defaultMarket = sourceSet.targetMarket;

  // Form state - initialized with defaults
  const [name, setName] = useState(defaultName);
  const [targetMarket, setTargetMarket] = useState(defaultMarket);
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset form when sourceSet changes (new source selected)
  // Using useLayoutEffect as it's synchronous and prevents flicker
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (open) {
      setName(`${sourceSet.name} (Copy)`);
      setTargetMarket(sourceSet.targetMarket);
      setNameError(null);
    }
  }, [sourceSet.id, sourceSet.name, sourceSet.targetMarket, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Available markets (predefined + user's existing)
  const availableMarkets = getAvailableMarkets(userMarkets);

  // Handle name change with validation
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    if (value.trim().length === 0) {
      setNameError("Name is required");
    } else if (value.length > 100) {
      setNameError("Name must be 100 characters or less");
    } else {
      setNameError(null);
    }
  }, []);

  // Handle copy submission
  const handleCopy = useCallback(async () => {
    // Validate name
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setNameError("Name is required");
      return;
    }

    await onCopy({
      name: trimmedName,
      targetMarket,
    });

    // Dialog will be closed by parent after successful copy
  }, [name, targetMarket, onCopy]);

  // Check if copy is to same market
  const isSameMarket = targetMarket === sourceSet.targetMarket;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Criteria Set
          </DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{sourceSet.name}&quot; with {sourceSet.criteriaCount} criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="copy-name">Name</Label>
            <Input
              id="copy-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter name for copied criteria set"
              disabled={isCopying}
              aria-invalid={!!nameError}
            />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </div>

          {/* Target Market Select */}
          <div className="grid gap-2">
            <Label htmlFor="copy-market">Target Market</Label>
            <Select value={targetMarket} onValueChange={setTargetMarket} disabled={isCopying}>
              <SelectTrigger id="copy-market">
                <SelectValue placeholder="Select target market" />
              </SelectTrigger>
              <SelectContent>
                {availableMarkets.map((market) => (
                  <SelectItem key={market} value={market}>
                    {getMarketDisplayName(market)}
                    {market === sourceSet.targetMarket && " (current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSameMarket && (
              <p className="text-sm text-muted-foreground">
                Copying to the same market for A/B testing variations
              </p>
            )}
          </div>

          {/* Source Info Summary */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Source: {sourceSet.name}</p>
            <p className="text-muted-foreground">
              {sourceSet.criteriaCount} criteria from {getMarketDisplayName(sourceSet.targetMarket)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCopying}>
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={isCopying || !!nameError || name.trim().length === 0}
          >
            {isCopying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Criteria
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
