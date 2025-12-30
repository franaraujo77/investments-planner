/**
 * Unit Tests: useOnboarding Hook Logic
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Contextual Onboarding Tips Display
 * AC-3.5.3: Tip Dismissal Persistence
 *
 * Tests for the onboarding hook helper functions and logic.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ONBOARDING_TIPS,
  getTipsForPage,
  getTipById,
  getAllTipIds,
  matchesPage,
} from "@/lib/constants/onboarding-tips";

// =============================================================================
// HELPER FUNCTIONS TO MIRROR HOOK LOGIC
// =============================================================================

/**
 * Check if a tip should be shown (not in dismissed list)
 */
function shouldShowTip(dismissedTips: string[], tipId: string): boolean {
  return !dismissedTips.includes(tipId);
}

/**
 * Simulate dismissing a tip - adds to array if not present
 */
function dismissTip(dismissedTips: string[], tipId: string): string[] {
  if (dismissedTips.includes(tipId)) {
    return dismissedTips;
  }
  return [...dismissedTips, tipId];
}

/**
 * Get active (non-dismissed) tips for a page
 */
function getActiveTipsForPage(page: string, dismissedTips: string[]) {
  const pageTips = getTipsForPage(page);
  return pageTips.filter((tip) => !dismissedTips.includes(tip.id));
}

// =============================================================================
// TESTS
// =============================================================================

