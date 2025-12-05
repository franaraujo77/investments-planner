"use client";

/**
 * Asset Class and Subclass React Hooks
 *
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * Provides hooks for asset class operations:
 * - useAssetClasses: Fetch all asset classes
 * - useCreateAssetClass: Create a new asset class
 * - useUpdateAssetClass: Update an existing asset class (includes minAllocationValue)
 * - useDeleteAssetClass: Delete an asset class
 *
 * Provides hooks for subclass operations:
 * - useSubclasses: Fetch all subclasses for a class
 * - useCreateSubclass: Create a new subclass
 * - useUpdateSubclass: Update an existing subclass (includes minAllocationValue)
 * - useDeleteSubclass: Delete a subclass
 *
 * Provides hooks for allocation operations:
 * - useAllocationValidation: Validate allocation configurations
 * - useAllocationSummary: Get allocation summary
 * - useSubclassAllocationValidation: Validate subclass allocations against parent
 *
 * Provides hooks for asset count operations (Story 4.5):
 * - useAssetCountStatus: Get asset count status for all classes/subclasses
 *
 * AC-4.1.1: View asset classes list
 * AC-4.1.2: Create asset class
 * AC-4.1.3: Edit asset class
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete asset class with warning (has assets)
 *
 * AC-4.2.1: View subclasses within asset class
 * AC-4.2.2: Create subclass
 * AC-4.2.3: Edit subclass name
 * AC-4.2.4: Delete subclass (no assets)
 * AC-4.2.5: Delete subclass with warning (has assets)
 *
 * AC-4.3.1: View and set allocation ranges
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * AC-4.4.1: Set subclass allocation ranges
 * AC-4.4.2: Warning when subclass max exceeds parent max
 * AC-4.4.3: Warning when sum of subclass minimums exceeds parent max
 *
 * AC-4.5.1: Set max assets limit
 * AC-4.5.2: Display warning when asset count exceeds limit
 * AC-4.5.4: Asset count display for classes
 * AC-4.5.5: Asset count display for subclasses
 *
 * AC-4.6.1: Set minimum allocation value
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AssetClass, AssetSubclass } from "@/lib/db/schema";
import type {
  CreateAssetClassInput,
  UpdateAssetClassInput,
  CreateSubclassInput,
  UpdateSubclassInput,
} from "@/lib/validations/asset-class-schemas";

// =============================================================================
// TYPES
// =============================================================================

interface AssetClassListResponse {
  data: AssetClass[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface AssetClassResponse {
  data: AssetClass;
}

interface DeleteResponse {
  success: boolean;
}

interface DeleteWarningResponse {
  warning: boolean;
  assetCount: number;
  message: string;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

// Subclass types
interface SubclassListResponse {
  data: AssetSubclass[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface SubclassResponse {
  data: AssetSubclass;
}

// =============================================================================
// useAssetClasses HOOK
// =============================================================================

/**
 * Hook for fetching asset classes
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.1: View list of asset classes
 *
 * Returns:
 * - assetClasses: Array of asset classes
 * - isLoading: Loading state
 * - error: Error message if any
 * - canCreate: Whether user can create more asset classes
 * - refresh: Function to manually refresh the list
 */
export function useAssetClasses() {
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [limit, setLimit] = useState(10);

  const fetchAssetClasses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/asset-classes");
      const result = (await response.json()) as AssetClassListResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      const successResult = result as AssetClassListResponse;
      setAssetClasses(successResult.data);
      setCanCreate(successResult.meta.canCreate);
      setLimit(successResult.meta.limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch asset classes";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAssetClasses();
  }, [fetchAssetClasses]);

  return {
    assetClasses,
    isLoading,
    error,
    canCreate,
    limit,
    refresh: fetchAssetClasses,
  };
}

// =============================================================================
// useCreateAssetClass HOOK
// =============================================================================

/**
 * Hook for creating asset classes
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.2: Create asset class with name and optional icon
 *
 * Returns:
 * - createAssetClass: Function to create a new asset class
 * - isCreating: Loading state
 * - error: Error message if any
 */
export function useCreateAssetClass() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAssetClass = useCallback(
    async (input: CreateAssetClassInput): Promise<AssetClass | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch("/api/asset-classes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = (await response.json()) as AssetClassResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "LIMIT_EXCEEDED") {
            toast.error("Maximum asset classes reached");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to create asset class");
          }

          return null;
        }

        // Success
        toast.success("Asset class created");
        router.refresh();

        return (result as AssetClassResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to create asset class");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  return {
    createAssetClass,
    isCreating,
    error,
  };
}

// =============================================================================
// useUpdateAssetClass HOOK
// =============================================================================

