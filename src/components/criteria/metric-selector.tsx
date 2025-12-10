"use client";

/**
 * Metric Selector Component
 *
 * Story 5.1: Define Scoring Criteria
 *
 * AC-5.1.2: Criterion form fields
 * - Dropdown with metric options
 * - Human-readable labels
 * - Accessible with keyboard
 *
 * Dropdown for selecting a metric to evaluate.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AVAILABLE_METRICS, METRIC_LABELS } from "@/lib/validations/criteria-schemas";
import { cn } from "@/lib/utils";

type MetricValue = (typeof AVAILABLE_METRICS)[number];

interface MetricSelectorProps {
  /** Currently selected metric */
  value?: MetricValue;
  /** Callback when metric changes */
  onChange: (value: MetricValue) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Label text (defaults to "Metric") */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field has an error */
  hasError?: boolean;
}

export function MetricSelector({
  value,
  onChange,
  disabled = false,
  className,
  showLabel = true,
  label = "Metric",
  placeholder = "Select metric",
  hasError = false,
}: MetricSelectorProps) {
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
          {AVAILABLE_METRICS.map((metric) => (
            <SelectItem key={metric} value={metric}>
              {METRIC_LABELS[metric]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Helper to get human-readable label for a metric value
 */
export function getMetricLabel(metric: MetricValue): string {
  return METRIC_LABELS[metric];
}
