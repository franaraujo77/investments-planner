"use client";

/**
 * Asset Search Input Component
 *
 * Story 2.5: Add Holdings to Portfolio
 *
 * AC-2.5.3: Autocomplete suggestions after 2+ characters
 * AC-2.5.4: Auto-populate symbol and name on selection
 *
 * MVP Implementation:
 * - Static list of common assets for suggestions
 * - Current price display deferred to Epic 6 (external data not yet available)
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Common assets for MVP autocomplete
 * Future: Replace with real-time API search (Epic 6)
 */
const COMMON_ASSETS = [
  // US Stocks
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  // Brazilian Stocks
  { symbol: "PETR4", name: "Petrobras PN" },
  { symbol: "VALE3", name: "Vale ON" },
  { symbol: "ITUB4", name: "Itaú Unibanco PN" },
  { symbol: "BBDC4", name: "Bradesco PN" },
  { symbol: "B3SA3", name: "B3 ON" },
  { symbol: "ABEV3", name: "Ambev ON" },
  { symbol: "WEGE3", name: "WEG ON" },
  { symbol: "RENT3", name: "Localiza ON" },
  // ETFs
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
  { symbol: "IVV", name: "iShares Core S&P 500 ETF" },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF" },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF" },
  { symbol: "IVVB11", name: "iShares S&P 500 B3 ETF" },
  { symbol: "BOVA11", name: "iShares Ibovespa ETF" },
  // REITs
  { symbol: "VNQ", name: "Vanguard Real Estate ETF" },
  { symbol: "SCHH", name: "Schwab U.S. REIT ETF" },
  { symbol: "HGLG11", name: "CSHG Logística FII" },
  { symbol: "MXRF11", name: "Maxi Renda FII" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "Binance Coin" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "XRP", name: "Ripple" },
  // Bonds
  { symbol: "BND", name: "Vanguard Total Bond Market ETF" },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF" },
] as const;

export interface AssetSuggestion {
  symbol: string;
  name: string;
}

interface AssetSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (asset: AssetSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
}

/**
 * Debounce function for search
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Asset Search Input with Autocomplete
 *
 * Provides type-ahead search for asset symbols and names.
 * Suggestions appear after 2+ characters are typed.
 */
export function AssetSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search symbol or name...",
  disabled = false,
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: AssetSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // AC-2.5.3: Debounce search input (300ms)
  const debouncedSearch = useDebounce(value, 300);

  // Filter suggestions based on search term
  const suggestions = useMemo(() => {
    // AC-2.5.3: Only show suggestions after 2+ characters
    if (!debouncedSearch || debouncedSearch.length < 2) {
      return [];
    }

    const searchTerm = debouncedSearch.toLowerCase().trim();

    return COMMON_ASSETS.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(searchTerm) ||
        asset.name.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 suggestions
  }, [debouncedSearch]);

  // Derive open state from focus and suggestions
  const isOpen = isFocused && suggestions.length > 0;

  // Clamp highlighted index to valid range if suggestions list shrinks
  const safeHighlightedIndex =
    highlightedIndex >= 0 && highlightedIndex < suggestions.length ? highlightedIndex : -1;

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  /**
   * Handle suggestion selection
   * AC-2.5.4: Auto-populate symbol and name
   */
  const handleSelect = useCallback(
    (asset: AssetSuggestion) => {
      onSelect(asset);
      onChange(asset.symbol);
      setIsFocused(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect, onChange]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (safeHighlightedIndex >= 0) {
            const selectedAsset = suggestions[safeHighlightedIndex];
            if (selectedAsset) {
              handleSelect(selectedAsset);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsFocused(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, safeHighlightedIndex, handleSelect]
  );

  /**
   * Handle blur - close dropdown with delay to allow click
   */
  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setIsFocused(false);
      setHighlightedIndex(-1);
    }, 150);
  }, []);

  /**
   * Handle focus - enable dropdown display
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  /**
   * Clear input
   */
  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (safeHighlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[safeHighlightedIndex] as HTMLLIElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [safeHighlightedIndex]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10 pr-10 uppercase", className)}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? "asset-suggestions" : undefined}
          aria-activedescendant={
            safeHighlightedIndex >= 0 ? `suggestion-${safeHighlightedIndex}` : undefined
          }
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          data-testid="asset-search-input"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="asset-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
          data-testid="asset-suggestions"
        >
          {suggestions.map((asset, index) => (
            <li
              key={asset.symbol}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === safeHighlightedIndex}
              onClick={() => handleSelect(asset)}
              className={cn(
                "px-4 py-2 cursor-pointer transition-colors",
                index === safeHighlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              data-testid={`asset-suggestion-${asset.symbol}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{asset.symbol}</span>
                <span className="text-sm text-muted-foreground truncate ml-2">{asset.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isFocused && value.length >= 2 && suggestions.length === 0 && (
        <div
          className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg p-4 text-center text-muted-foreground"
          data-testid="no-suggestions"
        >
          No matching assets found. You can enter a custom symbol.
        </div>
      )}
    </div>
  );
}

export { COMMON_ASSETS };
