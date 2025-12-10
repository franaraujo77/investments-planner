"use client";

/**
 * Criteria List Component
 *
 * Story 5.1: Define Scoring Criteria
 * Story 5.4: Criteria Library View
 * Story 5.5: Copy Criteria Set
 * Story 5.6: Compare Criteria Sets
 * Story 5.7: Criteria Preview (Impact Simulation)
 *
 * AC-5.1.3: Criteria Organization
 * - Tabs for asset types
 * - Tab badge showing criteria count
 * - Tab subtitle showing last modified
 * - Empty state for tabs with no criteria
 *
 * AC-5.1.4: CriteriaBlock Component Interaction
 * - Drag-and-drop reordering with @dnd-kit
 *
 * AC-5.4.4: Search/Filter Criteria by Name
 * - Search input with debounced filtering
 * - Case-insensitive name matching
 * - Clear search when switching tabs
 *
 * AC-5.5.1: Copy Action Available on Criteria Sets
 * - Three-dot menu on each criteria set header
 * - "Copy to..." option in dropdown
 *
 * AC-5.7.1: Preview Impact Button Available During Editing
 * - Preview button to simulate criteria impact on assets
 *
 * List component showing criteria organized by asset type tabs.
 */

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CriteriaBlock } from "@/components/fintech/criteria-block";
import { cn } from "@/lib/utils";
import type { CriteriaVersion, CriterionRule } from "@/lib/db/schema";
import type { UpdateCriterionInput } from "@/lib/validations/criteria-schemas";
import { Plus, FileQuestion, SearchX, MoreVertical, Copy, GitCompare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CriteriaSearch } from "@/components/criteria/criteria-search";
import {
  CopyCriteriaDialog,
  type SourceCriteriaSet,
  type CopyOptions,
} from "@/components/criteria/copy-criteria-dialog";
import { CompareCriteriaDialog } from "@/components/criteria/compare-criteria-dialog";
import { PreviewImpactModal } from "@/components/criteria/preview-impact-modal";
import { useCriteriaFilter } from "@/hooks/use-criteria-filter";
import { useCopyCriteria } from "@/hooks/use-copy-criteria";
import { usePreviewCriteria } from "@/hooks/use-preview-criteria";

