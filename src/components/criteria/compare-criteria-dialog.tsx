"use client";

/**
 * Compare Criteria Dialog Component
 *
 * Story 5.6: Compare Criteria Sets
 *
 * AC-5.6.1: Select Two Criteria Sets for Comparison
 * - Dialog with Set A and Set B selection dropdowns
 * - Cannot proceed until both sets selected
 * - Cannot select same set for both A and B
 *
 * AC-5.6.2: Side-by-Side Criteria Differences
 * - Shows criteria differences view after comparison
 *
 * AC-5.6.3, AC-5.6.4: Score Comparison
 * - Shows score comparison view with rankings
 */

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare, LayoutList, TrendingUp } from "lucide-react";
import { getMarketDisplayName } from "@/lib/constants/markets";
import { useCompareCriteria } from "@/hooks/use-compare-criteria";
import { CriteriaDifferencesView } from "@/components/criteria/criteria-differences-view";
import { ScoreComparisonView } from "@/components/criteria/score-comparison-view";
import type { CriteriaVersion } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

interface CompareCriteriaDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** All available criteria sets for selection */
  criteriaSets: CriteriaVersion[];
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Dialog for comparing two criteria sets
 *
 * Features:
 * - Two dropdown selects for Set A and Set B
 * - Cannot select same set for both (filtered out)
 * - Shows criteria set info (name, market, criteria count)
 * - Tabbed view for differences and scores after comparison
 */
export function CompareCriteriaDialog({
  open,
  onOpenChange,
  criteriaSets,
}: CompareCriteriaDialogProps) {
  // Selection state
  const [setAId, setSetAId] = useState<string | null>(null);
  const [setBId, setSetBId] = useState<string | null>(null);

  // Comparison hook
  const { compareCriteria, isComparing, result, reset } = useCompareCriteria();

  // Filtered options for each dropdown (exclude the other selection)
  const setAOptions = useMemo(
    () => criteriaSets.filter((set) => set.id !== setBId),
    [criteriaSets, setBId]
  );

  const setBOptions = useMemo(
    () => criteriaSets.filter((set) => set.id !== setAId),
    [criteriaSets, setAId]
  );

  // Get selected set objects for display
  const selectedSetA = useMemo(
    () => criteriaSets.find((s) => s.id === setAId),
    [criteriaSets, setAId]
  );

  const selectedSetB = useMemo(
    () => criteriaSets.find((s) => s.id === setBId),
    [criteriaSets, setBId]
  );

  // Can compare only when both sets are selected and different
  const canCompare = setAId && setBId && setAId !== setBId;

  // Handle comparison
  const handleCompare = useCallback(async () => {
    if (!setAId || !setBId) return;
    await compareCriteria(setAId, setBId);
  }, [setAId, setBId, compareCriteria]);

  // Handle dialog close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset state when closing
        setSetAId(null);
        setSetBId(null);
        reset();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, reset]
  );

  // Handle starting a new comparison
  const handleNewComparison = useCallback(() => {
    setSetAId(null);
    setSetBId(null);
    reset();
  }, [reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Criteria Sets
          </DialogTitle>
          <DialogDescription>
            {result
              ? `Comparing "${result.setA.name}" vs "${result.setB.name}"`
              : "Select two criteria sets to compare their rules, scores, and rankings."}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          /* Selection Phase */
          <div className="space-y-6 py-4">
            {/* Set A Selection */}
            <div className="space-y-2">
              <Label htmlFor="set-a">Set A</Label>
              <Select
                value={setAId ?? ""}
                onValueChange={(value) => setSetAId(value || null)}
                disabled={isComparing}
              >
                <SelectTrigger id="set-a">
                  <SelectValue placeholder="Select first criteria set" />
                </SelectTrigger>
                <SelectContent>
                  {setAOptions.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      <div className="flex items-center gap-2">
                        <span>{set.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {set.criteria.length} criteria
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getMarketDisplayName(set.targetMarket)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSetA && (
                <p className="text-xs text-muted-foreground">
                  {selectedSetA.criteria.length} criteria |{" "}
                  {getMarketDisplayName(selectedSetA.targetMarket)} | v{selectedSetA.version}
                </p>
              )}
            </div>

            {/* Set B Selection */}
            <div className="space-y-2">
              <Label htmlFor="set-b">Set B</Label>
              <Select
                value={setBId ?? ""}
                onValueChange={(value) => setSetBId(value || null)}
                disabled={isComparing}
              >
                <SelectTrigger id="set-b">
                  <SelectValue placeholder="Select second criteria set" />
                </SelectTrigger>
                <SelectContent>
                  {setBOptions.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      <div className="flex items-center gap-2">
                        <span>{set.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {set.criteria.length} criteria
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getMarketDisplayName(set.targetMarket)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSetB && (
                <p className="text-xs text-muted-foreground">
                  {selectedSetB.criteria.length} criteria |{" "}
                  {getMarketDisplayName(selectedSetB.targetMarket)} | v{selectedSetB.version}
                </p>
              )}
            </div>

            {/* Compare Button */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isComparing}
              >
                Cancel
              </Button>
              <Button onClick={handleCompare} disabled={!canCompare || isComparing}>
                {isComparing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare className="mr-2 h-4 w-4" />
                    Compare
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Results Phase */
          <div className="space-y-4 py-4">
            <Tabs defaultValue="differences" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="differences" className="gap-2">
                  <LayoutList className="h-4 w-4" />
                  Differences
                </TabsTrigger>
                <TabsTrigger value="scores" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Scores & Rankings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="differences" className="mt-4">
                <CriteriaDifferencesView
                  differences={result.differences}
                  setAName={result.setA.name}
                  setBName={result.setB.name}
                />
              </TabsContent>

              <TabsContent value="scores" className="mt-4">
                <ScoreComparisonView
                  setA={result.setA}
                  setB={result.setB}
                  rankingChanges={result.rankingChanges}
                  sampleSize={result.sampleSize}
                />
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleNewComparison}>
                New Comparison
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
