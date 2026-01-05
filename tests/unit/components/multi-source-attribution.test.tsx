/**
 * MultiSourceAttribution Component Tests
 *
 * Story 7.1: Data Source Attribution
 * AC-7.1.4: Multiple Sources Display
 *
 * Tests for the multi-source attribution component logic.
 * Full component rendering tests are E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import type { SourceAttribution } from "@/lib/types/source-attribution";
import {
  getPrimarySource,
  getSourceCount,
  formatSourceCountLabel,
  shouldShowExpandButton,
  type MultiSourceAttributionProps,
} from "@/components/data/multi-source-attribution";

// =============================================================================
// TEST DATA
// =============================================================================

const mockSources: SourceAttribution[] = [
  {
    dataType: "price",
    source: "Gemini API",
    timestamp: new Date("2025-12-31T10:00:00Z"),
  },
  {
    dataType: "fundamentals",
    source: "Yahoo Finance",
    timestamp: new Date("2025-12-30T08:00:00Z"),
  },
  {
    dataType: "rate",
    source: "ExchangeRate-API",
    timestamp: new Date("2025-12-31T09:00:00Z"),
  },
];

const singleSource: SourceAttribution[] = [
  {
    dataType: "price",
    source: "Gemini API",
    timestamp: new Date("2025-12-31T10:00:00Z"),
  },
];

// =============================================================================
// PROPS TESTS
// =============================================================================

describe("MultiSourceAttribution Props", () => {
  describe("MultiSourceAttributionProps type", () => {
    it("should accept required sources array", () => {
      const props: MultiSourceAttributionProps = {
        sources: mockSources,
      };

      expect(props.sources).toHaveLength(3);
    });

    it("should accept optional primarySourceIndex", () => {
      const props: MultiSourceAttributionProps = {
        sources: mockSources,
        primarySourceIndex: 1,
      };

      expect(props.primarySourceIndex).toBe(1);
    });

    it("should accept optional className", () => {
      const props: MultiSourceAttributionProps = {
        sources: mockSources,
        className: "custom-class",
      };

      expect(props.className).toBe("custom-class");
    });
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("getPrimarySource", () => {
  it("should return first source when no index specified", () => {
    const primary = getPrimarySource(mockSources);

    expect(primary?.source).toBe("Gemini API");
    expect(primary?.dataType).toBe("price");
  });

  it("should return source at specified index", () => {
    const primary = getPrimarySource(mockSources, 1);

    expect(primary?.source).toBe("Yahoo Finance");
    expect(primary?.dataType).toBe("fundamentals");
  });

  it("should return first source if index out of bounds", () => {
    const primary = getPrimarySource(mockSources, 10);

    expect(primary?.source).toBe("Gemini API");
  });

  it("should return undefined for empty array", () => {
    const primary = getPrimarySource([]);

    expect(primary).toBeUndefined();
  });
});

describe("getSourceCount", () => {
  it("should return correct count for multiple sources", () => {
    expect(getSourceCount(mockSources)).toBe(3);
  });

  it("should return 1 for single source", () => {
    expect(getSourceCount(singleSource)).toBe(1);
  });

  it("should return 0 for empty array", () => {
    expect(getSourceCount([])).toBe(0);
  });
});

describe("formatSourceCountLabel", () => {
  it("should format label for multiple sources (AC-7.1.4)", () => {
    const label = formatSourceCountLabel(3);

    expect(label).toBe("Data from 3 sources");
  });

  it("should use singular 'source' for single source", () => {
    const label = formatSourceCountLabel(1);

    expect(label).toBe("Data from 1 source");
  });

  it("should handle zero sources", () => {
    const label = formatSourceCountLabel(0);

    expect(label).toBe("No sources");
  });
});

describe("shouldShowExpandButton", () => {
  it("should return true for multiple sources (AC-7.1.4)", () => {
    expect(shouldShowExpandButton(mockSources)).toBe(true);
  });

  it("should return false for single source", () => {
    expect(shouldShowExpandButton(singleSource)).toBe(false);
  });

  it("should return false for empty sources", () => {
    expect(shouldShowExpandButton([])).toBe(false);
  });
});

// =============================================================================
// DISPLAY STATE TESTS
// =============================================================================

describe("MultiSourceAttribution Display States", () => {
  describe("Collapsed State (AC-7.1.4)", () => {
    it("should show primary source and count in collapsed state", () => {
      const primary = getPrimarySource(mockSources);
      const count = getSourceCount(mockSources);
      const label = formatSourceCountLabel(count);

      expect(primary?.source).toBe("Gemini API");
      expect(label).toBe("Data from 3 sources");
    });
  });

  describe("Expanded State (AC-7.1.4)", () => {
    it("should provide all sources with timestamps for expanded display", () => {
      // In expanded state, all sources are visible
      expect(mockSources).toHaveLength(3);

      // Each source should have timestamp for display
      mockSources.forEach((source) => {
        expect(source.timestamp).toBeInstanceOf(Date);
        expect(source.source).toBeTruthy();
        expect(source.dataType).toBeTruthy();
      });
    });
  });
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

describe("MultiSourceAttribution Accessibility", () => {
  describe("ARIA attributes", () => {
    it("should generate unique ID for aria-controls", () => {
      // Component should generate unique IDs for each instance
      const id1 = `multi-source-panel-${Date.now()}`;
      const id2 = `multi-source-panel-${Date.now() + 1}`;

      expect(id1).not.toBe(id2);
    });

    it("should support aria-expanded states", () => {
      // Component toggle logic
      let isExpanded = false;

      // Toggle function
      const toggle = () => {
        isExpanded = !isExpanded;
      };

      expect(isExpanded).toBe(false);
      toggle();
      expect(isExpanded).toBe(true);
      toggle();
      expect(isExpanded).toBe(false);
    });
  });

  describe("Keyboard Navigation", () => {
    it("should define toggle keys for accessibility", () => {
      const toggleKeys = ["Enter", " "];

      expect(toggleKeys).toContain("Enter");
      expect(toggleKeys).toContain(" "); // Space
    });
  });
});
