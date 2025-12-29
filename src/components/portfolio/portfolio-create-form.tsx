"use client";

/**
 * Portfolio Create Form Component
 *
 * Story 2.1: Create Portfolio
 *
 * Client component for creating new portfolios.
 *
 * AC-2.1.1: Form fields for name, currency, industry sector, asset types
 * AC-2.1.2: Industry sector dropdown selection
 * AC-2.1.3: Asset types multi-select checkboxes
 * AC-2.1.4: Similar name warning with debounce
 * AC-2.1.5: Client-side validation before submit
 * AC-2.1.6: Redirect to portfolios list after success
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createPortfolioSchema,
  SUPPORTED_CURRENCIES,
  INDUSTRY_SECTORS,
  ASSET_TYPES,
  PORTFOLIO_NAME_MAX_LENGTH,
  type CreatePortfolioInput,
  type AssetType,
} from "@/lib/validations/portfolio";

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
 * Debounce utility function for name check
 * AC-2.1.4: 300ms debounce
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

export function PortfolioCreateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [similarPortfolios, setSimilarPortfolios] = useState<SimilarPortfolio[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<AssetType[]>(["Stocks"]);

  const form = useForm({
    resolver: zodResolver(createPortfolioSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD" as const,
      industrySector: "Other" as const,
      assetTypes: ["Stocks"] as AssetType[],
    },
    mode: "onChange",
  });

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = form;

  const watchedName = watch("name");
  const watchedCurrency = watch("baseCurrency");
  const watchedSector = watch("industrySector");
  const nameLength = watchedName?.length ?? 0;

  /**
   * Check for similar portfolio names
   * AC-2.1.4: Debounced call to check for duplicates
   */
  const checkSimilarName = useCallback(async (name: string) => {
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
        setSimilarPortfolios(result.data.similarPortfolios);
      }
    } catch {
      // Silently fail - don't block form for name check errors
    } finally {
      setIsCheckingName(false);
    }
  }, []);

  /**
   * Debounced name check
   * AC-2.1.4: 300ms debounce
   */
  const debouncedCheckNameRef = useRef(debounce(checkSimilarName, 300));

  useEffect(() => {
    debouncedCheckNameRef.current = debounce(checkSimilarName, 300);
  }, [checkSimilarName]);

  /**
   * Watch name changes and trigger debounced check
   */
  useEffect(() => {
    if (watchedName) {
      debouncedCheckNameRef.current(watchedName);
    } else {
      setSimilarPortfolios([]);
    }
  }, [watchedName]);

  /**
   * Handle asset type checkbox change
   * AC-2.1.3: Multi-select for asset types
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
   * AC-2.1.2: Industry sector selection
   */
  const handleSectorChange = (value: string) => {
    setValue("industrySector", value as CreatePortfolioInput["industrySector"], {
      shouldValidate: true,
    });
  };

  /**
   * Handle currency change
   */
  const handleCurrencyChange = (value: string) => {
    setValue("baseCurrency", value as CreatePortfolioInput["baseCurrency"], {
      shouldValidate: true,
    });
  };

  /**
   * Handle form submission
   * AC-2.1.5: Validation before submit
   * AC-2.1.6: Redirect after success
   */
  const onSubmit = async (data: Record<string, unknown>) => {
    const portfolioData = data as CreatePortfolioInput;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "LIMIT_EXCEEDED") {
          toast.error("Portfolio limit reached. You can have up to 5 portfolios.");
        } else {
          toast.error(error.error || "Failed to create portfolio");
        }
        return;
      }

      toast.success("Portfolio created successfully!");
      router.push("/dashboard/portfolios");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasExactMatch = similarPortfolios.some((p) => p.similarity === "exact");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Portfolio Name - AC-2.1.1 */}
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
            className={errors.name ? "border-destructive" : ""}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {nameLength}/{PORTFOLIO_NAME_MAX_LENGTH}
          </span>
        </div>
        {errors.name ? (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        ) : (
          <p id="name-hint" className="text-sm text-muted-foreground">
            Choose a descriptive name for your portfolio.
          </p>
        )}

        {/* Similar name warning - AC-2.1.4 */}
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
                  Similar portfolios found: {similarPortfolios.map((p) => `"${p.name}"`).join(", ")}
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

      {/* Base Currency - AC-2.1.1 */}
      <div className="space-y-2">
        <Label htmlFor="baseCurrency">
          Base Currency <span className="text-destructive">*</span>
        </Label>
        <Select value={watchedCurrency} onValueChange={handleCurrencyChange}>
          <SelectTrigger id="baseCurrency" className="w-full sm:w-[280px]">
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

      {/* Industry Sector - AC-2.1.2 */}
      <div className="space-y-2">
        <Label htmlFor="industrySector">
          Industry Sector <span className="text-destructive">*</span>
        </Label>
        <Select value={watchedSector ?? ""} onValueChange={handleSectorChange}>
          <SelectTrigger
            id="industrySector"
            className={`w-full sm:w-[280px] ${errors.industrySector ? "border-destructive" : ""}`}
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
          <p className="text-sm text-destructive">{errors.industrySector.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          This helps categorize your portfolio for analysis.
        </p>
      </div>

      {/* Asset Types - AC-2.1.3 */}
      <div className="space-y-3">
        <Label>
          Accepted Asset Types <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ASSET_TYPES.map((assetType) => (
            <label
              key={assetType}
              className="flex items-center gap-2 cursor-pointer rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <Checkbox
                id={`asset-${assetType}`}
                checked={selectedAssetTypes.includes(assetType)}
                onCheckedChange={(checked) => handleAssetTypeChange(assetType, checked === true)}
              />
              <span className="text-sm font-medium">{assetType}</span>
            </label>
          ))}
        </div>
        {errors.assetTypes && (
          <p className="text-sm text-destructive">{errors.assetTypes.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Select the types of assets you want to track in this portfolio.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting || !isValid} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Portfolio"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/portfolios")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
