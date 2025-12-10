/**
 * UnscoredIndicator Component Tests
 *
 * Story 5.10: View Asset Score
 * AC-5.10.3: Unscored Asset Indicator
 *
 * Tests:
 * - "Not scored" display
 * - Reason codes and messages
 * - Action links for criteria configuration
 * - Default reason behavior
 */

import { describe, it, expect } from "vitest";
import { getDefaultReason, type UnscoredReasonCode } from "@/components/fintech/unscored-indicator";

describe("UnscoredIndicator Utilities", () => {
  describe("getDefaultReason", () => {
    // AC-5.10.3: Indicator explains why

    it("returns correct reason for NO_CRITERIA code", () => {
      const reason = getDefaultReason("NO_CRITERIA");

      expect(reason.code).toBe("NO_CRITERIA");
      expect(reason.message).toContain("criteria");
      expect(reason.message.toLowerCase()).toContain("configured");
      expect(reason.actionHref).toBe("/criteria");
      expect(reason.actionLabel).toBe("Configure criteria");
    });

    it("returns correct reason for MISSING_FUNDAMENTALS code", () => {
      const reason = getDefaultReason("MISSING_FUNDAMENTALS");

      expect(reason.code).toBe("MISSING_FUNDAMENTALS");
      expect(reason.message.toLowerCase()).toContain("data");
      expect(reason.actionLabel).toBe("View details");
      // No actionHref for missing fundamentals - user can't fix it from UI
      expect(reason.actionHref).toBeUndefined();
    });

    it("returns correct reason for NOT_CALCULATED code", () => {
      const reason = getDefaultReason("NOT_CALCULATED");

      expect(reason.code).toBe("NOT_CALCULATED");
      expect(reason.message.toLowerCase()).toContain("pending");
      expect(reason.actionLabel).toBe("Check back later");
      expect(reason.actionHref).toBeUndefined();
    });
  });

  describe("Reason Codes", () => {
    const allCodes: UnscoredReasonCode[] = [
      "NO_CRITERIA",
      "MISSING_FUNDAMENTALS",
      "NOT_CALCULATED",
    ];

    it.each(allCodes)("getDefaultReason returns valid reason for %s", (code) => {
      const reason = getDefaultReason(code);

      // All reasons must have code and message
      expect(reason.code).toBe(code);
      expect(reason.message).toBeDefined();
      expect(reason.message.length).toBeGreaterThan(0);
    });

    it("NO_CRITERIA is the only code with actionHref", () => {
      // AC-5.10.3: Clicking shows option to configure criteria
      const noCriteria = getDefaultReason("NO_CRITERIA");
      const missingFundamentals = getDefaultReason("MISSING_FUNDAMENTALS");
      const notCalculated = getDefaultReason("NOT_CALCULATED");

      expect(noCriteria.actionHref).toBe("/criteria");
      expect(missingFundamentals.actionHref).toBeUndefined();
      expect(notCalculated.actionHref).toBeUndefined();
    });
  });
});

describe("UnscoredIndicator Reason Messages", () => {
  // Verify messages are user-friendly and descriptive

  it("NO_CRITERIA message mentions market/criteria", () => {
    const reason = getDefaultReason("NO_CRITERIA");
    // Message should explain the issue
    expect(reason.message.toLowerCase()).toMatch(/(criteria|market)/);
  });

  it("MISSING_FUNDAMENTALS message mentions data", () => {
    const reason = getDefaultReason("MISSING_FUNDAMENTALS");
    expect(reason.message.toLowerCase()).toContain("data");
  });

  it("NOT_CALCULATED message indicates pending status", () => {
    const reason = getDefaultReason("NOT_CALCULATED");
    expect(reason.message.toLowerCase()).toMatch(/(pending|calculation)/);
  });
});

describe("UnscoredIndicator Action Labels", () => {
  // Verify action labels are actionable and clear

  it("NO_CRITERIA has actionable label", () => {
    const reason = getDefaultReason("NO_CRITERIA");
    expect(reason.actionLabel).toMatch(/configure/i);
  });

  it("MISSING_FUNDAMENTALS has informative label", () => {
    const reason = getDefaultReason("MISSING_FUNDAMENTALS");
    expect(reason.actionLabel).toMatch(/view|details/i);
  });

  it("NOT_CALCULATED has patience-indicating label", () => {
    const reason = getDefaultReason("NOT_CALCULATED");
    expect(reason.actionLabel).toMatch(/check|later/i);
  });
});
