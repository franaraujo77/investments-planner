"use client";

/**
 * Criteria Form Component
 *
 * Story 5.1: Define Scoring Criteria
 * Story 5.3: Define Criteria Operators
 *
 * AC-5.1.2: Criterion Form Fields
 * - Form with all criterion fields
 * - Target Market/Sector selector
 * - Metric selector
 * - Operator selector with dynamic value2 input
 * - Points input with validation
 * - Required fundamentals multi-select
 * - Submit creates new version
 * - Cancel discards changes
 * - React Hook Form integration
 *
 * AC-5.3.2: Between Operator Shows Two Value Inputs
 * AC-5.3.4: Operator Selection Adapts Form Fields
 * - 'exists' operator hides value input
 * - 'between' operator shows two value inputs
 * - Clear value2 when switching away from 'between'
 *
 * Form for creating or editing criteria sets and individual criteria.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useCallback, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MetricSelector } from "./metric-selector";
import {
  OperatorSelector,
  operatorRequiresSecondValue,
  operatorRequiresValue,
} from "./operator-selector";
import { cn } from "@/lib/utils";
import {
  AVAILABLE_METRICS,
  AVAILABLE_OPERATORS,
  POINTS_MIN,
  POINTS_MAX,
  CRITERION_NAME_MIN_LENGTH,
  CRITERION_NAME_MAX_LENGTH,
  CRITERIA_MESSAGES,
} from "@/lib/validations/criteria-schemas";
import {
  CRITERION_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplateById,
} from "@/lib/constants/criteria-templates";

type MetricValue = (typeof AVAILABLE_METRICS)[number];
type OperatorValue = (typeof AVAILABLE_OPERATORS)[number];

/**
 * Common target markets (can be extended)
 */
const TARGET_MARKETS = [
  { value: "BR_BANKS", label: "Brazilian Banks" },
  { value: "BR_UTILITIES", label: "Brazilian Utilities" },
  { value: "BR_REITS", label: "Brazilian REITs (FIIs)" },
  { value: "BR_MANUFACTURING", label: "Brazilian Manufacturing" },
  { value: "US_TECH", label: "US Technology" },
  { value: "US_BANKS", label: "US Banks" },
  { value: "US_HEALTHCARE", label: "US Healthcare" },
  { value: "GLOBAL_DIVERSIFIED", label: "Global Diversified" },
] as const;

/**
 * Common asset types
 */
const ASSET_TYPES = [
  { value: "stock", label: "Stocks" },
  { value: "reit", label: "REITs" },
  { value: "etf", label: "ETFs" },
  { value: "bond", label: "Bonds" },
] as const;

/**
 * Schema for creating a new criterion
 * Story 5.3: AC-5.3.3, AC-5.3.4 - Dynamic validation based on operator
 */
const criterionFormSchema = z
  .object({
    name: z
      .string()
      .min(CRITERION_NAME_MIN_LENGTH, CRITERIA_MESSAGES.CRITERION_NAME_REQUIRED)
      .max(CRITERION_NAME_MAX_LENGTH, CRITERIA_MESSAGES.CRITERION_NAME_TOO_LONG),
    metric: z.enum(AVAILABLE_METRICS, { message: CRITERIA_MESSAGES.INVALID_METRIC }),
    operator: z.enum(AVAILABLE_OPERATORS, { message: CRITERIA_MESSAGES.INVALID_OPERATOR }),
    value: z.string(), // Validated in refinement based on operator
    value2: z.string().optional(),
    points: z
      .number()
      .int(CRITERIA_MESSAGES.INVALID_POINTS)
      .min(POINTS_MIN, CRITERIA_MESSAGES.INVALID_POINTS)
      .max(POINTS_MAX, CRITERIA_MESSAGES.INVALID_POINTS),
    requiredFundamentals: z.array(z.string()).default([]),
  })
  // AC-5.3.4: Value is required for all operators except 'exists'
  .refine(
    (data) => {
      if (data.operator === "exists") return true;
      // Other operators require valid decimal value
      return data.value !== "" && /^-?\d+(\.\d+)?$/.test(data.value);
    },
    {
      message: CRITERIA_MESSAGES.VALUE_REQUIRED,
      path: ["value"],
    }
  )
  // AC-5.3.2: 'between' operator requires value2
  .refine(
    (data) => {
      if (data.operator !== "between") return true;
      return data.value2 !== "" && data.value2 !== undefined && /^-?\d+(\.\d+)?$/.test(data.value2);
    },
    {
      message: "Max value is required for between operator",
      path: ["value2"],
    }
  )
  // AC-5.3.3: For 'between', min must be less than max
  .refine(
    (data) => {
      if (data.operator !== "between" || !data.value || !data.value2) return true;
      const min = parseFloat(data.value);
      const max = parseFloat(data.value2);
      return min < max;
    },
    {
      message: "Min value must be less than max value",
      path: ["value2"],
    }
  );