interface CriteriaListProps {
  /** Criteria sets grouped by asset type */
  criteriaByAssetType: Record<string, CriteriaVersion[]>;
  /** Currently selected criteria set (for editing) */
  selectedSetId?: string | undefined;
  /** Callback to update a criterion */
  onUpdateCriterion: (
    criteriaId: string,
    criterionId: string,
    updates: UpdateCriterionInput
  ) => Promise<void>;
  /** Callback to delete a criterion */
  onDeleteCriterion: (criteriaId: string, criterionId: string) => Promise<void>;
  /** Callback to reorder criteria */
  onReorderCriteria: (criteriaId: string, criterionIds: string[]) => Promise<void>;
  /** Callback when "Add Criterion" is clicked */
  onAddCriterion?: (assetType: string) => void;
  /** Callback when a criteria set is selected */
  onSelectSet?: (criteriaId: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
}

/**
 * Sortable criterion block wrapper
 */
function SortableCriterionBlock({
  criterion,
  onUpdate,
  onDelete,
  disabled,
}: {
  criterion: CriterionRule;
  onUpdate: (criterionId: string, updates: UpdateCriterionInput) => Promise<void>;
  onDelete: (criterionId: string) => Promise<void>;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: criterion.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CriteriaBlock
        criterion={criterion}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isDraggable={true}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Format date for display
 */
function formatLastModified(date: Date | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get the most recent update date from a list of criteria sets
 */
function getMostRecentUpdate(sets: CriteriaVersion[]): Date | null {
  if (sets.length === 0) return null;
  return sets.reduce(
    (latest, set) => {
      const setDate = set.updatedAt ?? set.createdAt;
      if (!setDate) return latest;
      if (!latest) return setDate;
      return new Date(setDate) > new Date(latest) ? setDate : latest;
    },
    null as Date | null
  );
}

/**
 * Get total criteria count across all sets for an asset type
 */
function getTotalCriteriaCount(sets: CriteriaVersion[]): number {
  return sets.reduce((total, set) => total + set.criteria.length, 0);
}

export function CriteriaList({
  criteriaByAssetType,
  selectedSetId,
  onUpdateCriterion,
  onDeleteCriterion,
  onReorderCriteria,
  onAddCriterion,
  onSelectSet,
  disabled = false,
  className,
}: CriteriaListProps) {
  const assetTypes = Object.keys(criteriaByAssetType);
  const [activeTab, setActiveTab] = useState(assetTypes[0] ?? "stock");

  // AC-5.4.4: Search/Filter functionality
  const { searchTerm, setSearchTerm, clearSearch, filterCriteria, isSearchActive } =
    useCriteriaFilter();

  // AC-5.5.1: Copy criteria functionality
  const { copyCriteria, isCopying } = useCopyCriteria();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceSet, setCopySourceSet] = useState<SourceCriteriaSet | null>(null);

  // AC-5.6.1: Compare criteria functionality
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // AC-5.7.1: Preview impact functionality
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const {
    previewCriteria,
    isLoading: isPreviewLoading,
    result: previewResult,
    error: previewError,
    reset: resetPreview,
  } = usePreviewCriteria();

  // Get all criteria sets for compare dialog
  const allCriteriaSets = Object.values(criteriaByAssetType).flat();

  // Get user's existing markets for the copy dialog dropdown
  const userMarkets = allCriteriaSets
    .map((set) => set.targetMarket)
    .filter((market, index, self) => self.indexOf(market) === index);

  // AC-5.4.4: Clear search when switching tabs
  useEffect(() => {
    clearSearch();
  }, [activeTab, clearSearch]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get the currently active criteria set for the selected asset type
  const activeSets = criteriaByAssetType[activeTab] ?? [];
  const activeSet = selectedSetId ? activeSets.find((s) => s.id === selectedSetId) : activeSets[0];

  /**
   * Handle drag end for reordering
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !activeSet) return;

      const oldIndex = activeSet.criteria.findIndex((c) => c.id === active.id);
      const newIndex = activeSet.criteria.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Calculate new order
      const reorderedCriteria = arrayMove(activeSet.criteria, oldIndex, newIndex);
      const criterionIds = reorderedCriteria.map((c: CriterionRule) => c.id);

      await onReorderCriteria(activeSet.id, criterionIds);
    },
    [activeSet, onReorderCriteria]
  );

  /**
   * Handle criterion update
   */
  const handleUpdateCriterion = useCallback(
    async (criterionId: string, updates: UpdateCriterionInput) => {
      if (!activeSet) return;
      await onUpdateCriterion(activeSet.id, criterionId, updates);
    },
    [activeSet, onUpdateCriterion]
  );

  /**
   * Handle criterion delete
   */
  const handleDeleteCriterion = useCallback(
    async (criterionId: string) => {
      if (!activeSet) return;
      await onDeleteCriterion(activeSet.id, criterionId);
    },
    [activeSet, onDeleteCriterion]
  );

  /**
   * Handle copy action click - AC-5.5.1
   */
  const handleCopyClick = useCallback((set: CriteriaVersion, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent set selection
    setCopySourceSet({
      id: set.id,
      name: set.name,
      assetType: set.assetType,
      targetMarket: set.targetMarket,
      criteriaCount: set.criteria.length,
    });
    setCopyDialogOpen(true);
  }, []);

  /**
   * Handle copy confirmation - AC-5.5.4
   */
  const handleCopyConfirm = useCallback(
    async (options: CopyOptions) => {
      if (!copySourceSet) return;
      const result = await copyCriteria(copySourceSet.id, options);
      if (result) {
        setCopyDialogOpen(false);
        setCopySourceSet(null);
      }
    },
    [copySourceSet, copyCriteria]
  );

  /**
   * Handle preview click - AC-5.7.1
   */
  const handlePreviewClick = useCallback(
    async (set: CriteriaVersion, event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent set selection
      setPreviewDialogOpen(true);
      // Trigger initial preview calculation
      await previewCriteria(set.criteria, set.id);
    },
    [previewCriteria]
  );

  /**
   * Handle preview dialog close - AC-5.7.1
   */
  const handlePreviewDialogChange = useCallback(
    (open: boolean) => {
      setPreviewDialogOpen(open);
      if (!open) {
        resetPreview();
      }
    },
    [resetPreview]
  );

  // Empty state when no criteria exist at all
  if (assetTypes.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No criteria defined</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Create your first criteria set to start evaluating assets.
        </p>
        {onAddCriterion && (
          <Button onClick={() => onAddCriterion("stock")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Criteria Set
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {assetTypes.map((assetType) => {
            const sets = criteriaByAssetType[assetType] ?? [];
            const criteriaCount = getTotalCriteriaCount(sets);

            return (
              <TabsTrigger
                key={assetType}
                value={assetType}
                className="flex items-center gap-2 capitalize"
              >
                <span>{assetType}</span>
                <Badge variant="secondary" className="text-xs">
                  {criteriaCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {assetTypes.map((assetType) => {
          const sets = criteriaByAssetType[assetType] ?? [];
          const lastModified = getMostRecentUpdate(sets);

          return (
            <TabsContent key={assetType} value={assetType} className="space-y-4">
              {/* Header with metadata and search - AC-5.4.4 */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Last modified: {formatLastModified(lastModified)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* AC-5.4.4: Search/Filter Criteria by Name */}
                  <CriteriaSearch
                    value={searchTerm}
                    onChange={setSearchTerm}
                    disabled={disabled}
                    className="w-full sm:w-64"
                  />
                  {/* AC-5.6.1: Compare Criteria Button */}
                  {allCriteriaSets.length >= 2 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCompareDialogOpen(true)}
                      disabled={disabled}
                    >
                      <GitCompare className="mr-2 h-4 w-4" />
                      Compare
                    </Button>
                  )}
                  {onAddCriterion && (
                    <Button size="sm" variant="outline" onClick={() => onAddCriterion(assetType)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Criterion
                    </Button>
                  )}
                </div>
              </div>

              {/* Criteria sets */}
              {sets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/50">
                  <FileQuestion className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No criteria for {assetType} assets yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sets.map((set) => {
                    // AC-5.4.4: Apply search filter to criteria
                    const filteredCriteria = filterCriteria(set.criteria);
                    const hasFilteredResults = filteredCriteria.length > 0;

                    return (
                      <div
                        key={set.id}
                        className={cn(
                          "rounded-lg border p-4 space-y-3",
                          selectedSetId === set.id && "ring-2 ring-primary",
                          onSelectSet && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => onSelectSet?.(set.id)}
                      >
                        {/* Set header with copy action - AC-5.5.1 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{set.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {set.targetMarket} • Version {set.version}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {isSearchActive
                                ? `${filteredCriteria.length}/${set.criteria.length}`
                                : `${set.criteria.length}`}{" "}
                              criteria
                            </Badge>
                            {/* AC-5.5.1: Three-dot menu with copy action */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={disabled}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handlePreviewClick(set, e as unknown as React.MouseEvent)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview Impact
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleCopyClick(set, e as unknown as React.MouseEvent)
                                  }
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy to...
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* AC-5.4.4: Show "no match" when filter returns empty */}
                        {isSearchActive && !hasFilteredResults ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg bg-muted/50">
                            <SearchX className="h-6 w-6 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No criteria match your search
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearSearch();
                              }}
                              className="mt-1"
                            >
                              Clear search
                            </Button>
                          </div>
                        ) : (
                          /* Criteria list with drag and drop */
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={filteredCriteria.map((c) => c.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {filteredCriteria
                                  .sort((a, b) => a.sortOrder - b.sortOrder)
                                  .map((criterion) => (
                                    <SortableCriterionBlock
                                      key={criterion.id}
                                      criterion={criterion}
                                      onUpdate={handleUpdateCriterion}
                                      onDelete={handleDeleteCriterion}
                                      disabled={disabled}
                                    />
                                  ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* AC-5.5.2: Copy Criteria Dialog */}
      {copySourceSet && (
        <CopyCriteriaDialog
          open={copyDialogOpen}
          onOpenChange={(open) => {
            setCopyDialogOpen(open);
            if (!open) setCopySourceSet(null);
          }}
          sourceSet={copySourceSet}
          userMarkets={userMarkets}
          onCopy={handleCopyConfirm}
          isCopying={isCopying}
        />
      )}

      {/* AC-5.6.1: Compare Criteria Dialog */}
      <CompareCriteriaDialog
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
        criteriaSets={allCriteriaSets}
      />

      {/* AC-5.7.1: Preview Impact Modal */}
      <PreviewImpactModal
        open={previewDialogOpen}
        onOpenChange={handlePreviewDialogChange}
        result={previewResult}
        isLoading={isPreviewLoading}
        error={previewError}
      />
    </div>
  );
}
