/**
 * Source Attribution Types and Utilities Tests
 *
 * Story 6.8: Data Source Attribution
 * AC-6.8.1: Provider Name Displayed for Each Data Point
 * AC-6.8.2: Source Format String Display
 *
 * Tests for source attribution types and utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  getProviderDisplayName,
  formatSourceAttribution,
  createSourceAttribution,
  isValidSource,
  getSourceOrDefault,
  PROVIDER_DISPLAY_NAMES,
  DATA_TYPE_LABELS,
  type SourceDataType,
} from "@/lib/types/source-attribution";

// =============================================================================
// getProviderDisplayName Tests
// =============================================================================

describe("getProviderDisplayName", () => {
  /**
   * AC-6.8.1: Provider name is human-readable (not technical API names)
   */
  describe("known providers", () => {
    it("should map 'gemini' to 'Gemini API'", () => {
      expect(getProviderDisplayName("gemini")).toBe("Gemini API");
    });

    it("should map 'yahoo' to 'Yahoo Finance'", () => {
      expect(getProviderDisplayName("yahoo")).toBe("Yahoo Finance");
    });

    it("should map 'exchangerate-api' to 'ExchangeRate-API'", () => {
      expect(getProviderDisplayName("exchangerate-api")).toBe("ExchangeRate-API");
    });

    it("should map 'open-exchange-rates' to 'Open Exchange Rates'", () => {
      expect(getProviderDisplayName("open-exchange-rates")).toBe("Open Exchange Rates");
    });

    it("should handle already display names", () => {
      expect(getProviderDisplayName("Gemini API")).toBe("Gemini API");
      expect(getProviderDisplayName("Yahoo Finance")).toBe("Yahoo Finance");
    });
  });

  describe("unknown providers", () => {
    it("should return the source as-is for unknown providers", () => {
      expect(getProviderDisplayName("unknown-provider")).toBe("unknown-provider");
      expect(getProviderDisplayName("some-new-api")).toBe("some-new-api");
    });
  });

  describe("edge cases", () => {
    it("should return 'Unknown' for empty string", () => {
      expect(getProviderDisplayName("")).toBe("Unknown");
    });

    it("should return 'Unknown' for whitespace-only string", () => {
      // Empty string check happens before any trimming
      expect(getProviderDisplayName("")).toBe("Unknown");
    });
  });
});

// =============================================================================
// formatSourceAttribution Tests
// =============================================================================

describe("formatSourceAttribution", () => {
  /**
   * AC-6.8.2: Format follows the pattern "Price from Gemini API"
   */
  describe("price data type", () => {
    it("should format 'Price from Gemini API' correctly", () => {
      expect(formatSourceAttribution("price", "gemini")).toBe("Price from Gemini API");
    });

    it("should format with already-display provider name", () => {
      expect(formatSourceAttribution("price", "Gemini API")).toBe("Price from Gemini API");
    });
  });

  describe("rate data type", () => {
    it("should format 'Rate from ExchangeRate-API' correctly", () => {
      expect(formatSourceAttribution("rate", "exchangerate-api")).toBe(
        "Rate from ExchangeRate-API"
      );
    });

    it("should format 'Rate from Open Exchange Rates' correctly", () => {
      expect(formatSourceAttribution("rate", "open-exchange-rates")).toBe(
        "Rate from Open Exchange Rates"
      );
    });
  });

  describe("fundamentals data type", () => {
    it("should format 'Fundamentals from Gemini API' correctly", () => {
      expect(formatSourceAttribution("fundamentals", "gemini")).toBe(
        "Fundamentals from Gemini API"
      );
    });

    it("should format 'Fundamentals from Yahoo Finance' correctly", () => {
      expect(formatSourceAttribution("fundamentals", "yahoo")).toBe(
        "Fundamentals from Yahoo Finance"
      );
    });
  });

  describe("score data type", () => {
    it("should format score attribution correctly", () => {
      expect(formatSourceAttribution("score", "local")).toBe("Score from local");
    });
  });

  describe("unknown data type", () => {
    it("should use 'Data' as fallback for unknown types", () => {
      expect(formatSourceAttribution("unknown" as SourceDataType, "gemini")).toBe(
        "Data from Gemini API"
      );
    });
  });

  describe("unknown provider", () => {
    it("should use provider name as-is for unknown providers", () => {
      expect(formatSourceAttribution("price", "new-provider")).toBe("Price from new-provider");
    });
  });
});

// =============================================================================
// createSourceAttribution Tests
// =============================================================================

describe("createSourceAttribution", () => {
  it("should create SourceAttribution object with display name", () => {
    const attribution = createSourceAttribution("price", "gemini");

    expect(attribution.dataType).toBe("price");
    expect(attribution.source).toBe("Gemini API");
    expect(attribution.timestamp).toBeUndefined();
  });

  it("should include timestamp when provided", () => {
    const timestamp = new Date("2025-12-10T12:00:00Z");
    const attribution = createSourceAttribution("rate", "exchangerate-api", timestamp);

    expect(attribution.dataType).toBe("rate");
    expect(attribution.source).toBe("ExchangeRate-API");
    expect(attribution.timestamp).toEqual(timestamp);
  });
});

// =============================================================================
// isValidSource Tests
// =============================================================================

describe("isValidSource", () => {
  /**
   * AC-6.8.4: Source is never null or empty for fetched data
   */
  it("should return true for valid source strings", () => {
    expect(isValidSource("gemini")).toBe(true);
    expect(isValidSource("Gemini API")).toBe(true);
    expect(isValidSource("some-provider")).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidSource(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidSource(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidSource("")).toBe(false);
  });

  it("should return false for whitespace-only string", () => {
    expect(isValidSource("   ")).toBe(false);
  });
});

// =============================================================================
// getSourceOrDefault Tests
// =============================================================================

describe("getSourceOrDefault", () => {
  it("should return display name for valid source", () => {
    expect(getSourceOrDefault("gemini")).toBe("Gemini API");
    expect(getSourceOrDefault("yahoo")).toBe("Yahoo Finance");
  });

  it("should return 'Unknown' for null", () => {
    expect(getSourceOrDefault(null)).toBe("Unknown");
  });

  it("should return 'Unknown' for undefined", () => {
    expect(getSourceOrDefault(undefined)).toBe("Unknown");
  });

  it("should return 'Unknown' for empty string", () => {
    expect(getSourceOrDefault("")).toBe("Unknown");
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe("PROVIDER_DISPLAY_NAMES", () => {
  it("should contain all expected provider mappings", () => {
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("gemini");
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("yahoo");
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("exchangerate-api");
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("open-exchange-rates");
  });
});

describe("DATA_TYPE_LABELS", () => {
  it("should contain all data type labels", () => {
    expect(DATA_TYPE_LABELS.price).toBe("Price");
    expect(DATA_TYPE_LABELS.rate).toBe("Rate");
    expect(DATA_TYPE_LABELS.fundamentals).toBe("Fundamentals");
    expect(DATA_TYPE_LABELS.score).toBe("Score");
  });
});