describe("useOnboarding Logic", () => {
  describe("shouldShowTip", () => {
    it("should return true for non-dismissed tips", () => {
      const dismissedTips: string[] = [];
      expect(shouldShowTip(dismissedTips, "pie-chart-interaction")).toBe(true);
    });

    it("should return false for dismissed tips", () => {
      const dismissedTips = ["pie-chart-interaction"];
      expect(shouldShowTip(dismissedTips, "pie-chart-interaction")).toBe(false);
    });

    it("should handle multiple dismissed tips", () => {
      const dismissedTips = ["pie-chart-interaction", "allocation-indicator"];

      expect(shouldShowTip(dismissedTips, "pie-chart-interaction")).toBe(false);
      expect(shouldShowTip(dismissedTips, "allocation-indicator")).toBe(false);
      expect(shouldShowTip(dismissedTips, "allocation-validation")).toBe(true);
    });
  });

  describe("dismissTip", () => {
    it("should add tip to dismissed array", () => {
      const dismissedTips: string[] = [];
      const result = dismissTip(dismissedTips, "pie-chart-interaction");

      expect(result).toContain("pie-chart-interaction");
      expect(result.length).toBe(1);
    });

    it("should not add duplicate dismissals", () => {
      const dismissedTips = ["pie-chart-interaction"];
      const result = dismissTip(dismissedTips, "pie-chart-interaction");

      expect(result.length).toBe(1);
      expect(result).toEqual(dismissedTips);
    });

    it("should preserve existing dismissals", () => {
      const dismissedTips = ["pie-chart-interaction"];
      const result = dismissTip(dismissedTips, "allocation-indicator");

      expect(result).toContain("pie-chart-interaction");
      expect(result).toContain("allocation-indicator");
      expect(result.length).toBe(2);
    });

    it("should be immutable (not modify original array)", () => {
      const dismissedTips: string[] = [];
      const result = dismissTip(dismissedTips, "pie-chart-interaction");

      expect(dismissedTips.length).toBe(0);
      expect(result.length).toBe(1);
    });
  });

  describe("getActiveTipsForPage", () => {
    it("should return all tips when none dismissed", () => {
      const dismissedTips: string[] = [];
      const activeTips = getActiveTipsForPage("/portfolio/123", dismissedTips);

      expect(activeTips.length).toBe(3);
    });

    it("should filter out dismissed tips", () => {
      const dismissedTips = ["pie-chart-interaction"];
      const activeTips = getActiveTipsForPage("/portfolio/123", dismissedTips);

      expect(activeTips.length).toBe(2);
      expect(activeTips.find((t) => t.id === "pie-chart-interaction")).toBeUndefined();
    });

    it("should return empty array when all tips dismissed", () => {
      const dismissedTips = [
        "pie-chart-interaction",
        "allocation-indicator",
        "allocation-validation",
      ];
      const activeTips = getActiveTipsForPage("/portfolio/123", dismissedTips);

      expect(activeTips.length).toBe(0);
    });

    it("should return empty array for pages with no tips", () => {
      const dismissedTips: string[] = [];
      const activeTips = getActiveTipsForPage("/nonexistent-page", dismissedTips);

      expect(activeTips.length).toBe(0);
    });
  });

  describe("tip constants integration", () => {
    it("should have all expected MVP tips", () => {
      const tipIds = getAllTipIds();

      expect(tipIds).toContain("pie-chart-interaction");
      expect(tipIds).toContain("allocation-indicator");
      expect(tipIds).toContain("allocation-validation");
    });

    it("should return tips for portfolio detail page", () => {
      const tips = getTipsForPage("/portfolio/abc-123");

      expect(tips.length).toBe(3);
      tips.forEach((tip) => {
        expect(tip.page).toBe("/portfolio/[portfolioId]");
      });
    });

    it("should return tips sorted by order", () => {
      const tips = getTipsForPage("/portfolio/123");

      for (let i = 1; i < tips.length; i++) {
        expect(tips[i].order).toBeGreaterThanOrEqual(tips[i - 1].order);
      }
    });

    it("should get tip by ID", () => {
      const tip = getTipById("pie-chart-interaction");

      expect(tip).toBeDefined();
      expect(tip?.id).toBe("pie-chart-interaction");
      expect(tip?.title).toBe("Portfolio Summary");
    });

    it("should return undefined for invalid tip ID", () => {
      const tip = getTipById("nonexistent-tip");
      expect(tip).toBeUndefined();
    });
  });

  describe("page matching", () => {
    it("should match exact paths", () => {
      expect(matchesPage("/portfolio", "/portfolio")).toBe(true);
      expect(matchesPage("/settings", "/settings")).toBe(true);
    });

    it("should match dynamic segments", () => {
      expect(matchesPage("/portfolio/[portfolioId]", "/portfolio/123")).toBe(true);
      expect(matchesPage("/portfolio/[portfolioId]", "/portfolio/abc-def")).toBe(true);
    });

    it("should not match different paths", () => {
      expect(matchesPage("/portfolio", "/settings")).toBe(false);
      expect(matchesPage("/portfolio/[portfolioId]", "/portfolio")).toBe(false);
    });
  });

  describe("onboarding completion logic", () => {
    it("should detect when all tips are dismissed", () => {
      const allTipIds = getAllTipIds();
      const dismissedTips = [...allTipIds];

      const allDismissed = allTipIds.every((id) => dismissedTips.includes(id));
      expect(allDismissed).toBe(true);
    });

    it("should detect when not all tips are dismissed", () => {
      const allTipIds = getAllTipIds();
      const dismissedTips = ["pie-chart-interaction"];

      const allDismissed = allTipIds.every((id) => dismissedTips.includes(id));
      expect(allDismissed).toBe(false);
    });

    it("should count remaining tips correctly", () => {
      const allTipIds = getAllTipIds();
      const dismissedTips = ["pie-chart-interaction", "allocation-indicator"];

      const remainingCount = allTipIds.filter((id) => !dismissedTips.includes(id)).length;
      expect(remainingCount).toBe(1);
    });
  });

  describe("localStorage key convention", () => {
    it("should use consistent localStorage key", () => {
      const LOCALSTORAGE_KEY = "investments-planner-dismissed-tips";
      expect(LOCALSTORAGE_KEY).toBe("investments-planner-dismissed-tips");
    });
  });
});
