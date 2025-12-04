"use client";

/**
 * DateRangeFilter Component
 *
 * Story 3.9: Investment History View
 * AC-3.9.5: Date Range Filtering
 *
 * Provides preset date ranges and custom date selection:
 * - All Time
 * - Last 30 Days
 * - Last 12 Months
 * - This Year
 * - Custom date range picker
 */

import { useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

/**
 * Date preset configurations
 */
const DATE_PRESETS: DatePreset[] = [
  {
    label: "All Time",
    getValue: () => ({}),
  },
  {
    label: "Last 30 Days",
    getValue: () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { from, to: today };
    },
  },
  {
    label: "Last 90 Days",
    getValue: () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      return { from, to: today };
    },
  },
  {
    label: "Last 12 Months",
    getValue: () => {
      const today = new Date();
      const from = new Date(today);
      from.setFullYear(today.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      return { from, to: today };
    },
  },
  {
    label: "This Year",
    getValue: () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), 0, 1);
      return { from, to: today };
    },
  },
  {
    label: "Last Year",
    getValue: () => {
      const thisYear = new Date().getFullYear();
      const from = new Date(thisYear - 1, 0, 1);
      const to = new Date(thisYear - 1, 11, 31);
      return { from, to };
    },
  },
];

/**
 * Formats a date range for display
 */
function formatDateRange(range: DateRange): string {
  if (!range.from && !range.to) {
    return "All Time";
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (range.from && range.to) {
    return `${formatDate(range.from)} – ${formatDate(range.to)}`;
  }

  if (range.from) {
    return `From ${formatDate(range.from)}`;
  }

  if (range.to) {
    return `Until ${formatDate(range.to)}`;
  }

  return "All Time";
}

/**
 * Finds the matching preset label for a date range
 */
function findPresetLabel(range: DateRange): string | null {
  if (!range.from && !range.to) {
    return "All Time";
  }

  for (const preset of DATE_PRESETS) {
    const presetValue = preset.getValue();

    // Check if dates match (within same day)
    if (presetValue.from && presetValue.to && range.from && range.to) {
      const fromMatch = presetValue.from.toDateString() === range.from.toDateString();
      const toMatch = presetValue.to.toDateString() === range.to.toDateString();

      if (fromMatch && toMatch) {
        return preset.label;
      }
    }
  }

  return null;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFromInput, setCustomFromInput] = useState("");
  const [customToInput, setCustomToInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const presetLabel = findPresetLabel(value);
  const displayText = presetLabel ?? formatDateRange(value);
  const hasFilter = value.from || value.to;

  const handlePresetSelect = (preset: DatePreset) => {
    onChange(preset.getValue());
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleClearFilter = () => {
    onChange({});
    setShowCustom(false);
    setCustomFromInput("");
    setCustomToInput("");
  };

  const handleCustomApply = () => {
    const fromDate = customFromInput ? new Date(customFromInput) : null;
    const toDate = customToInput ? new Date(customToInput) : null;

    // Validate dates
    if (fromDate && isNaN(fromDate.getTime())) return;
    if (toDate && isNaN(toDate.getTime())) return;

    // Build object with only defined values
    const result: DateRange = {};
    if (fromDate) result.from = fromDate;
    if (toDate) result.to = toDate;

    onChange(result);
    setIsOpen(false);
    setShowCustom(false);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>{displayText}</span>
            <ChevronDown className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Preset Options */}
          {DATE_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.label}
              onSelect={() => handlePresetSelect(preset)}
              className="cursor-pointer"
            >
              {preset.label}
              {presetLabel === preset.label && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Custom Date Range */}
          {!showCustom ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowCustom(true);
              }}
              className="cursor-pointer"
            >
              Custom Range...
            </DropdownMenuItem>
          ) : (
            <div className="p-2 space-y-2">
              <div className="text-sm font-medium text-muted-foreground mb-2">Custom Range</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={customFromInput}
                    onChange={(e) => setCustomFromInput(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={customToInput}
                    onChange={(e) => setCustomToInput(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCustom(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCustomApply} className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filter Button */}
      {hasFilter && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearFilter}
          className="h-8 w-8"
          aria-label="Clear date filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
