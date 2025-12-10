"use client";

/**
 * Operator Selector Component
 *
 * Story 5.1: Define Scoring Criteria
 *
 * AC-5.1.2: Criterion form fields
 * - Dropdown with operator options
 * - Human-readable labels (e.g., ">", "<", ">=", "<=", "between", "=", "exists")
 * - When 'between' selected, indicates second value needed
 * - Accessible with keyboard
 *
 * Dropdown for selecting a comparison operator.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AVAILABLE_OPERATORS, OPERATOR_LABELS } from "@/lib/validations/criteria-schemas";
import { cn } from "@/lib/utils";

type OperatorValue = (typeof AVAILABLE_OPERATORS)[number];

interface OperatorSelectorProps {
  /** Currently selected operator */
  value?: OperatorValue;
  /** Callback when operator changes */
  onChange: (value: OperatorValue) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Label text (defaults to "Operator") */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field has an error */
  hasError?: boolean;
}

/**
 * Extended operator labels with descriptions
 */
const OPERATOR_DESCRIPTIONS: Record<OperatorValue, string> = {
  gt: "Greater than",
  lt: "Less than",
  gte: "Greater than or equal",
  lte: "Less than or equal",
  between: "Between two values",
  equals: "Equal to",
  exists: "Data exists",
};

export function OperatorSelector({
  value,
  onChange,
  disabled = false,
  className,
  showLabel = true,
  label = "Operator",
  placeholder = "Select operator",
  hasError = false,
}: OperatorSelectorProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={cn("w-full", hasError && "border-destructive")}
          aria-label={label}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_OPERATORS.map((operator) => (
            <SelectItem key={operator} value={operator}>
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm">{OPERATOR_LABELS[operator]}</span>
                <span className="text-xs text-muted-foreground">
                  ({OPERATOR_DESCRIPTIONS[operator]})
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Helper to get human-readable label for an operator value
 */
export function getOperatorLabel(operator: OperatorValue): string {
  return OPERATOR_LABELS[operator];
}

/**
 * Helper to check if operator requires a second value
 */
export function operatorRequiresSecondValue(operator: OperatorValue): boolean {
  return operator === "between";
}

/**
 * Helper to check if operator requires any value
 */
export function operatorRequiresValue(operator: OperatorValue): boolean {
  return operator !== "exists";
}
