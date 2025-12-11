/**
 * Source Attribution Component Tests
 *
 * Story 6.8: Data Source Attribution
 * AC-6.8.1: Provider Name Displayed for Each Data Point
 * AC-6.8.2: Source Format String Display
 *
 * Tests for SourceAttributionLabel and related components.
 */

import { describe, it, expect } from "vitest";
import { getDataTypeIcon, formatTimestamp } from "@/components/data/source-attribution-label";
import { TrendingUp, Globe, Database, Calculator } from "lucide-react";

// =============================================================================
// getDataTypeIcon Tests
// =============================================================================

describe("getDataTypeIcon", () => {
  /**
   * Tests that correct icons are returned for each data type
   */
  it("should return TrendingUp icon for price data type", () => {
    const Icon = getDataTypeIcon("price");
    expect(Icon).toBe(TrendingUp);
  });

  it("should return Globe icon for rate data type", () => {
    const Icon = getDataTypeIcon("rate");
    expect(Icon).toBe(Globe);
  });

  it("should return Database icon for fundamentals data type", () => {
    const Icon = getDataTypeIcon("fundamentals");
    expect(Icon).toBe(Database);
  });

  it("should return Calculator icon for score data type", () => {
    const Icon = getDataTypeIcon("score");
    expect(Icon).toBe(Calculator);
  });

  it("should return Database icon as default for unknown data type", () => {
    const Icon = getDataTypeIcon("unknown");
    expect(Icon).toBe(Database);
  });
});

// =============================================================================
// formatTimestamp Tests
// =============================================================================

describe("formatTimestamp", () => {
  it("should format date correctly", () => {
    // Create date in local timezone
    const date = new Date("2025-12-10T15:30:00");
    const formatted = formatTimestamp(date);

    // Should include month, day, hour, and minute
    expect(formatted).toMatch(/Dec 10/);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    expect(formatted).toMatch(/(AM|PM)/);
  });

  it("should handle different times of day", () => {
    const morning = new Date("2025-12-10T09:00:00");
    const evening = new Date("2025-12-10T21:00:00");

    const morningFormatted = formatTimestamp(morning);
    const eveningFormatted = formatTimestamp(evening);

    // Morning should show AM
    expect(morningFormatted).toMatch(/AM/);
    // Evening should show PM
    expect(eveningFormatted).toMatch(/PM/);
  });

  it("should handle midnight correctly", () => {
    const midnight = new Date("2025-12-10T00:00:00");
    const formatted = formatTimestamp(midnight);

    expect(formatted).toMatch(/Dec 10/);
    expect(formatted).toMatch(/12:00 AM/);
  });

  it("should handle noon correctly", () => {
    const noon = new Date("2025-12-10T12:00:00");
    const formatted = formatTimestamp(noon);

    expect(formatted).toMatch(/Dec 10/);
    expect(formatted).toMatch(/12:00 PM/);
  });
});

// =============================================================================
// Integration Tests (Data Flow)
// =============================================================================

describe("source attribution data flow", () => {
  /**
   * AC-6.8.2: Format is consistent across all data types
   */
  it("should support all defined data types", () => {
    const dataTypes = ["price", "rate", "fundamentals", "score"] as const;

    for (const dataType of dataTypes) {
      // Each data type should have a corresponding icon
      const Icon = getDataTypeIcon(dataType);
      expect(Icon).toBeDefined();
    }
  });
});
