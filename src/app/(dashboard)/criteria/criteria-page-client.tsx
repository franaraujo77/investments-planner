"use client";

/**
 * Criteria Page Client Component
 *
 * Story 5.1: Define Scoring Criteria
 *
 * AC-5.1.1: Create new criterion
 * AC-5.1.3: Criteria organized by market/asset type tabs
 * AC-5.1.4: CriteriaBlock interactions
 *
 * Client component for the criteria page with:
 * - CriteriaList with tabs
 * - "Add Criterion" button
 * - CriteriaForm in dialog/sheet
 * - Responsive layout
 */

import { useState, useCallback } from "react";
import { Plus, Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CriteriaList } from "@/components/criteria/criteria-list";
import { CriteriaForm, CriteriaSetForm } from "@/components/criteria/criteria-form";
import {
  useCriteria,
  useCreateCriteriaSet,
  useUpdateCriterion,
  useDeleteCriterion,
  useReorderCriteria,
  useAddCriterion,
} from "@/hooks/use-criteria";
import type { CreateCriterionRuleInput } from "@/lib/validations/criteria-schemas";
import { AVAILABLE_METRICS, AVAILABLE_OPERATORS } from "@/lib/validations/criteria-schemas";

type MetricValue = (typeof AVAILABLE_METRICS)[number];
type OperatorValue = (typeof AVAILABLE_OPERATORS)[number];

interface CriterionFormValues {
  name: string;
  metric: MetricValue;
  operator: OperatorValue;
  value: string;
  value2?: string | undefined;
  points: number;
  requiredFundamentals: string[];
}

/**
 * Criteria Page Header
 */