/**
 * Hook for updating asset classes
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.3: Edit asset class name
 *
 * Returns:
 * - updateAssetClass: Function to update an asset class
 * - isUpdating: Loading state
 * - error: Error message if any
 */
export function useUpdateAssetClass() {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAssetClass = useCallback(
    async (id: string, input: UpdateAssetClassInput): Promise<AssetClass | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/asset-classes/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = (await response.json()) as AssetClassResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Asset class not found");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to update asset class");
          }

          return null;
        }

        // Success - no toast for inline save (visual confirmation in UI)
        router.refresh();

        return (result as AssetClassResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to update asset class");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [router]
  );

  return {
    updateAssetClass,
    isUpdating,
    error,
  };
}

// =============================================================================
// useDeleteAssetClass HOOK
// =============================================================================

/**
 * Hook for deleting asset classes
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete asset class with warning (has assets)
 *
 * Returns:
 * - deleteAssetClass: Function to delete an asset class
 * - checkDelete: Function to check if delete would affect assets
 * - isDeleting: Loading state
 * - error: Error message if any
 * - warning: Warning response if assets would be affected
 */
export function useDeleteAssetClass() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<DeleteWarningResponse | null>(null);

  /**
   * Check if deleting would affect assets (without actually deleting)
   */
  const checkDelete = useCallback(
    async (id: string): Promise<DeleteWarningResponse | null> => {
      setIsDeleting(true);
      setError(null);
      setWarning(null);

      try {
        const response = await fetch(`/api/asset-classes/${id}`, {
          method: "DELETE",
        });

        const result = (await response.json()) as DeleteResponse | DeleteWarningResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);
          return null;
        }

        // Check if it's a warning response
        if ("warning" in result && result.warning) {
          setWarning(result);
          return result;
        }

        // If no warning, it was deleted successfully
        toast.success("Asset class deleted");
        router.refresh();
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        return null;
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  /**
   * Force delete an asset class (even with associated assets)
   */
  const deleteAssetClass = useCallback(
    async (id: string, force: boolean = false): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);
      setWarning(null);

      try {
        const url = force ? `/api/asset-classes/${id}?force=true` : `/api/asset-classes/${id}`;
        const response = await fetch(url, {
          method: "DELETE",
        });

        const result = (await response.json()) as DeleteResponse | DeleteWarningResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Asset class not found");
          } else {
            toast.error("Failed to delete asset class");
          }

          return false;
        }

        // Check if it's a warning response
        if ("warning" in result && result.warning) {
          setWarning(result);
          return false;
        }

        // Success
        toast.success("Asset class deleted");
        router.refresh();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to delete asset class");
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  const clearWarning = useCallback(() => {
    setWarning(null);
  }, []);

  return {
    deleteAssetClass,
    checkDelete,
    isDeleting,
    error,
    warning,
    clearWarning,
  };
}

// =============================================================================
// SUBCLASS HOOKS (Story 4.2)
// =============================================================================

/**
 * Hook for fetching subclasses for an asset class
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.1: View list of subclasses within asset class
 *
 * Returns:
 * - subclasses: Array of subclasses
 * - isLoading: Loading state
 * - error: Error message if any
 * - canCreate: Whether user can create more subclasses
 * - refresh: Function to manually refresh the list
 */
export function useSubclasses(classId: string | null) {
  const [subclasses, setSubclasses] = useState<AssetSubclass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [limit, setLimit] = useState(10);

  const fetchSubclasses = useCallback(async () => {
    if (!classId) {
      setSubclasses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/asset-classes/${classId}/subclasses`);
      const result = (await response.json()) as SubclassListResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      const successResult = result as SubclassListResponse;
      setSubclasses(successResult.data);
      setCanCreate(successResult.meta.canCreate);
      setLimit(successResult.meta.limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch subclasses";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  // Fetch when classId changes
  useEffect(() => {
    fetchSubclasses();
  }, [fetchSubclasses]);

  return {
    subclasses,
    isLoading,
    error,
    canCreate,
    limit,
    refresh: fetchSubclasses,
  };
}

/**
 * Hook for creating subclasses
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.2: Create subclass with name (1-50 chars)
 *
 * Returns:
 * - createSubclass: Function to create a new subclass
 * - isCreating: Loading state
 * - error: Error message if any
 */
export function useCreateSubclass() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubclass = useCallback(
    async (classId: string, input: CreateSubclassInput): Promise<AssetSubclass | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch(`/api/asset-classes/${classId}/subclasses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = (await response.json()) as SubclassResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "LIMIT_EXCEEDED") {
            toast.error("Maximum subclasses reached");
          } else if (errorResult.code === "NOT_FOUND") {
            toast.error("Asset class not found");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to create subclass");
          }

          return null;
        }

        // Success
        toast.success("Subclass created");
        router.refresh();

        return (result as SubclassResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to create subclass");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  return {
    createSubclass,
    isCreating,
    error,
  };
}

/**
 * Hook for updating subclasses
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.3: Edit subclass name
 *
 * Returns:
 * - updateSubclass: Function to update a subclass
 * - isUpdating: Loading state
 * - error: Error message if any
 */
export function useUpdateSubclass() {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSubclass = useCallback(
    async (id: string, input: UpdateSubclassInput): Promise<AssetSubclass | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/asset-subclasses/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = (await response.json()) as SubclassResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Subclass not found");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to update subclass");
          }

          return null;
        }

        // Success - no toast for inline save (visual confirmation in UI)
        router.refresh();

        return (result as SubclassResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to update subclass");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [router]
  );

  return {
    updateSubclass,
    isUpdating,
    error,
  };
}

