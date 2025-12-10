"use client";

/**
 * Criteria React Hooks
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Provides hooks for criteria operations:
 * - useCriteria: Fetch all criteria sets
 * - useCriteriaSet: Fetch a single criteria set
 * - useCreateCriteriaSet: Create a new criteria set
 * - useUpdateCriteriaSet: Update an existing criteria set
 * - useDeleteCriteriaSet: Delete a criteria set
 * - useAddCriterion: Add a criterion to a set
 * - useUpdateCriterion: Update a single criterion
 * - useDeleteCriterion: Delete a criterion from a set
 * - useReorderCriteria: Reorder criteria within a set
 *
 * AC-5.1.1: Create new criterion
 * AC-5.1.3: Criteria organization by market/asset type
 * AC-5.1.4: CriteriaBlock interactions (CRUD, reorder)
 * AC-5.1.6: Criteria versioning (immutable)
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CriteriaVersion, CriterionRule } from "@/lib/db/schema";
import type {
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
  CreateCriterionRuleInput,
  UpdateCriterionInput,
} from "@/lib/validations/criteria-schemas";

// =============================================================================
// TYPES
// =============================================================================

interface CriteriaListResponse {
  data: CriteriaVersion[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface CriteriaResponse {
  data: CriteriaVersion;
}

interface DeleteResponse {
  success: boolean;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// useCriteria HOOK
// =============================================================================

/**
 * Hook for fetching criteria sets
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.3: Criteria organized by market/asset type
 *
 * Returns:
 * - criteria: Array of criteria sets
 * - isLoading: Loading state
 * - error: Error message if any
 * - canCreate: Whether user can create more criteria sets
 * - refresh: Function to manually refresh the list
 */
export function useCriteria(options?: {
  assetType?: string;
  targetMarket?: string;
  isActive?: boolean;
}) {
  const [criteria, setCriteria] = useState<CriteriaVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [limit, setLimit] = useState(50);

  const fetchCriteria = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.assetType) params.set("assetType", options.assetType);
      if (options?.targetMarket) params.set("targetMarket", options.targetMarket);
      if (options?.isActive !== undefined) params.set("isActive", String(options.isActive));

      const url = `/api/criteria${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const result = (await response.json()) as CriteriaListResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      const successResult = result as CriteriaListResponse;
      setCriteria(successResult.data);
      setCanCreate(successResult.meta.canCreate);
      setLimit(successResult.meta.limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch criteria";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [options?.assetType, options?.targetMarket, options?.isActive]);

  // Fetch on mount and when options change
  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  // Group by asset type for organization
  const criteriaByAssetType = criteria.reduce(
    (acc, set) => {
      const existing = acc[set.assetType] ?? [];
      existing.push(set);
      acc[set.assetType] = existing;
      return acc;
    },
    {} as Record<string, CriteriaVersion[]>
  );

  return {
    criteria,
    criteriaByAssetType,
    isLoading,
    error,
    canCreate,
    limit,
    refresh: fetchCriteria,
  };
}

// =============================================================================
// useCriteriaSet HOOK
// =============================================================================

/**
 * Hook for fetching a single criteria set
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Returns:
 * - criteriaSet: The criteria set
 * - isLoading: Loading state
 * - error: Error message if any
 * - refresh: Function to manually refresh
 */
export function useCriteriaSet(criteriaId: string | null) {
  const [criteriaSet, setCriteriaSet] = useState<CriteriaVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCriteriaSet = useCallback(async () => {
    if (!criteriaId) {
      setCriteriaSet(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/criteria/${criteriaId}`);
      const result = (await response.json()) as CriteriaResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      setCriteriaSet((result as CriteriaResponse).data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch criteria set";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [criteriaId]);

  // Fetch when criteriaId changes
  useEffect(() => {
    fetchCriteriaSet();
  }, [fetchCriteriaSet]);

  return {
    criteriaSet,
    isLoading,
    error,
    refresh: fetchCriteriaSet,
  };
}

// =============================================================================
// useCreateCriteriaSet HOOK
// =============================================================================

/**
 * Hook for creating criteria sets
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.1: Create new criterion set
 * AC-5.1.6: Creates version 1
 *
 * Returns:
 * - createCriteriaSet: Function to create a new criteria set
 * - isCreating: Loading state
 * - error: Error message if any
 */
export function useCreateCriteriaSet() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCriteriaSet = useCallback(
    async (input: CreateCriteriaSetInput): Promise<CriteriaVersion | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch("/api/criteria", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = (await response.json()) as CriteriaResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "LIMIT_EXCEEDED") {
            toast.error("Maximum criteria sets reached");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to create criteria set");
          }

          return null;
        }

        // Success
        toast.success("Criteria set created");
        router.refresh();

        return (result as CriteriaResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to create criteria set");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  return {
    createCriteriaSet,
    isCreating,
    error,
  };
}

