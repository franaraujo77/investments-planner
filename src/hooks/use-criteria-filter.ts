"use client";

/**
 * Criteria Filter Hook
 *
 * Story 5.4: Criteria Library View
 *
 * AC-5.4.4: Search/Filter Criteria by Name
 * - Case-insensitive name filtering
 * - Memoized filtered results for performance
 * - Clear filter when switching tabs
 *
 * Provides client-side filtering for responsive UX.
 */

import { useState, useMemo, useCallback } from "react";
import type { CriterionRule } from "@/lib/db/schema";

interface UseCriteriaFilterReturn {
  /** The current search term */
  searchTerm: string;
  /** Set the search term */
  setSearchTerm: (term: string) => void;
  /** Clear the search term */
  clearSearch: () => void;
  /** Filter criteria by the current search term */
  filterCriteria: (criteria: CriterionRule[]) => CriterionRule[];
  /** Check if search is active */
  isSearchActive: boolean;
}

/**
 * Hook for filtering criteria by name
 *
 * @returns Filter state and functions
 *
 * @example
 * ```tsx
 * const { searchTerm, setSearchTerm, filterCriteria } = useCriteriaFilter();
 * const filtered = filterCriteria(criteria);
 * ```
 */
export function useCriteriaFilter(): UseCriteriaFilterReturn {
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Clear search term
   */
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  /**
   * Filter criteria by name (case-insensitive)
   * Memoized for performance
   */
  const filterCriteria = useCallback(
    (criteria: CriterionRule[]): CriterionRule[] => {
      if (!searchTerm.trim()) {
        return criteria;
      }

      const lowerSearch = searchTerm.toLowerCase().trim();
      return criteria.filter((criterion) => criterion.name.toLowerCase().includes(lowerSearch));
    },
    [searchTerm]
  );

  /**
   * Check if search is active (has non-empty search term)
   */
  const isSearchActive = useMemo(() => {
    return searchTerm.trim().length > 0;
  }, [searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    clearSearch,
    filterCriteria,
    isSearchActive,
  };
}