/**
 * Hook for deleting subclasses
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.4: Delete subclass (no assets)
 * AC-4.2.5: Delete subclass with warning (has assets)
 *
 * Returns:
 * - deleteSubclass: Function to delete a subclass
 * - checkDelete: Function to check if delete would affect assets
 * - isDeleting: Loading state
 * - error: Error message if any
 * - warning: Warning response if assets would be affected
 */
export function useDeleteSubclass() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<DeleteWarningResponse | null>(null);

  /**
   * Check if deleting would affect assets (without actually deleting)
   */
  const checkDelete = useCallback(
    async (id: string): Promise<DeleteWarningResponse | null> => {
      setIsDeleting(true);
      setError(null);
      setWarning(null);

      try {
        const response = await fetch(`/api/asset-subclasses/${id}`, {
          method: "DELETE",
        });

        const result = (await response.json()) as DeleteResponse | DeleteWarningResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);
          return null;
        }

        // Check if it's a warning response
        if ("warning" in result && result.warning) {
          setWarning(result);
          return result;
        }

        // If no warning, it was deleted successfully
        toast.success("Subclass deleted");
        router.refresh();
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        return null;
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  /**
   * Force delete a subclass (even with associated assets)
   */
  const deleteSubclass = useCallback(
    async (id: string, force: boolean = false): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);
      setWarning(null);

      try {
        const url = force
          ? `/api/asset-subclasses/${id}?force=true`
          : `/api/asset-subclasses/${id}`;
        const response = await fetch(url, {
          method: "DELETE",
        });

        const result = (await response.json()) as DeleteResponse | DeleteWarningResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Subclass not found");
          } else {
            toast.error("Failed to delete subclass");
          }

          return false;
        }

        // Check if it's a warning response
        if ("warning" in result && result.warning) {
          setWarning(result);
          return false;
        }

        // Success
        toast.success("Subclass deleted");
        router.refresh();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to delete subclass");
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  const clearWarning = useCallback(() => {
    setWarning(null);
  }, []);

  return {
    deleteSubclass,
    checkDelete,
    isDeleting,
    error,
    warning,
    clearWarning,
  };
}

// =============================================================================
// ALLOCATION HOOKS (Story 4.3)
// =============================================================================

/**
 * Allocation warning type from API
 */
interface AllocationWarning {
  type: "MINIMUM_SUM_EXCEEDS_100";
  message: string;
  totalMinimums: string;
  affectedClasses: string[];
}

/**
 * Allocation validation result from API
 */
interface AllocationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: AllocationWarning[];
}

/**
 * Allocation summary from API
 */
interface AllocationSummary {
  totalMinimums: string;
  totalMaximums: string;
  unallocatedMinimum: string;
  classCount: number;
  classesWithRanges: number;
}

/**
 * Hook for fetching allocation validation status
 *
 * Story 4.3: Set Allocation Ranges for Classes
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * Returns:
 * - validation: Validation result with errors and warnings
 * - isLoading: Loading state
 * - error: Error message if any
 * - refresh: Function to manually refresh validation
 */
export function useAllocationValidation() {
  const [validation, setValidation] = useState<AllocationValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchValidation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/asset-classes/validate");
      const result = (await response.json()) as AllocationValidationResult | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      setValidation(result as AllocationValidationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch allocation validation";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  return {
    validation,
    isLoading,
    error,
    hasWarnings: (validation?.warnings.length ?? 0) > 0,
    refresh: fetchValidation,
  };
}

/**
 * Hook for fetching allocation summary
 *
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * Returns:
 * - summary: Allocation summary with totals
 * - isLoading: Loading state
 * - error: Error message if any
 * - refresh: Function to manually refresh summary
 */
export function useAllocationSummary() {
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/asset-classes/summary");
      const result = (await response.json()) as AllocationSummary | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      setSummary(result as AllocationSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch allocation summary";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
  };
}

// =============================================================================
// SUBCLASS ALLOCATION HOOKS (Story 4.4)
// =============================================================================