// =============================================================================
// useUpdateCriteriaSet HOOK
// =============================================================================

/**
 * Hook for updating criteria sets
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Edit any field
 * AC-5.1.6: Creates new version
 *
 * Returns:
 * - updateCriteriaSet: Function to update a criteria set
 * - isUpdating: Loading state
 * - error: Error message if any
 */
export function useUpdateCriteriaSet() {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCriteriaSet = useCallback(
    async (id: string, input: UpdateCriteriaSetInput): Promise<CriteriaVersion | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/criteria/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = (await response.json()) as CriteriaResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Criteria set not found");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to update criteria set");
          }

          return null;
        }

        // Success - no toast for inline save (visual confirmation in UI)
        router.refresh();

        return (result as CriteriaResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to update criteria set");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [router]
  );

  return {
    updateCriteriaSet,
    isUpdating,
    error,
  };
}

// =============================================================================
// useDeleteCriteriaSet HOOK
// =============================================================================

/**
 * Hook for deleting criteria sets
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Returns:
 * - deleteCriteriaSet: Function to delete a criteria set
 * - isDeleting: Loading state
 * - error: Error message if any
 */
export function useDeleteCriteriaSet() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCriteriaSet = useCallback(
    async (id: string): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);

      try {
        const response = await fetch(`/api/criteria/${id}`, {
          method: "DELETE",
        });

        const result = (await response.json()) as DeleteResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Criteria set not found");
          } else {
            toast.error("Failed to delete criteria set");
          }

          return false;
        }

        // Success
        toast.success("Criteria set deleted");
        router.refresh();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to delete criteria set");
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  return {
    deleteCriteriaSet,
    isDeleting,
    error,
  };
}

// =============================================================================
// useAddCriterion HOOK
// =============================================================================

/**
 * Hook for adding a criterion to a set
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.1: Create new criterion
 * AC-5.1.6: Creates new version
 *
 * Returns:
 * - addCriterion: Function to add a criterion
 * - isAdding: Loading state
 * - error: Error message if any
 */
export function useAddCriterion() {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCriterion = useCallback(
    async (
      criteriaId: string,
      criterion: CreateCriterionRuleInput
    ): Promise<CriteriaVersion | null> => {
      setIsAdding(true);
      setError(null);

      try {
        // Add criterion by updating the criteria array
        // First fetch current criteria
        const getResponse = await fetch(`/api/criteria/${criteriaId}`);
        const getResult = (await getResponse.json()) as CriteriaResponse | APIError;

        if (!getResponse.ok) {
          const errorResult = getResult as APIError;
          setError(errorResult.error);
          toast.error("Failed to add criterion");
          return null;
        }

        const currentSet = (getResult as CriteriaResponse).data;
        const maxSortOrder = currentSet.criteria.reduce((max, c) => Math.max(max, c.sortOrder), -1);

        // Add new criterion with generated ID
        const newCriterion: CriterionRule = {
          id: crypto.randomUUID(),
          name: criterion.name,
          metric: criterion.metric,
          operator: criterion.operator,
          value: criterion.value,
          value2: criterion.value2,
          points: criterion.points,
          requiredFundamentals: criterion.requiredFundamentals,
          sortOrder: criterion.sortOrder ?? maxSortOrder + 1,
        };

        const updatedCriteria = [...currentSet.criteria, newCriterion];

        // Update the set
        const response = await fetch(`/api/criteria/${criteriaId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ criteria: updatedCriteria }),
        });

        const result = (await response.json()) as CriteriaResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);
          toast.error("Failed to add criterion");
          return null;
        }

        // Success
        toast.success("Criterion added");
        router.refresh();

        return (result as CriteriaResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to add criterion");
        return null;
      } finally {
        setIsAdding(false);
      }
    },
    [router]
  );

  return {
    addCriterion,
    isAdding,
    error,
  };
}

// =============================================================================
// useUpdateCriterion HOOK
// =============================================================================

/**
 * Hook for updating a single criterion
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Inline edit any field
 * AC-5.1.6: Creates new version
 *
 * Returns:
 * - updateCriterion: Function to update a criterion
 * - isUpdating: Loading state
 * - error: Error message if any
 */
export function useUpdateCriterion() {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCriterion = useCallback(
    async (
      criteriaId: string,
      criterionId: string,
      updates: UpdateCriterionInput
    ): Promise<CriteriaVersion | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        // First fetch current criteria
        const getResponse = await fetch(`/api/criteria/${criteriaId}`);
        const getResult = (await getResponse.json()) as CriteriaResponse | APIError;

        if (!getResponse.ok) {
          const errorResult = getResult as APIError;
          setError(errorResult.error);
          toast.error("Failed to update criterion");
          return null;
        }

        const currentSet = (getResult as CriteriaResponse).data;
        const criterionIndex = currentSet.criteria.findIndex((c) => c.id === criterionId);

        if (criterionIndex === -1) {
          setError("Criterion not found");
          toast.error("Criterion not found");
          return null;
        }

        // Apply updates - assertion safe because we checked criterionIndex !== -1 above
        const existingCriterion = currentSet.criteria[criterionIndex]!;
        const updatedCriterion: CriterionRule = {
          id: existingCriterion.id,
          name: updates.name ?? existingCriterion.name,
          metric: updates.metric ?? existingCriterion.metric,
          operator: updates.operator ?? existingCriterion.operator,
          value: updates.value ?? existingCriterion.value,
          value2: updates.value2 !== undefined ? updates.value2 : existingCriterion.value2,
          points: updates.points ?? existingCriterion.points,
          requiredFundamentals:
            updates.requiredFundamentals ?? existingCriterion.requiredFundamentals,
          sortOrder: updates.sortOrder ?? existingCriterion.sortOrder,
        };

        const updatedCriteria = [...currentSet.criteria];
        updatedCriteria[criterionIndex] = updatedCriterion;

        // Update the set
        const response = await fetch(`/api/criteria/${criteriaId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ criteria: updatedCriteria }),
        });

        const result = (await response.json()) as CriteriaResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);
          toast.error("Failed to update criterion");
          return null;
        }

        // Success - no toast for inline save (visual confirmation in UI)
        router.refresh();

        return (result as CriteriaResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to update criterion");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [router]
  );

  return {
    updateCriterion,
    isUpdating,
    error,
  };
}

