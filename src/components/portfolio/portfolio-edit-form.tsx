"use client";

/**
 * Portfolio Edit Form Component
 *
 * Story 2.3: Edit Portfolio
 *
 * Client component for editing existing portfolios.
 *
 * AC-2.3.1: Pre-fill edit form with current data
 * AC-2.3.2: Update name with success toast
 * AC-2.3.3: Industry sector change with impact analysis
 * AC-2.3.4: Asset type removal with impact analysis
 * AC-2.3.5: Confirm destructive changes
 * AC-2.3.6: Cancel destructive changes
 * AC-2.3.7: Currency change handling
 * AC-2.3.8: Unsaved changes warning
 *
 * Redirect to portfolio detail after save (success flow)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getFieldBorderClassName } from "@/components/forms/form-field-status";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImpactConfirmationDialog } from "./impact-confirmation-dialog";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import {
  SUPPORTED_CURRENCIES,
  INDUSTRY_SECTORS,
  ASSET_TYPES,
  PORTFOLIO_NAME_MAX_LENGTH,
  type UpdatePortfolioInput,
  type AssetType,
} from "@/lib/validations/portfolio";
import type {
  PortfolioWithAssetTypes,
  ImpactAnalysisResult,
} from "@/lib/services/portfolio-service";

/**
 * Similar portfolio type from check-name API
 */
interface SimilarPortfolio {
  id: string;
  name: string;
  similarity: "exact" | "similar";
}

interface CheckNameResponse {
  data: {
    similarPortfolios: SimilarPortfolio[];
    hasSimilar: boolean;
    hasExact: boolean;
  };
}

/**
 * Debounce utility function
 */
function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Portfolio edit form props
 */
interface PortfolioEditFormProps {
  portfolio: PortfolioWithAssetTypes;
}

/**
 * Form state type for react-hook-form
 * All fields required as they're pre-filled with existing values
 */
interface FormState {
  name: string;
  baseCurrency: (typeof SUPPORTED_CURRENCIES)[number]["code"];
  industrySector: (typeof INDUSTRY_SECTORS)[number];
  assetTypes: AssetType[];
}

/**
 * PortfolioEditForm
 *
 * Renders the edit form for an existing portfolio.
 * Pre-fills all fields with current values.
 */