/**
 * Subclass allocation warning type from API
 *
 * Story 4.4: Set Allocation Ranges for Subclasses
 */
interface SubclassAllocationWarning {
  type: "SUBCLASS_EXCEEDS_PARENT_MAX" | "SUBCLASS_SUM_EXCEEDS_PARENT_MAX";
  message: string;
  subclassId?: string;
  subclassName?: string;
  totalMinimums?: string;
  parentMax?: string;
}

/**
 * Subclass allocation validation result from API
 */
interface SubclassAllocationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: SubclassAllocationWarning[];
}

/**
 * Hook for fetching subclass allocation validation status
 *
 * Story 4.4: Set Allocation Ranges for Subclasses
 * AC-4.4.2: Warning when subclass max exceeds parent max
 * AC-4.4.3: Warning when sum of subclass minimums exceeds parent max
 *
 * @param classId - Asset class ID to validate subclasses for
 * @param enabled - Whether to enable fetching (default: true when classId is provided)
 *
 * Returns:
 * - validation: Validation result with errors and warnings
 * - isLoading: Loading state
 * - error: Error message if any
 * - hasWarnings: Whether there are any warnings
 * - refresh: Function to manually refresh validation
 */
export function useSubclassAllocationValidation(classId: string | null, enabled: boolean = true) {
  const [validation, setValidation] = useState<SubclassAllocationValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchValidation = useCallback(async () => {
    if (!classId || !enabled) {
      setValidation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/asset-classes/${classId}/validate-subclasses`);
      const result = (await response.json()) as
        | { data: SubclassAllocationValidationResult }
        | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      setValidation((result as { data: SubclassAllocationValidationResult }).data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch subclass allocation validation";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [classId, enabled]);

  // Fetch when classId changes or enabled changes
  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  return {
    validation,
    isLoading,
    error,
    hasWarnings: (validation?.warnings.length ?? 0) > 0,
    refresh: fetchValidation,
  };
}

// =============================================================================
// ASSET COUNT STATUS HOOKS (Story 4.5)
// =============================================================================

/**
 * Subclass asset count status type from API
 *
 * Story 4.5: Set Asset Count Limits
 */
interface SubclassAssetCountStatus {
  subclassId: string;
  subclassName: string;
  currentCount: number;
  maxAssets: number | null;
  isOverLimit: boolean;
}

/**
 * Asset class count status type from API
 *
 * Story 4.5: Set Asset Count Limits
 */
interface AssetCountStatus {
  classId: string;
  className: string;
  currentCount: number;
  maxAssets: number | null;
  isOverLimit: boolean;
  subclasses: SubclassAssetCountStatus[];
}

/**
 * Hook for fetching asset count status for all classes and subclasses
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.2: Display warning when asset count exceeds limit
 * AC-4.5.4: Asset count display for classes
 * AC-4.5.5: Asset count display for subclasses
 *
 * Returns:
 * - assetCountStatus: Array of asset count status for all classes
 * - isLoading: Loading state
 * - error: Error message if any
 * - hasOverLimit: Whether any class or subclass is over its limit
 * - refresh: Function to manually refresh status
 * - getClassStatus: Helper to get status for a specific class
 * - getSubclassStatus: Helper to get status for a specific subclass
 */
export function useAssetCountStatus() {
  const [assetCountStatus, setAssetCountStatus] = useState<AssetCountStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetCountStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/asset-classes/asset-counts");
      const result = (await response.json()) as { data: AssetCountStatus[] } | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        return;
      }

      setAssetCountStatus((result as { data: AssetCountStatus[] }).data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch asset count status";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAssetCountStatus();
  }, [fetchAssetCountStatus]);

  // Check if any class or subclass is over limit
  const hasOverLimit = assetCountStatus.some(
    (status) => status.isOverLimit || status.subclasses.some((subclass) => subclass.isOverLimit)
  );

  // Helper to get status for a specific class
  const getClassStatus = useCallback(
    (classId: string): AssetCountStatus | undefined => {
      return assetCountStatus.find((status) => status.classId === classId);
    },
    [assetCountStatus]
  );

  // Helper to get status for a specific subclass
  const getSubclassStatus = useCallback(
    (subclassId: string): SubclassAssetCountStatus | undefined => {
      for (const classStatus of assetCountStatus) {
        const subclassStatus = classStatus.subclasses.find((s) => s.subclassId === subclassId);
        if (subclassStatus) {
          return subclassStatus;
        }
      }
      return undefined;
    },
    [assetCountStatus]
  );

  return {
    assetCountStatus,
    isLoading,
    error,
    hasOverLimit,
    refresh: fetchAssetCountStatus,
    getClassStatus,
    getSubclassStatus,
  };
}
