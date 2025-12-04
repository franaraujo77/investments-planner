"use client";

/**
 * Profile Settings Form Component
 *
 * Story 2.6: Profile Settings & Base Currency
 *
 * Client component with auto-save functionality for profile updates.
 *
 * AC-2.6.1: Shows name and base currency fields
 * AC-2.6.2: Currency dropdown with 8 options
 * AC-2.6.4: Auto-save with success indicator
 * AC-2.6.5: Name field max 100 characters
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Supported currencies for base currency setting
 * AC-2.6.2: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
 */
const SUPPORTED_CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "BRL", label: "Brazilian Real (BRL)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
] as const;

/**
 * Form validation schema
 * AC-2.6.5: Name max 100 characters
 */
const profileSchema = z.object({
  name: z.string().max(100, "Name must be 100 characters or less"),
  baseCurrency: z.enum(["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"]),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsFormProps {
  initialData: {
    name: string | null;
    baseCurrency: string;
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

export function ProfileSettingsForm({ initialData }: ProfileSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<ProfileFormData>({
    name: initialData.name ?? "",
    baseCurrency: initialData.baseCurrency as ProfileFormData["baseCurrency"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData.name ?? "",
      baseCurrency: initialData.baseCurrency as ProfileFormData["baseCurrency"],
    },
    mode: "onChange",
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  /**
   * Save profile to API
   * AC-2.6.4: Auto-save with success indicator
   */
  const saveProfile = useCallback(
    async (data: ProfileFormData) => {
      // Only save if data has changed
      if (data.name === lastSavedData.name && data.baseCurrency === lastSavedData.baseCurrency) {
        return;
      }

      setIsSaving(true);
      setShowSuccess(false);

      try {
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name || undefined,
            baseCurrency: data.baseCurrency,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to save changes");
        }

        // Update last saved data
        setLastSavedData(data);

        // Show success indicator
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save changes");
      } finally {
        setIsSaving(false);
      }
    },
    [lastSavedData]
  );

  /**
   * Debounced save function
   * AC-2.6.4: 500ms debounce for auto-save
   */
  const debouncedSaveRef = useRef(debounce(saveProfile, 500));

  // Update debounced function when saveProfile changes
  useEffect(() => {
    debouncedSaveRef.current = debounce(saveProfile, 500);
  }, [saveProfile]);

  /**
   * Watch for form changes and trigger auto-save
   */
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.name !== undefined && value.baseCurrency !== undefined) {
        debouncedSaveRef.current({
          name: value.name,
          baseCurrency: value.baseCurrency as ProfileFormData["baseCurrency"],
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  /**
   * Handle currency change
   * Immediately triggers save (no debounce for select changes)
   */
  const handleCurrencyChange = (value: string) => {
    setValue("baseCurrency", value as ProfileFormData["baseCurrency"]);
    // Save immediately on currency change (no debounce needed for select)
    const currentName = watch("name");
    saveProfile({
      name: currentName,
      baseCurrency: value as ProfileFormData["baseCurrency"],
    });
  };

  const currentName = watch("name");
  const currentCurrency = watch("baseCurrency");
  const nameLength = currentName?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          {/* Success/Saving indicator */}
          <div className="flex items-center gap-2 text-sm">
            {isSaving && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
            {showSuccess && !isSaving && (
              <span className="flex items-center gap-1 text-green-600 transition-opacity duration-200">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Name Field - AC-2.6.1, AC-2.6.5 */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Enter your name"
                maxLength={100}
                {...register("name")}
                aria-describedby={errors.name ? "name-error" : "name-hint"}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {nameLength}/100
              </span>
            </div>
            {errors.name ? (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            ) : (
              <p id="name-hint" className="text-sm text-muted-foreground">
                This is how your name will appear in the app.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>

        <div className="space-y-4">
          {/* Base Currency Field - AC-2.6.1, AC-2.6.2 */}
          <div className="space-y-2">
            <Label htmlFor="baseCurrency">Base Currency</Label>
            <Select value={currentCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger id="baseCurrency" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              All portfolio values will be displayed in this currency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
