/**
 * Freshness Types and Utilities Tests
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.2: Colors Based on Data Age
 */

import { describe, it, expect } from "vitest";
import {
  getFreshnessStatus,
  formatRelativeTime,
  formatExactTime,
  getFreshnessColorClasses,
  getFreshnessAriaLabel,
  FRESHNESS_THRESHOLDS,
} from "@/lib/types/freshness";

describe("getFreshnessStatus", () => {
  const now = new Date("2025-12-11T12:00:00Z");

  it("should return 'fresh' for data less than 24 hours old", () => {
    // 1 hour ago
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    expect(getFreshnessStatus(oneHourAgo, now)).toBe("fresh");

    // 23 hours ago
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    expect(getFreshnessStatus(twentyThreeHoursAgo, now)).toBe("fresh");
  });

  it("should return 'stale' for data 1-3 days old (AC-6.7.2)", () => {
    // 25 hours ago
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(getFreshnessStatus(twentyFiveHoursAgo, now)).toBe("stale");

    // 2 days ago
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(getFreshnessStatus(twoDaysAgo, now)).toBe("stale");
  });

  it("should return 'very-stale' for data more than 3 days old (AC-6.7.2)", () => {
    // 4 days ago
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    expect(getFreshnessStatus(fourDaysAgo, now)).toBe("very-stale");

    // 1 week ago
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(getFreshnessStatus(oneWeekAgo, now)).toBe("very-stale");
  });

  it("should handle boundary conditions exactly (AC-6.7.2)", () => {
    // Exactly 24 hours - should be stale (>=24h is stale)
    const exactly24Hours = new Date(now.getTime() - FRESHNESS_THRESHOLDS.FRESH_MS);
    expect(getFreshnessStatus(exactly24Hours, now)).toBe("stale");

    // Exactly 72 hours (3 days) - should be very-stale (>=72h is very-stale)
    const exactly72Hours = new Date(now.getTime() - FRESHNESS_THRESHOLDS.STALE_MS);
    expect(getFreshnessStatus(exactly72Hours, now)).toBe("very-stale");

    // Just under 24 hours - should be fresh
    const justUnder24Hours = new Date(now.getTime() - FRESHNESS_THRESHOLDS.FRESH_MS + 1);
    expect(getFreshnessStatus(justUnder24Hours, now)).toBe("fresh");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2025-12-11T12:00:00Z");

  it("should format seconds ago as 'just now'", () => {
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    expect(formatRelativeTime(thirtySecondsAgo, now)).toBe("just now");
  });

  it("should format minutes ago correctly (AC-6.7.1)", () => {
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    expect(formatRelativeTime(oneMinuteAgo, now)).toBe("1m ago");

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo, now)).toBe("5m ago");
  });

  it("should format hours ago correctly (AC-6.7.1)", () => {
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    expect(formatRelativeTime(oneHourAgo, now)).toBe("1h ago");

    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo, now)).toBe("2h ago");
  });

  it("should format days ago correctly (AC-6.7.1)", () => {
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(oneDayAgo, now)).toBe("1 day ago");

    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo, now)).toBe("3 days ago");
  });

  it("should handle future dates gracefully", () => {
    const futureDate = new Date(now.getTime() + 1000);
    expect(formatRelativeTime(futureDate, now)).toBe("just now");
  });
});

describe("formatExactTime", () => {
  it("should format date in expected format (AC-6.7.3)", () => {
    const date = new Date("2025-12-10T03:00:00Z");
    const formatted = formatExactTime(date);

    // Should contain month, day, year, and time
    expect(formatted).toContain("Dec");
    expect(formatted).toContain("10");
    expect(formatted).toContain("2025");
  });

  it("should include AM/PM in time format (AC-6.7.3)", () => {
    const morningDate = new Date("2025-12-10T09:30:00Z");
    const formatted = formatExactTime(morningDate);

    // Should contain AM or PM
    expect(formatted).toMatch(/AM|PM/);
  });
});

describe("getFreshnessColorClasses", () => {
  it("should return green classes for fresh status (AC-6.7.2)", () => {
    const classes = getFreshnessColorClasses("fresh");

    expect(classes.bg).toContain("green");
    expect(classes.text).toContain("green");
    expect(classes.border).toContain("green");
    expect(classes.icon).toContain("green");
  });

  it("should return amber classes for stale status (AC-6.7.2)", () => {
    const classes = getFreshnessColorClasses("stale");

    expect(classes.bg).toContain("amber");
    expect(classes.text).toContain("amber");
    expect(classes.border).toContain("amber");
    expect(classes.icon).toContain("amber");
  });

  it("should return red classes for very-stale status (AC-6.7.2)", () => {
    const classes = getFreshnessColorClasses("very-stale");

    expect(classes.bg).toContain("red");
    expect(classes.text).toContain("red");
    expect(classes.border).toContain("red");
    expect(classes.icon).toContain("red");
  });
});

describe("getFreshnessAriaLabel", () => {
  it("should return accessible description for fresh status", () => {
    const label = getFreshnessAriaLabel("fresh", "2h ago");
    expect(label).toContain("fresh");
    expect(label).toContain("2h ago");
  });

  it("should return accessible description for stale status", () => {
    const label = getFreshnessAriaLabel("stale", "2 days ago");
    expect(label).toContain("stale");
    expect(label).toContain("2 days ago");
  });

  it("should return accessible description for very-stale status", () => {
    const label = getFreshnessAriaLabel("very-stale", "5 days ago");
    expect(label).toContain("very stale");
    expect(label).toContain("5 days ago");
  });
});

describe("FRESHNESS_THRESHOLDS", () => {
  it("should have correct threshold values", () => {
    // 24 hours in milliseconds
    expect(FRESHNESS_THRESHOLDS.FRESH_MS).toBe(24 * 60 * 60 * 1000);

    // 72 hours (3 days) in milliseconds
    expect(FRESHNESS_THRESHOLDS.STALE_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });
});
