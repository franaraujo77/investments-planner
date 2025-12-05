"use client";

/**
 * Asset Class Form Component
 *
 * Story 4.1: Define Asset Classes
 *
 * Inline form for creating a new asset class.
 * AC-4.1.2: Create asset class with name (1-50 chars) and optional icon
 */

import { useState, useRef, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateAssetClass } from "@/hooks/use-asset-classes";

interface AssetClassFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Common emoji icons for asset classes
const SUGGESTED_ICONS = ["📈", "🏠", "💵", "🪙", "💎", "🌍", "🏭", "💰"];

export function AssetClassForm({ onSuccess, onCancel }: AssetClassFormProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { createAssetClass, isCreating } = useCreateAssetClass();

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle save
  const handleSave = async () => {
    if (name.trim().length === 0) return;

    const result = await createAssetClass({
      name: name.trim(),
      icon: icon,
    });

    if (result) {
      onSuccess();
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Name input */}
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Asset class name"
            className="flex-1"
            maxLength={50}
            disabled={isCreating}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleSave}
            disabled={isCreating || name.trim().length === 0}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <span className="sr-only">Save</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onCancel}
            disabled={isCreating}
          >
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>

        {/* Icon selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Icon:</span>
          {SUGGESTED_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(icon === emoji ? null : emoji)}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg transition-colors ${
                icon === emoji
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-accent"
              }`}
              disabled={isCreating}
            >
              {emoji}
            </button>
          ))}
          {icon && (
            <button
              type="button"
              onClick={() => setIcon(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
              disabled={isCreating}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