function CriteriaHeader({
  onCreateSet,
  canCreate,
  isLoading,
}: {
  onCreateSet: () => void;
  canCreate: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Scoring Criteria</h1>
        <p className="text-muted-foreground">
          Define criteria to evaluate and score assets based on your investment philosophy.
        </p>
      </div>
      <Button onClick={onCreateSet} disabled={!canCreate || isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        New Criteria Set
      </Button>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ onCreateSet }: { onCreateSet: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Settings2 className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Scoring Criteria Yet</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Create your first criteria set to define how assets should be evaluated and scored. Criteria
        help you systematically assess investments based on your strategy.
      </p>
      <Button onClick={onCreateSet}>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Criteria Set
      </Button>
    </div>
  );
}

export function CriteriaPageClient() {
  // Data fetching
  const { criteria, criteriaByAssetType, isLoading, error, canCreate, refresh } = useCriteria();

  // Mutations
  const { createCriteriaSet, isCreating } = useCreateCriteriaSet();
  const { updateCriterion, isUpdating } = useUpdateCriterion();
  const { deleteCriterion, isDeleting } = useDeleteCriterion();
  const { reorderCriteria, isReordering } = useReorderCriteria();
  const { addCriterion, isAdding } = useAddCriterion();

  // UI state
  const [isCreateSetOpen, setIsCreateSetOpen] = useState(false);
  const [isAddCriterionOpen, setIsAddCriterionOpen] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>();
  const [_addToAssetType, setAddToAssetType] = useState<string>("stock");

  // Loading state
  const isMutating = isCreating || isUpdating || isDeleting || isReordering || isAdding;

  /**
   * Handle creating a new criteria set
   */
  const handleCreateSet = useCallback(
    async (values: { name: string; assetType: string; targetMarket: string }) => {
      // Create with a single initial criterion
      const result = await createCriteriaSet({
        ...values,
        criteria: [
          {
            name: "Sample Criterion",
            metric: "dividend_yield",
            operator: "gt",
            value: "0",
            points: 10,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      if (result) {
        setIsCreateSetOpen(false);
        setSelectedSetId(result.id);
        refresh();
      }
    },
    [createCriteriaSet, refresh]
  );

  /**
   * Handle adding a criterion to a set
   */
  const handleAddCriterion = useCallback(
    async (values: CriterionFormValues) => {
      if (!selectedSetId) return;

      const input: CreateCriterionRuleInput = {
        name: values.name,
        metric: values.metric,
        operator: values.operator,
        value: values.value,
        value2: values.value2 || undefined,
        points: values.points,
        requiredFundamentals: values.requiredFundamentals,
        sortOrder: 999, // Will be placed at end
      };

      const result = await addCriterion(selectedSetId, input);

      if (result) {
        setIsAddCriterionOpen(false);
        refresh();
      }
    },
    [selectedSetId, addCriterion, refresh]
  );

  /**
   * Handle updating a criterion
   */
  const handleUpdateCriterion = useCallback(
    async (
      criteriaId: string,
      criterionId: string,
      updates: Parameters<typeof updateCriterion>[2]
    ) => {
      await updateCriterion(criteriaId, criterionId, updates);
      refresh();
    },
    [updateCriterion, refresh]
  );

  /**
   * Handle deleting a criterion
   */
  const handleDeleteCriterion = useCallback(
    async (criteriaId: string, criterionId: string) => {
      await deleteCriterion(criteriaId, criterionId);
      refresh();
    },
    [deleteCriterion, refresh]
  );

  /**
   * Handle reordering criteria
   */
  const handleReorderCriteria = useCallback(
    async (criteriaId: string, criterionIds: string[]) => {
      await reorderCriteria(criteriaId, criterionIds);
      refresh();
    },
    [reorderCriteria, refresh]
  );

  /**
   * Handle "Add Criterion" button click in list
   */
  const handleAddCriterionClick = useCallback(
    (assetType: string) => {
      // Find the first set for this asset type
      const sets = criteriaByAssetType[assetType];
      if (sets && sets.length > 0) {
        setSelectedSetId(sets[0]!.id);
        setAddToAssetType(assetType);
        setIsAddCriterionOpen(true);
      } else {
        // No set exists for this asset type, prompt to create one
        setIsCreateSetOpen(true);
      }
    },
    [criteriaByAssetType]
  );

  /**
   * Handle selecting a criteria set
   */
  const handleSelectSet = useCallback((criteriaId: string) => {
    setSelectedSetId(criteriaId);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  const hasCriteria = criteria.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <CriteriaHeader
        onCreateSet={() => setIsCreateSetOpen(true)}
        canCreate={canCreate}
        isLoading={isMutating}
      />

      {/* Content */}
      {hasCriteria ? (
        <CriteriaList
          criteriaByAssetType={criteriaByAssetType}
          selectedSetId={selectedSetId}
          onUpdateCriterion={handleUpdateCriterion}
          onDeleteCriterion={handleDeleteCriterion}
          onReorderCriteria={handleReorderCriteria}
          onAddCriterion={handleAddCriterionClick}
          onSelectSet={handleSelectSet}
          disabled={isMutating}
        />
      ) : (
        <EmptyState onCreateSet={() => setIsCreateSetOpen(true)} />
      )}

      {/* Create Criteria Set Dialog */}
      <Dialog open={isCreateSetOpen} onOpenChange={setIsCreateSetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Criteria Set</DialogTitle>
            <DialogDescription>
              Define a new set of criteria for evaluating assets. Each set is specific to an asset
              type and target market.
            </DialogDescription>
          </DialogHeader>
          <CriteriaSetForm
            onSubmit={handleCreateSet}
            onCancel={() => setIsCreateSetOpen(false)}
            isLoading={isCreating}
            submitText="Create Criteria Set"
          />
        </DialogContent>
      </Dialog>

      {/* Add Criterion Sheet */}
      <Sheet open={isAddCriterionOpen} onOpenChange={setIsAddCriterionOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Criterion</SheetTitle>
            <SheetDescription>
              Add a new criterion to evaluate assets. Define the metric, comparison, and points to
              award.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CriteriaForm
              onSubmit={handleAddCriterion}
              onCancel={() => setIsAddCriterionOpen(false)}
              isLoading={isAdding}
              submitText="Add Criterion"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
