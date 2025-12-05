"use client";

/**
 * Subclass List Component
 *
 * Story 4.2: Define Subclasses
 * Story 4.4: Set Allocation Ranges for Subclasses
 *
 * AC-4.2.1: View list of subclasses within asset class
 * AC-4.4.2: Show warning when subclass max exceeds parent max
 * AC-4.4.3: Show warning when sum of subclass minimums exceeds parent max
 *
 * Displays a list of subclasses for an asset class with
 * the ability to add, edit, delete subclasses, and set allocation ranges.
 */

import { Loader2 } from "lucide-react";
import { useSubclasses, useSubclassAllocationValidation } from "@/hooks/use-asset-classes";
import { SubclassCard } from "./subclass-card";
import { SubclassForm } from "./subclass-form";
import { SubclassAllocationWarningWithData } from "./subclass-allocation-warning";

interface SubclassListProps {
  classId: string;
}

export function SubclassList({ classId }: SubclassListProps) {
  const { subclasses, isLoading, error, canCreate, refresh } = useSubclasses(classId);
  const {
    validation,
    hasWarnings,
    refresh: refreshValidation,
  } = useSubclassAllocationValidation(classId, true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-center text-sm text-destructive">Failed to load subclasses</div>
    );
  }

  // Handle subclass update (refreshes both list and validation)
  const handleSubclassUpdate = () => {
    refresh();
    refreshValidation();
  };

  // Handle allocation change (just refreshes validation)
  const handleAllocationChange = () => {
    refreshValidation();
  };

  return (
    <div className="space-y-2">
      {/* AC-4.4.2, AC-4.4.3: Subclass allocation warnings */}
      <SubclassAllocationWarningWithData
        hasWarnings={hasWarnings}
        warnings={validation?.warnings ?? []}
        className="mb-3"
      />

      {subclasses.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">No subclasses yet</p>
      ) : (
        <div className="space-y-1">
          {subclasses.map((subclass) => (
            <SubclassCard
              key={subclass.id}
              subclass={subclass}
              onUpdate={handleSubclassUpdate}
              onDelete={handleSubclassUpdate}
              onAllocationChange={handleAllocationChange}
            />
          ))}
        </div>
      )}

      {/* Add subclass form */}
      <SubclassForm classId={classId} onSuccess={handleSubclassUpdate} disabled={!canCreate} />
    </div>
  );
}
