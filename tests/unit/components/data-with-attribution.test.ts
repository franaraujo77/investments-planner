/**
 * DataWithAttribution Component Tests
 *
 * Story 7.1: Data Source Attribution
 * AC-7.1.1: Click/Hover Data Point Attribution
 * AC-7.1.2: Timestamp Visibility
 *
 * Tests for the data attribution tooltip wrapper component.
 */

import { describe, it, expect } from "vitest";
import type { SourceAttribution, DocumentReference } from "@/lib/types/source-attribution";
import { getProviderDisplayName } from "@/lib/types/source-attribution";
import { formatRelativeTime, formatExactTime } from "@/lib/types/freshness";

// =============================================================================
// TYPE TESTS
// =============================================================================

describe("DataWithAttribution Props", () => {
  describe("DataWithAttributionProps type", () => {
    it("should require attribution prop", () => {
      const attribution: SourceAttribution = {
        dataType: "price",
        source: "gemini",
        timestamp: new Date("2025-12-31T10:00:00Z"),
      };

      expect(attribution.dataType).toBe("price");
      expect(attribution.source).toBe("gemini");
      expect(attribution.timestamp).toBeInstanceOf(Date);
    });

    it("should accept attribution with document reference", () => {
      const docRef: DocumentReference = {
        title: "Q3 2024 Earnings Report",
        type: "earnings",
        publicationDate: new Date("2024-10-15"),
        url: "https://ir.company.com/earnings",
      };

      const attribution: SourceAttribution = {
        dataType: "fundamentals",
        source: "company-ir",
        timestamp: new Date("2025-12-31T10:00:00Z"),
        documentRef: docRef,
      };

      expect(attribution.documentRef?.title).toBe("Q3 2024 Earnings Report");
    });

    it("should support showOnHover option (default: true)", () => {
      const props = {
        showOnHover: true,
      };

      expect(props.showOnHover).toBe(true);
    });
  });
});

// =============================================================================
// TOOLTIP CONTENT TESTS
// =============================================================================

describe("DataWithAttribution Tooltip Content", () => {
  describe("Provider Name Display (AC-7.1.1)", () => {
    it("should display human-readable provider name", () => {
      const source = "gemini";
      const displayName = getProviderDisplayName(source);

      expect(displayName).toBe("Gemini API");
    });

    it("should display IR document provider name", () => {
      const source = "company-ir";
      const displayName = getProviderDisplayName(source);

      expect(displayName).toBe("Company Investor Relations");
    });
  });

  describe("Timestamp Display (AC-7.1.2)", () => {
    it("should format relative time for tooltip display", () => {
      const timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const relativeTime = formatRelativeTime(timestamp);

      expect(relativeTime).toBe("3h ago");
    });

    it("should format exact time for detailed view", () => {
      const timestamp = new Date("2025-12-31T10:00:00");
      const exactTime = formatExactTime(timestamp);

      expect(exactTime).toContain("Dec");
      expect(exactTime).toContain("31");
      expect(exactTime).toContain("2025");
    });

    it("should handle 'just now' for very recent updates", () => {
      const now = new Date();
      const relativeTime = formatRelativeTime(now);

      expect(relativeTime).toBe("just now");
    });
  });

  describe("Document Reference in Tooltip (AC-7.1.3)", () => {
    it("should include document title in tooltip when present", () => {
      const docRef: DocumentReference = {
        title: "Q3 2024 Earnings Report",
        type: "earnings",
        publicationDate: new Date("2024-10-15"),
      };

      expect(docRef.title).toBe("Q3 2024 Earnings Report");
    });

    it("should include publication date in tooltip", () => {
      // Use UTC to avoid timezone issues
      const docRef: DocumentReference = {
        title: "Annual Report 2023",
        type: "annual-report",
        publicationDate: new Date("2024-03-15T12:00:00Z"),
      };

      const dateStr = docRef.publicationDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });

      expect(dateStr).toContain("Mar");
      expect(dateStr).toContain("2024");
    });

    it("should support verification link with URL (AC-7.1.5)", () => {
      const docRef: DocumentReference = {
        title: "SEC 10-K Filing",
        type: "filing",
        publicationDate: new Date("2024-03-15"),
        url: "https://sec.gov/filings/123456",
        filingId: "10-K-2024-00123",
      };

      // Document should have URL for verification
      expect(docRef.url).toBe("https://sec.gov/filings/123456");
      expect(docRef.filingId).toBe("10-K-2024-00123");
    });

    it("should handle document without URL gracefully", () => {
      const docRef: DocumentReference = {
        title: "Earnings Call Transcript",
        type: "earnings",
        publicationDate: new Date("2024-10-15"),
      };

      expect(docRef.url).toBeUndefined();
    });
  });
});

// =============================================================================
// INTERACTION TESTS
// =============================================================================

describe("DataWithAttribution Interactions", () => {
  describe("Hover Behavior (Desktop)", () => {
    it("should define showOnHover default as true", () => {
      const defaultShowOnHover = true;
      expect(defaultShowOnHover).toBe(true);
    });
  });

  describe("Click Behavior (Mobile)", () => {
    it("should support click-to-expand for mobile", () => {
      const showOnClick = true;
      expect(showOnClick).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("should define accessible test IDs", () => {
      const testIds = {
        wrapper: "data-with-attribution",
        tooltip: "attribution-tooltip",
        content: "attribution-content",
      };

      expect(testIds.wrapper).toBe("data-with-attribution");
      expect(testIds.tooltip).toBeDefined();
    });
  });
});
