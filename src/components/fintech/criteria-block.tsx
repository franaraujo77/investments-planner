"use client";

/**
 * Criteria Block Component
 *
 * Story 5.1: Define Scoring Criteria
 * Story 5.3: Define Criteria Operators
 *
 * AC-5.1.4: CriteriaBlock Component Interaction
 * - Notion-style block with drag handle
 * - Inline editing for all fields
 * - Delete button with confirmation
 * - Auto-save on blur
 * - Loading state during save
 * - Visual save confirmation
 * - Accessible with ARIA labels
 * - Keyboard navigation support
 *
 * AC-5.3.1: All Operators Available
 * AC-5.3.4: Operator Selection Adapts Form Fields
 * - 'exists' operator hides value input
 * - 'between' operator shows two value inputs
 * - Clear value2 when switching away from 'between'
 *
 * A draggable block for displaying and editing a single criterion.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { GripVertical, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { PointsBadge } from "@/components/criteria/points-badge";
import { MetricSelector, getMetricLabel } from "@/components/criteria/metric-selector";
import {
  OperatorSelector,
  operatorRequiresSecondValue,
  operatorRequiresValue,
} from "@/components/criteria/operator-selector";
import { formatOperatorDisplay } from "@/lib/constants/operators";
import type { CriterionRule } from "@/lib/db/schema";
import type { UpdateCriterionInput } from "@/lib/validations/criteria-schemas";
import {
  POINTS_MIN,
  POINTS_MAX,
  AVAILABLE_METRICS,
  AVAILABLE_OPERATORS,
} from "@/lib/validations/criteria-schemas";

type MetricValue = (typeof AVAILABLE_METRICS)[number];
type OperatorValue = (typeof AVAILABLE_OPERATORS)[number];

interface CriteriaBlockProps {
  /** The criterion data */
  criterion: CriterionRule;
  /** Callback to update the criterion */
  onUpdate: (criterionId: string, updates: UpdateCriterionInput) => Promise<void>;
  /** Callback to delete the criterion */
  onDelete: (criterionId: string) => Promise<void>;
  /** Whether drag is enabled */
  isDraggable?: boolean;
  /** Drag handle props from dnd-kit */
  dragHandleProps?: Record<string, unknown>;
  /** Whether the block is being dragged */
  isDragging?: boolean;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
}