type CriterionFormValues = z.infer<typeof criterionFormSchema>;

interface CriteriaFormProps {
  /** Initial values for editing (undefined for new criterion) */
  initialValues?: Partial<CriterionFormValues>;
  /** Callback when form is submitted */
  onSubmit: (values: CriterionFormValues) => Promise<void>;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Whether the form is in a loading state */
  isLoading?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Optional additional class names */
  className?: string;
}

/**
 * Default form values
 */
const defaultValues = {
  name: "",
  metric: "dividend_yield" as const,
  operator: "gt" as const,
  value: "0",
  value2: "",
  points: 10,
  requiredFundamentals: [] as string[],
};

export function CriteriaForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitText = "Add Criterion",
  className,
}: CriteriaFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const form = useForm<CriterionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(criterionFormSchema) as any,
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form's watch() is intentionally used here for reactive form state
  const operator = form.watch("operator");
  const requiresValue2 = operatorRequiresSecondValue(operator as OperatorValue);
  const requiresValue = operatorRequiresValue(operator as OperatorValue);

  // AC-5.3.4: Clear value2 when switching away from 'between' operator
  useEffect(() => {
    if (operator !== "between") {
      form.setValue("value2", "");
    }
  }, [operator, form]);

  // AC-5.3.4: Clear value when switching to 'exists' operator
  useEffect(() => {
    if (operator === "exists") {
      form.setValue("value", "");
    }
  }, [operator, form]);

  /**
   * Handle template selection
   * Pre-fills form with template values (AC-5.2.3)
   */
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (templateId === "none") {
        // Reset to defaults
        form.reset(defaultValues);
        return;
      }

      const template = getTemplateById(templateId);
      if (template) {
        const { criterion } = template;
        form.setValue("name", criterion.name);
        form.setValue("metric", criterion.metric as MetricValue);
        form.setValue("operator", criterion.operator as OperatorValue);
        form.setValue("value", criterion.value);
        form.setValue("value2", criterion.value2 ?? "");
        form.setValue("points", criterion.points);
        form.setValue("requiredFundamentals", criterion.requiredFundamentals ?? []);
      }
    },
    [form]
  );

  const handleSubmit = async (values: CriterionFormValues) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save criterion");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = form.handleSubmit(handleSubmit as any);

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className={cn("space-y-4", className)}>
        {/* Template Selector (Story 5.2 - AC-5.2.3) */}
        <div className="space-y-2">
          <Label htmlFor="template-select" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Start from Template
          </Label>
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateSelect}
            disabled={isLoading}
          >
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Select a template (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template - Start fresh</SelectItem>
              {TEMPLATE_CATEGORIES.map((category) => {
                const categoryTemplates = CRITERION_TEMPLATES.filter(
                  (t) => t.category === category.value
                );
                if (categoryTemplates.length === 0) return null;
                return (
                  <SelectGroup key={category.value}>
                    <SelectLabel>{category.label}</SelectLabel>
                    {categoryTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
          {selectedTemplateId && selectedTemplateId !== "none" && (
            <p className="text-xs text-muted-foreground">
              {getTemplateById(selectedTemplateId)?.description}
            </p>
          )}
        </div>

        {/* Name Field */}
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Criterion Name</FormLabel>
              <FormControl>
                <Input placeholder='e.g., "Dividend Yield > 4%"' {...field} disabled={isLoading} />
              </FormControl>
              <FormDescription>A descriptive name for this criterion</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Metric and Operator Row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metric"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metric</FormLabel>
                <FormControl>
                  <MetricSelector
                    value={field.value as MetricValue}
                    onChange={field.onChange}
                    disabled={isLoading}
                    showLabel={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="operator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operator</FormLabel>
                <FormControl>
                  <OperatorSelector
                    value={field.value as OperatorValue}
                    onChange={field.onChange}
                    disabled={isLoading}
                    showLabel={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Value Fields - AC-5.3.4: Hidden for 'exists', dual inputs for 'between' */}
        {requiresValue && (
          <div className={cn("grid gap-4", requiresValue2 ? "grid-cols-2" : "grid-cols-1")}>
            <FormField
              control={control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{requiresValue2 ? "Min Value" : "Value"}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresValue2 && (
              <FormField
                control={control}
                name="value2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Value</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* AC-5.3.4: Info message when 'exists' is selected */}
        {!requiresValue && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            The &quot;exists&quot; operator checks if the metric data is available for the asset. No
            value threshold is needed.
          </div>
        )}

        {/* Points Field */}
        <FormField
          control={control}
          name="points"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Points</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={POINTS_MIN}
                  max={POINTS_MAX}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Points to award when criterion is met ({POINTS_MIN} to {POINTS_MAX})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error Message */}
        {submitError && <div className="text-sm text-destructive">{submitError}</div>}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitText}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Schema for creating a new criteria set
 */
const criteriaSetFormSchema = z.object({
  name: z
    .string()
    .min(1, "Criteria set name is required")
    .max(100, "Name must be 100 characters or less"),
  assetType: z.string().min(1, "Asset type is required"),
  targetMarket: z.string().min(1, "Target market is required"),
});

type CriteriaSetFormValues = z.infer<typeof criteriaSetFormSchema>;

interface CriteriaSetFormProps {
  /** Initial values for editing */
  initialValues?: Partial<CriteriaSetFormValues>;
  /** Callback when form is submitted */
  onSubmit: (values: CriteriaSetFormValues) => Promise<void>;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Whether the form is in a loading state */
  isLoading?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Optional additional class names */
  className?: string;
}

/**
 * Form for creating/editing criteria sets (the container)
 */
export function CriteriaSetForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitText = "Create Criteria Set",
  className,
}: CriteriaSetFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CriteriaSetFormValues>({
    resolver: zodResolver(criteriaSetFormSchema),
    defaultValues: {
      name: "",
      assetType: "",
      targetMarket: "",
      ...initialValues,
    },
  });

  const handleSubmit = async (values: CriteriaSetFormValues) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save criteria set");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setControl = form.control as any;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-4", className)}>
        {/* Name Field */}
        <FormField
          control={setControl}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Criteria Set Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='e.g., "Brazilian Banks Criteria"'
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>A name to identify this criteria set</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Asset Type and Target Market Row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={setControl}
            name="assetType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={setControl}
            name="targetMarket"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Market</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select market" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TARGET_MARKETS.map((market) => (
                      <SelectItem key={market.value} value={market.value}>
                        {market.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Error Message */}
        {submitError && <div className="text-sm text-destructive">{submitError}</div>}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitText}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Export target markets and asset types for use in other components
export { TARGET_MARKETS, ASSET_TYPES };