export function PortfolioEditForm({ portfolio }: PortfolioEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [similarPortfolios, setSimilarPortfolios] = useState<SimilarPortfolio[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<AssetType[]>(
    portfolio.acceptedAssetTypes
  );

  // Impact analysis state
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysisResult | null>(null);
  const [showImpactDialog, setShowImpactDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<FormState | null>(null);

  const form = useForm<FormState>({
    defaultValues: {
      name: portfolio.name,
      baseCurrency: portfolio.baseCurrency as FormState["baseCurrency"],
      industrySector: portfolio.industrySector as FormState["industrySector"],
      assetTypes: portfolio.acceptedAssetTypes,
    },
    mode: "onChange",
  });

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isValid, isDirty, touchedFields },
  } = form;

  // AC-2.3.8: Unsaved changes warning
  useUnsavedChangesWarning({
    isDirty,
    enabled: !isSubmitting,
  });

  const watchedName = watch("name");
  const watchedCurrency = watch("baseCurrency");
  const watchedSector = watch("industrySector");
  const nameLength = watchedName?.length ?? 0;

  /**
   * Check for similar portfolio names
   * Only check if name changed from original
   */
  const checkSimilarName = useCallback(
    async (name: string) => {
      // Skip check if name is same as original
      if (name === portfolio.name) {
        setSimilarPortfolios([]);
        return;
      }

      if (!name || name.trim().length < 2) {
        setSimilarPortfolios([]);
        return;
      }

      setIsCheckingName(true);
      try {
        const response = await fetch("/api/portfolios/check-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        if (response.ok) {
          const result: CheckNameResponse = await response.json();
          // Filter out the current portfolio from results
          const filtered = result.data.similarPortfolios.filter((p) => p.id !== portfolio.id);
          setSimilarPortfolios(filtered);
        }
      } catch {
        // Silently fail
      } finally {
        setIsCheckingName(false);
      }
    },
    [portfolio.id, portfolio.name]
  );

  /**
   * Debounced name check
   */
  const debouncedCheckNameRef = useRef(debounce(checkSimilarName, 300));

  useEffect(() => {
    debouncedCheckNameRef.current = debounce(checkSimilarName, 300);
  }, [checkSimilarName]);

  useEffect(() => {
    if (watchedName) {
      debouncedCheckNameRef.current(watchedName);
    } else {
      setSimilarPortfolios([]);
    }
  }, [watchedName]);

  /**
   * Handle asset type checkbox change
   * AC-2.3.4: Check for impact when removing asset types
   */
  const handleAssetTypeChange = (assetType: AssetType, checked: boolean) => {
    const newSelectedTypes = checked
      ? [...selectedAssetTypes, assetType]
      : selectedAssetTypes.filter((t) => t !== assetType);

    setSelectedAssetTypes(newSelectedTypes);
    setValue("assetTypes", newSelectedTypes, { shouldValidate: true });
  };

  /**
   * Handle industry sector change
   */
  const handleSectorChange = (value: string) => {
    setValue("industrySector", value as FormState["industrySector"], { shouldValidate: true });
  };

  /**
   * Handle currency change
   */
  const handleCurrencyChange = (value: string) => {
    setValue("baseCurrency", value as FormState["baseCurrency"], { shouldValidate: true });
  };

  /**
   * Check for impact of proposed changes
   * AC-2.3.3, AC-2.3.4
   */
  const checkImpact = async (data: FormState): Promise<ImpactAnalysisResult | null> => {
    // Only check if asset types changed
    const assetTypesChanged =
      JSON.stringify(data.assetTypes.sort()) !==
      JSON.stringify(portfolio.acceptedAssetTypes.sort());

    if (!assetTypesChanged) {
      return null;
    }

    try {
      const response = await fetch(`/api/portfolios/${portfolio.id}/impact-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetTypes: data.assetTypes }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data as ImpactAnalysisResult;
      }
    } catch {
      // Proceed without impact check on error
    }

    return null;
  };

  /**
   * Submit the form
   * AC-2.3.2: Success toast
   * AC-2.3.9: Redirect after save
   */
  const submitForm = async (data: FormState, assetIdsToRemove?: string[]) => {
    setIsSubmitting(true);
    try {
      // Build update payload with only changed fields
      const payload: Partial<UpdatePortfolioInput> & { assetIdsToRemove?: string[] } = {};

      if (data.name !== portfolio.name) {
        payload.name = data.name;
      }
      if (data.baseCurrency !== portfolio.baseCurrency) {
        payload.baseCurrency = data.baseCurrency as UpdatePortfolioInput["baseCurrency"];
      }
      if (data.industrySector !== portfolio.industrySector) {
        payload.industrySector = data.industrySector as UpdatePortfolioInput["industrySector"];
      }
      if (
        JSON.stringify(data.assetTypes.sort()) !==
        JSON.stringify(portfolio.acceptedAssetTypes.sort())
      ) {
        payload.assetTypes = data.assetTypes;
      }

      // Add assets to remove if confirmed
      if (assetIdsToRemove && assetIdsToRemove.length > 0) {
        payload.assetIdsToRemove = assetIdsToRemove;
      }

      // Check if there are any changes
      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        return;
      }

      const response = await fetch(`/api/portfolios/${portfolio.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to update portfolio");
        return;
      }

      const result = await response.json();
      const removedCount = result.data?.removedAssetCount ?? 0;

      // Show appropriate success message
      if (removedCount > 0) {
        toast.success(
          `Portfolio updated. ${removedCount} ${removedCount === 1 ? "asset" : "assets"} removed.`
        );
      } else {
        toast.success("Portfolio updated");
      }

      // AC-2.3.9: Redirect to portfolio detail
      router.push(`/portfolio/${portfolio.id}`);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle form submission
   * Check for impact before submitting
   */
  const onSubmit = async (data: FormState) => {
    // Check for potential impact
    const impact = await checkImpact(data);

    if (impact && impact.hasImpact) {
      // Store pending submit and show confirmation dialog
      setImpactAnalysis(impact);
      setPendingSubmit(data);
      setShowImpactDialog(true);
      return;
    }

    // No impact, proceed with submit
    await submitForm(data);
  };

  /**
   * Handle impact confirmation
   * AC-2.3.5
   */
  const handleImpactConfirm = async () => {
    if (!pendingSubmit || !impactAnalysis) return;

    const assetIdsToRemove = impactAnalysis.assetsToRemove.map((a) => a.id);
    await submitForm(pendingSubmit, assetIdsToRemove);

    // Close dialog and clear state
    setShowImpactDialog(false);
    setPendingSubmit(null);
    setImpactAnalysis(null);
  };

  /**
   * Handle impact cancel
   * AC-2.3.6
   */
  const handleImpactCancel = () => {
    setShowImpactDialog(false);
    setPendingSubmit(null);
    setImpactAnalysis(null);
  };

  const hasExactMatch = similarPortfolios.some((p) => p.similarity === "exact");

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        data-testid="portfolio-edit-form"
      >
        {/* Portfolio Name - AC-3.4.5/3.4.6: Visual Status Feedback */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Portfolio Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="e.g., Retirement Fund, Tech Portfolio"
              maxLength={PORTFOLIO_NAME_MAX_LENGTH}
              {...register("name")}
              aria-describedby={errors.name ? "name-error" : "name-hint"}
              className={cn(
                "border pr-16",
                getFieldBorderClassName({
                  hasError: !!errors.name,
                  isTouched: !!touchedFields.name,
                  isValid: !errors.name && !!touchedFields.name,
                })
              )}
              data-testid="portfolio-name-input"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {nameLength}/{PORTFOLIO_NAME_MAX_LENGTH}
            </span>
          </div>
          {errors.name ? (
            <p id="name-error" role="alert" className="text-sm text-destructive">
              {errors.name.message}
            </p>
          ) : (
            <p id="name-hint" className="text-sm text-muted-foreground">
              Choose a descriptive name for your portfolio.
            </p>
          )}

          {/* Similar name warning */}
          {similarPortfolios.length > 0 && (
            <Alert variant={hasExactMatch ? "destructive" : "default"} className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {hasExactMatch ? (
                  <span>
                    A portfolio with this exact name already exists. Consider choosing a different
                    name.
                  </span>
                ) : (
                  <span>
                    Similar portfolios found:{" "}
                    {similarPortfolios.map((p) => `"${p.name}"`).join(", ")}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          {isCheckingName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking name...
            </div>
          )}
        </div>

        {/* Base Currency */}
        <div className="space-y-2">
          <Label htmlFor="baseCurrency">
            Base Currency <span className="text-destructive">*</span>
          </Label>
          <Select value={watchedCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger
              id="baseCurrency"
              className="w-full sm:w-[280px]"
              data-testid="portfolio-currency-select"
            >
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.name} ({currency.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            All values in this portfolio will be displayed in this currency.
          </p>
        </div>

        {/* Industry Sector */}
        <div className="space-y-2">
          <Label htmlFor="industrySector">
            Industry Sector <span className="text-destructive">*</span>
          </Label>
          <Select value={watchedSector ?? ""} onValueChange={handleSectorChange}>
            <SelectTrigger
              id="industrySector"
              className={`w-full sm:w-[280px] ${errors.industrySector ? "border-destructive" : ""}`}
              data-testid="portfolio-sector-select"
            >
              <SelectValue placeholder="Select industry sector" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_SECTORS.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.industrySector && (
            <p className="text-sm text-destructive">{String(errors.industrySector.message)}</p>
          )}
          <p className="text-sm text-muted-foreground">
            This helps categorize your portfolio for analysis.
          </p>
        </div>

        {/* Asset Types */}
        <div className="space-y-3">
          <Label>
            Accepted Asset Types <span className="text-destructive">*</span>
          </Label>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            data-testid="portfolio-asset-types"
          >
            {ASSET_TYPES.map((assetType) => (
              <label
                key={assetType}
                className="flex items-center gap-2 cursor-pointer rounded-md border p-3 hover:bg-accent transition-colors"
              >
                <Checkbox
                  id={`asset-${assetType}`}
                  checked={selectedAssetTypes.includes(assetType)}
                  onCheckedChange={(checked) => handleAssetTypeChange(assetType, checked === true)}
                  data-testid={`asset-type-${assetType.toLowerCase()}`}
                />
                <span className="text-sm font-medium">{assetType}</span>
              </label>
            ))}
          </div>
          {errors.assetTypes && (
            <p className="text-sm text-destructive">{String(errors.assetTypes.message)}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Select the types of assets you want to track in this portfolio.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !isValid || !isDirty}
            className="w-full sm:w-auto"
            data-testid="portfolio-save-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/portfolio/${portfolio.id}`)}
            disabled={isSubmitting}
            data-testid="portfolio-cancel-button"
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Impact Confirmation Dialog */}
      {impactAnalysis && (
        <ImpactConfirmationDialog
          open={showImpactDialog}
          onOpenChange={setShowImpactDialog}
          assetsToRemove={impactAnalysis.assetsToRemove}
          changeType="assetType"
          onConfirm={handleImpactConfirm}
          onCancel={handleImpactCancel}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}

export default PortfolioEditForm;
