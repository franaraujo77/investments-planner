"use client";

/**
 * AllocationPieChartLive Component
 *
 * Story 3.1: Allocation Pie Chart Component
 * AC-3.1.2: Real-Time Updates
 *
 * A wrapper for AllocationPieChart that integrates with react-hook-form
 * for real-time updates when editing allocations.
 *
 * Features:
 * - Watches form field changes via react-hook-form's watch()
 * - Transforms form data to chart format
 * - Smooth animation transitions (<200ms)
 * - Type-safe generic interface for different form schemas
 */

import { useMemo } from "react";
import { useFormContext, useWatch, type FieldValues, type Path } from "react-hook-form";
import {
  AllocationPieChart,
  AllocationPieChartSkeleton,
  type ClassAllocation,
  type AllocationPieChartProps,
} from "@/components/portfolio/allocation-pie-chart";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

/**
 * Form holding item structure
 * Generic interface for form data that can be transformed to chart data
 */
export interface FormHolding {
  /** Unique identifier for the holding */
  id?: string;
  /** Display name for the holding/class */
  name: string;
  /** Allocation percentage (0-100) */
  percentage: number | string;
  /** Optional value amount */
  value?: number | string;
  /** Optional custom color */
  color?: string;
}

/**
 * Transformer function type
 * Converts form data to chart-compatible ClassAllocation[]
 */
export type AllocationTransformer<T> = (formData: T[]) => ClassAllocation[];

/**
 * Default transformer for standard holding arrays
 * Converts FormHolding[] to ClassAllocation[]
 */
export function defaultAllocationTransformer(holdings: FormHolding[]): ClassAllocation[] {
  return holdings
    .filter((h) => h && h.name)
    .map((holding, index) => {
      const allocation: ClassAllocation = {
        classId: holding.id || `class-${index}`,
        className: holding.name || `Asset ${index + 1}`,
        value: String(holding.value || 0),
        percentage: String(
          typeof holding.percentage === "number"
            ? holding.percentage
            : parseFloat(holding.percentage) || 0
        ),
        assetCount: 1,
        targetMin: null,
        targetMax: null,
        status: "no-target" as AllocationStatus,
      };
      // Only add color if it's defined
      if (holding.color) {
        allocation.color = holding.color;
      }
      return allocation;
    });
}

/**
 * Props for AllocationPieChartLive
 */
export interface AllocationPieChartLiveProps<
  TFieldValues extends FieldValues = FieldValues,
> extends Omit<AllocationPieChartProps, "allocations"> {
  /** Form field path to watch for changes */
  fieldPath: Path<TFieldValues>;

  /**
   * Custom transformer function
   * If not provided, uses defaultAllocationTransformer
   */
  transformer?: AllocationTransformer<FormHolding>;

  /**
   * Show skeleton while no data
   * @default false
   */
  showSkeletonWhenEmpty?: boolean;

  /**
   * Minimum items to show chart (otherwise shows empty state)
   * @default 0
   */
  minItemsToShow?: number;
}

/**
 * AllocationPieChartLive
 *
 * Real-time pie chart that watches form field changes.
 *
 * Must be used within a FormProvider context.
 *
 * @example
 * ```tsx
 * <FormProvider {...form}>
 *   <AllocationPieChartLive
 *     fieldPath="holdings"
 *     height={250}
 *     showLegend
 *   />
 * </FormProvider>
 * ```
 */
export function AllocationPieChartLive<TFieldValues extends FieldValues = FieldValues>({
  fieldPath,
  transformer = defaultAllocationTransformer,
  showSkeletonWhenEmpty = false,
  minItemsToShow = 0,
  ...chartProps
}: AllocationPieChartLiveProps<TFieldValues>) {
  // Get form context (must be within FormProvider)
  const formContext = useFormContext<TFieldValues>();

  if (!formContext) {
    throw new Error("AllocationPieChartLive must be used within a FormProvider");
  }

  // Watch the field for real-time updates
  // useWatch is optimized for performance - only re-renders when value changes
  const watchedValue = useWatch({
    control: formContext.control,
    name: fieldPath,
  });

  // Transform watched data to chart format
  // Memoized to prevent unnecessary recalculations
  const chartAllocations = useMemo(() => {
    if (!watchedValue || !Array.isArray(watchedValue)) {
      return [];
    }
    return transformer(watchedValue as FormHolding[]);
  }, [watchedValue, transformer]);

  // Show skeleton when empty if configured
  if (showSkeletonWhenEmpty && chartAllocations.length === 0) {
    return <AllocationPieChartSkeleton height={chartProps.height ?? 300} />;
  }

  // Don't render chart if below minimum items
  if (chartAllocations.length < minItemsToShow) {
    return null;
  }

  return <AllocationPieChart allocations={chartAllocations} {...chartProps} />;
}

/**
 * Hook for getting live allocation totals from a form
 *
 * Useful for showing allocation indicators alongside the chart.
 *
 * @example
 * ```tsx
 * const { total, remaining, isValid } = useLiveAllocationTotal("holdings");
 *
 * <AllocationIndicator
 *   allocated={total}
 *   remaining={remaining}
 *   valid={isValid}
 * />
 * ```
 */
export function useLiveAllocationTotal<TFieldValues extends FieldValues = FieldValues>(
  fieldPath: Path<TFieldValues>,
  targetTotal: number = 100
) {
  const formContext = useFormContext<TFieldValues>();

  if (!formContext) {
    throw new Error("useLiveAllocationTotal must be used within a FormProvider");
  }

  const watchedValue = useWatch({
    control: formContext.control,
    name: fieldPath,
  });

  return useMemo(() => {
    if (!watchedValue || !Array.isArray(watchedValue)) {
      return { total: 0, remaining: targetTotal, isValid: false };
    }

    const total = (watchedValue as FormHolding[]).reduce((sum, item) => {
      if (!item) return sum;
      const percentage =
        typeof item.percentage === "number"
          ? item.percentage
          : parseFloat(String(item.percentage)) || 0;
      return sum + percentage;
    }, 0);

    const remaining = targetTotal - total;
    const isValid = Math.abs(remaining) < 0.01; // Allow tiny floating point errors

    return { total, remaining, isValid };
  }, [watchedValue, targetTotal]);
}

export default AllocationPieChartLive;
