/**
 * Unit Tests: Onboarding Tips Constants
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Contextual Onboarding Tips Display
 *
 * Tests for tip constants, page matching, and tip retrieval functions.
 */

import { describe, it, expect } from "vitest";
import {
  ONBOARDING_TIPS,
  getTipsForPage,
  matchesPage,
  getTipById,
  getAllTipIds,
} from "@/lib/constants/onboarding-tips";

describe("ONBOARDING_TIPS constants", () => {
  it("should have required properties for each tip", () => {
    ONBOARDING_TIPS.forEach((tip) => {
      expect(tip).toHaveProperty("id");
      expect(tip).toHaveProperty("title");
      expect(tip).toHaveProperty("description");
      expect(tip).toHaveProperty("page");
      expect(tip).toHaveProperty("order");
    });
  });

  it("should have unique tip IDs", () => {
    const ids = ONBOARDING_TIPS.map((tip) => tip.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have positive order numbers", () => {
    ONBOARDING_TIPS.forEach((tip) => {
      expect(tip.order).toBeGreaterThan(0);
    });
  });

  it("should include the expected MVP tips", () => {
    const tipIds = getAllTipIds();
    expect(tipIds).toContain("pie-chart-interaction");
    expect(tipIds).toContain("allocation-indicator");
    expect(tipIds).toContain("allocation-validation");
  });
});

describe("matchesPage", () => {
  it("should match exact paths", () => {
    expect(matchesPage("/portfolio", "/portfolio")).toBe(true);
    expect(matchesPage("/settings", "/settings")).toBe(true);
  });

  it("should not match different paths", () => {
    expect(matchesPage("/portfolio", "/settings")).toBe(false);
    expect(matchesPage("/portfolio/list", "/portfolio")).toBe(false);
  });

  it("should match dynamic route segments", () => {
    expect(matchesPage("/portfolio/[portfolioId]", "/portfolio/123")).toBe(true);
    expect(matchesPage("/portfolio/[portfolioId]", "/portfolio/abc-def")).toBe(true);
  });

  it("should match multiple dynamic segments", () => {
    expect(
      matchesPage("/portfolio/[portfolioId]/holdings/[holdingId]", "/portfolio/123/holdings/456")
    ).toBe(true);
  });

  it("should match nested paths with dynamic segments", () => {
    expect(matchesPage("/portfolio/[portfolioId]/edit", "/portfolio/123/edit")).toBe(true);
  });

  it("should not match partial paths", () => {
    expect(matchesPage("/portfolio/[portfolioId]", "/portfolio/123/extra")).toBe(false);
  });
});

describe("getTipsForPage", () => {
  it("should return tips for portfolio detail page", () => {
    const tips = getTipsForPage("/portfolio/123");
    expect(tips.length).toBeGreaterThan(0);
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

  it("should return empty array for pages with no tips", () => {
    const tips = getTipsForPage("/nonexistent-page");
    expect(tips).toEqual([]);
  });
});

describe("getTipById", () => {
  it("should return the correct tip by ID", () => {
    const tip = getTipById("pie-chart-interaction");
    expect(tip).toBeDefined();
    expect(tip?.id).toBe("pie-chart-interaction");
    expect(tip?.title).toBe("Portfolio Summary");
  });

  it("should return undefined for non-existent tip ID", () => {
    const tip = getTipById("non-existent-tip");
    expect(tip).toBeUndefined();
  });
});

describe("getAllTipIds", () => {
  it("should return all tip IDs", () => {
    const ids = getAllTipIds();
    expect(ids).toHaveLength(ONBOARDING_TIPS.length);
    ONBOARDING_TIPS.forEach((tip) => {
      expect(ids).toContain(tip.id);
    });
  });

  it("should return strings only", () => {
    const ids = getAllTipIds();
    ids.forEach((id) => {
      expect(typeof id).toBe("string");
    });
  });
});
