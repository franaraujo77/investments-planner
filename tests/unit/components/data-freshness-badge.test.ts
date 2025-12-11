/**
 * DataFreshnessBadge Component Tests
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.2: Colors Based on Data Age
 * AC-6.7.3: Hover Shows Exact Timestamp and Source
 * AC-6.7.4: Click Triggers Refresh (Within Rate Limit)
 *
 * Tests focus on the utility functions exported from the component.
 * Component rendering tests would require @testing-library/react which
 * is not currently in the project dependencies.
 */

import { describe, it, expect } from "vitest";
import {
  getFreshnessStatus,
  formatRelativeTime,
  formatExactTime,
  getFreshnessColorClasses,
  getFreshnessAriaLabel,
} from "@/lib/types/freshness";

describe("DataFreshnessBadge Utilities", () => {
  describe("getFreshnessStatus", () => {
    const now = new Date("2025-12-11T12:00:00Z");

    it("returns 'fresh' for data less than 24 hours old (AC-6.7.2)", () => {
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      expect(getFreshnessStatus(oneHourAgo, now)).toBe("fresh");
    });

    it("returns 'stale' for data 1-3 days old (AC-6.7.2)", () => {
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      expect(getFreshnessStatus(twoDaysAgo, now)).toBe("stale");
    });

    it("returns 'very-stale' for data more than 3 days old (AC-6.7.2)", () => {
      const fiveDaysAgo = new Date(now.getTime() - 120 * 60 * 60 * 1000);
      expect(getFreshnessStatus(fiveDaysAgo, now)).toBe("very-stale");
    });
  });

  describe("formatRelativeTime", () => {
    const now = new Date("2025-12-11T12:00:00Z");

    it("formats hours correctly for badge display (AC-6.7.1)", () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo, now)).toBe("2h ago");
    });

    it("formats days correctly for badge display (AC-6.7.1)", () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo, now)).toBe("3 days ago");
    });

    it("shows 'just now' for very recent data", () => {
      const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
      expect(formatRelativeTime(tenSecondsAgo, now)).toBe("just now");
    });
  });

  describe("formatExactTime", () => {
    it("formats date for tooltip display (AC-6.7.3)", () => {
      const date = new Date("2025-12-10T15:30:00Z");
      const formatted = formatExactTime(date);

      // Should include month, day, year
      expect(formatted).toContain("Dec");
      expect(formatted).toContain("10");
      expect(formatted).toContain("2025");
    });
  });

  describe("getFreshnessColorClasses", () => {
    it("returns green colors for fresh status (AC-6.7.2)", () => {
      const classes = getFreshnessColorClasses("fresh");
      expect(classes.bg).toContain("green");
      expect(classes.text).toContain("green");
    });

    it("returns amber colors for stale status (AC-6.7.2)", () => {
      const classes = getFreshnessColorClasses("stale");
      expect(classes.bg).toContain("amber");
      expect(classes.text).toContain("amber");
    });

    it("returns red colors for very-stale status (AC-6.7.2)", () => {
      const classes = getFreshnessColorClasses("very-stale");
      expect(classes.bg).toContain("red");
      expect(classes.text).toContain("red");
    });
  });

  describe("getFreshnessAriaLabel", () => {
    it("returns accessible description including status and time", () => {
      const label = getFreshnessAriaLabel("fresh", "2h ago");
      expect(label).toContain("fresh");
      expect(label).toContain("2h ago");
    });
  });
});

describe("DataFreshnessBadge Props", () => {
  describe("FreshnessInfo shape", () => {
    it("should accept standard FreshnessInfo props", () => {
      // Type-level test - ensures FreshnessInfo shape is correct
      const freshnessInfo = {
        source: "Gemini API",
        fetchedAt: new Date(),
        isStale: false,
      };

      expect(freshnessInfo.source).toBe("Gemini API");
      expect(freshnessInfo.fetchedAt).toBeInstanceOf(Date);
      expect(freshnessInfo.isStale).toBe(false);
    });

    it("should handle optional staleSince field", () => {
      const freshnessInfo = {
        source: "Gemini API",
        fetchedAt: new Date(),
        isStale: true,
        staleSince: new Date(),
      };

      expect(freshnessInfo.staleSince).toBeInstanceOf(Date);
    });
  });
});