export function CriteriaBlock({
  criterion,
  onUpdate,
  onDelete,
  isDraggable = true,
  dragHandleProps,
  isDragging = false,
  disabled = false,
  className,
}: CriteriaBlockProps) {
  // Editable fields state
  const [name, setName] = useState(criterion.name);
  const [metric, setMetric] = useState<MetricValue>(criterion.metric);
  const [operator, setOperator] = useState<OperatorValue>(criterion.operator);
  const [value, setValue] = useState(criterion.value);
  const [value2, setValue2] = useState(criterion.value2 ?? "");
  const [points, setPoints] = useState(String(criterion.points));

  // UI state
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Refs for managing focus
  const nameInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const value2InputRef = useRef<HTMLInputElement>(null);
  const pointsInputRef = useRef<HTMLInputElement>(null);

  // Sync state with props when criterion changes
  useEffect(() => {
    setName(criterion.name);
    setMetric(criterion.metric);
    setOperator(criterion.operator);
    setValue(criterion.value);
    setValue2(criterion.value2 ?? "");
    setPoints(String(criterion.points));
  }, [criterion]);

  /**
   * Save changes
   */
  const handleSave = useCallback(
    async (updates: UpdateCriterionInput) => {
      if (disabled || isUpdating) return;

      setIsUpdating(true);
      setError(null);

      try {
        await onUpdate(criterion.id, updates);

        // Show saved indicator briefly
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setIsUpdating(false);
        setEditingField(null);
      }
    },
    [criterion.id, disabled, isUpdating, onUpdate]
  );

  /**
   * Handle name blur
   */
  const handleNameBlur = useCallback(() => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== criterion.name) {
      handleSave({ name: trimmedName });
    }
    setEditingField(null);
  }, [name, criterion.name, handleSave]);

  /**
   * Handle metric change
   */
  const handleMetricChange = useCallback(
    (newMetric: MetricValue) => {
      setMetric(newMetric);
      if (newMetric !== criterion.metric) {
        handleSave({ metric: newMetric });
      }
    },
    [criterion.metric, handleSave]
  );

  /**
   * Handle operator change
   * AC-5.3.4: Clear value2 when switching away from 'between', clear value when switching to 'exists'
   */
  const handleOperatorChange = useCallback(
    (newOperator: OperatorValue) => {
      setOperator(newOperator);
      const updates: UpdateCriterionInput = { operator: newOperator };

      // Clear value2 if switching away from 'between'
      if (newOperator !== "between" && criterion.operator === "between") {
        updates.value2 = null;
        setValue2("");
      }

      // Clear value when switching to 'exists' operator
      if (newOperator === "exists" && criterion.operator !== "exists") {
        updates.value = "";
        setValue("");
      }

      if (newOperator !== criterion.operator) {
        handleSave(updates);
      }
    },
    [criterion.operator, handleSave]
  );

  /**
   * Handle value blur
   */
  const handleValueBlur = useCallback(() => {
    if (value !== criterion.value && value.trim()) {
      handleSave({ value });
    }
    setEditingField(null);
  }, [value, criterion.value, handleSave]);

  /**
   * Handle value2 blur
   */
  const handleValue2Blur = useCallback(() => {
    if (value2 !== (criterion.value2 ?? "") && operator === "between") {
      handleSave({ value2: value2 || null });
    }
    setEditingField(null);
  }, [value2, criterion.value2, operator, handleSave]);

  /**
   * Handle points blur
   */
  const handlePointsBlur = useCallback(() => {
    const numPoints = parseInt(points, 10);
    if (!isNaN(numPoints)) {
      const clampedPoints = Math.max(POINTS_MIN, Math.min(POINTS_MAX, numPoints));
      if (clampedPoints !== criterion.points) {
        handleSave({ points: clampedPoints });
      }
      setPoints(String(clampedPoints));
    } else {
      setPoints(String(criterion.points));
    }
    setEditingField(null);
  }, [points, criterion.points, handleSave]);

  /**
   * Handle delete
   */
  const handleDelete = useCallback(async () => {
    if (disabled || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(criterion.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setIsDeleting(false);
    }
  }, [criterion.id, disabled, isDeleting, onDelete]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, field: string) => {
      if (e.key === "Escape") {
        // Reset to original value
        switch (field) {
          case "name":
            setName(criterion.name);
            break;
          case "value":
            setValue(criterion.value);
            break;
          case "value2":
            setValue2(criterion.value2 ?? "");
            break;
          case "points":
            setPoints(String(criterion.points));
            break;
        }
        setEditingField(null);
      } else if (e.key === "Enter") {
        // Trigger blur to save
        (e.target as HTMLInputElement).blur();
      }
    },
    [criterion]
  );

  const requiresValue2 = operatorRequiresSecondValue(operator);
  const requiresValue = operatorRequiresValue(operator);

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-3 transition-all",
        isDragging && "opacity-50 ring-2 ring-primary",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="article"
      aria-label={`Criterion: ${criterion.name}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        {isDraggable && (
          <div
            {...dragHandleProps}
            className={cn(
              "flex h-8 w-6 cursor-grab items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100",
              isDragging && "cursor-grabbing opacity-100"
            )}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 space-y-2">
          {/* Row 1: Name and Points */}
          <div className="flex items-center gap-2">
            <Input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setEditingField("name")}
              onBlur={handleNameBlur}
              onKeyDown={(e) => handleKeyDown(e, "name")}
              disabled={disabled || isUpdating}
              className={cn(
                "h-8 flex-1 border-transparent bg-transparent px-2 hover:border-input focus:border-input",
                editingField === "name" && "border-input bg-background"
              )}
              placeholder="Criterion name"
              aria-label="Criterion name"
            />

            {/* Points Input/Badge */}
            {editingField === "points" ? (
              <Input
                ref={pointsInputRef}
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                onBlur={handlePointsBlur}
                onKeyDown={(e) => handleKeyDown(e, "points")}
                disabled={disabled || isUpdating}
                min={POINTS_MIN}
                max={POINTS_MAX}
                className="h-8 w-20"
                aria-label="Points"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingField("points")}
                disabled={disabled || isUpdating}
                className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
                aria-label={`Points: ${criterion.points}. Click to edit.`}
              >
                <PointsBadge points={criterion.points} />
              </button>
            )}
          </div>

          {/* Row 2: Metric, Operator, Value(s) */}
          <div className="flex flex-wrap items-center gap-2">
            <MetricSelector
              value={metric}
              onChange={handleMetricChange}
              disabled={disabled || isUpdating}
              showLabel={false}
              className="w-40"
            />

            <OperatorSelector
              value={operator}
              onChange={handleOperatorChange}
              disabled={disabled || isUpdating}
              showLabel={false}
              className="w-32"
            />

            {/* AC-5.3.4: Hide value input for 'exists' operator */}
            {requiresValue && (
              <>
                <Input
                  ref={valueInputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => setEditingField("value")}
                  onBlur={handleValueBlur}
                  onKeyDown={(e) => handleKeyDown(e, "value")}
                  disabled={disabled || isUpdating}
                  className="h-8 w-24"
                  placeholder={requiresValue2 ? "Min" : "Value"}
                  aria-label={requiresValue2 ? "Minimum value" : "Comparison value"}
                />

                {requiresValue2 && (
                  <>
                    <span className="text-sm text-muted-foreground">and</span>
                    <Input
                      ref={value2InputRef}
                      value={value2}
                      onChange={(e) => setValue2(e.target.value)}
                      onFocus={() => setEditingField("value2")}
                      onBlur={handleValue2Blur}
                      onKeyDown={(e) => handleKeyDown(e, "value2")}
                      disabled={disabled || isUpdating}
                      className="h-8 w-24"
                      placeholder="Max"
                      aria-label="Maximum value"
                    />
                  </>
                )}
              </>
            )}

            {/* AC-5.3.4: Show indicator for 'exists' operator */}
            {!requiresValue && (
              <span className="text-xs text-muted-foreground italic">(no value needed)</span>
            )}
          </div>

          {/* Row 3: Summary text (read-only) - AC-5.3.1: Use formatOperatorDisplay for consistent display */}
          <p className="text-xs text-muted-foreground">
            If {getMetricLabel(metric)}{" "}
            {formatOperatorDisplay(operator, value, value2 || undefined)}, award{" "}
            {criterion.points > 0 ? "+" : ""}
            {criterion.points} points
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Status indicator */}
          <div className="w-5 h-5 flex items-center justify-center">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {showSaved && !isUpdating && <Check className="h-4 w-4 text-green-600" />}
          </div>

          {/* Delete button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled || isDeleting}
                aria-label="Delete criterion"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Criterion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{criterion.name}&quot;? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