// =============================================================================
// useDeleteCriterion HOOK
// =============================================================================

/**
 * Hook for deleting a criterion from a set
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Delete option
 * AC-5.1.6: Creates new version
 *
 * Returns:
 * - deleteCriterion: Function to delete a criterion
 * - isDeleting: Loading state
 * - error: Error message if any
 */
export function useDeleteCriterion() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCriterion = useCallback(
    async (criteriaId: string, criterionId: string): Promise<CriteriaVersion | null> => {
      setIsDeleting(true);
      setError(null);

      try {
        // First fetch current criteria
        const getResponse = await fetch(`/api/criteria/${criteriaId}`);
        const getResult = (await getResponse.json()) as CriteriaResponse | APIError;

        if (!getResponse.ok) {
          const errorResult = getResult as APIError;
          setError(errorResult.error);
          toast.error("Failed to delete criterion");
          return null;
        }

        const currentSet = (getResult as CriteriaResponse).data;
        const updatedCriteria = currentSet.criteria.filter((c) => c.id !== criterionId);

        if (updatedCriteria.length === currentSet.criteria.length) {
          setError("Criterion not found");
          toast.error("Criterion not found");
          return null;
        }

        // If this would leave the set empty, just delete the whole set
        if (updatedCriteria.length === 0) {
          const deleteResponse = await fetch(`/api/criteria/${criteriaId}`, {
            method: "DELETE",
          });

          if (!deleteResponse.ok) {
            setError("Failed to delete criteria set");
            toast.error("Failed to delete criteria set");
            return null;
          }

          toast.success("Criteria set deleted (no criteria remaining)");
          router.refresh();
          return null;
        }

        // Update the set
        const response = await fetch(`/api/criteria/${criteriaId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ criteria: updatedCriteria }),
        });

        const result = (await response.json()) as CriteriaResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);
          toast.error("Failed to delete criterion");
          return null;
        }

        // Success
        toast.success("Criterion deleted");
        router.refresh();

        return (result as CriteriaResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to delete criterion");
        return null;
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  return {
    deleteCriterion,
    isDeleting,
    error,
  };
}

// =============================================================================
// useReorderCriteria HOOK
// =============================================================================

/**
 * Hook for reordering criteria within a set
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Drag handle for reordering
 * AC-5.1.6: Creates new version
 *
 * Returns:
 * - reorderCriteria: Function to reorder criteria
 * - isReordering: Loading state
 * - error: Error message if any
 */
export function useReorderCriteria() {
  const router = useRouter();
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorderCriteria = useCallback(
    async (criteriaId: string, criterionIds: string[]): Promise<CriteriaVersion | null> => {
      setIsReordering(true);
      setError(null);

      try {
        const response = await fetch(`/api/criteria/${criteriaId}/reorder`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ criterionIds }),
        });

        const result = (await response.json()) as CriteriaResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Criteria set not found");
          } else if (errorResult.code === "CRITERION_NOT_FOUND") {
            toast.error("One or more criteria not found");
          } else {
            toast.error("Failed to reorder criteria");
          }

          return null;
        }

        // Success - no toast for reorder (visual confirmation in UI)
        router.refresh();

        return (result as CriteriaResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to reorder criteria");
        return null;
      } finally {
        setIsReordering(false);
      }
    },
    [router]
  );

  return {
    reorderCriteria,
    isReordering,
    error,
  };
}
