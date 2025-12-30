/**
 * Unit Tests: Onboarding Validation Schemas
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.3: Tip Dismissal Persistence
 *
 * Tests for onboarding validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  VALID_TIP_IDS,
  dismissTipRequestSchema,
  dismissedTipsArraySchema,
  onboardingPreferencesSchema,
  isValidTipId,
  strictTipIdSchema,
} from "@/lib/validations/onboarding";

describe("VALID_TIP_IDS", () => {
  it("should contain expected tip IDs", () => {
    expect(VALID_TIP_IDS).toContain("pie-chart-interaction");
    expect(VALID_TIP_IDS).toContain("allocation-indicator");
    expect(VALID_TIP_IDS).toContain("allocation-validation");
  });

  it("should be a readonly array", () => {
    // TypeScript ensures this at compile time, but we can verify the array is not empty
    expect(VALID_TIP_IDS.length).toBeGreaterThan(0);
  });
});

describe("isValidTipId", () => {
  it("should return true for valid tip IDs", () => {
    expect(isValidTipId("pie-chart-interaction")).toBe(true);
    expect(isValidTipId("allocation-indicator")).toBe(true);
    expect(isValidTipId("allocation-validation")).toBe(true);
  });

  it("should return false for invalid tip IDs", () => {
    expect(isValidTipId("invalid-tip")).toBe(false);
    expect(isValidTipId("")).toBe(false);
    expect(isValidTipId("random-string")).toBe(false);
  });
});

describe("dismissTipRequestSchema", () => {
  it("should accept valid tip ID", () => {
    const result = dismissTipRequestSchema.safeParse({ tipId: "pie-chart-interaction" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipId).toBe("pie-chart-interaction");
    }
  });

  it("should reject empty tip ID", () => {
    const result = dismissTipRequestSchema.safeParse({ tipId: "" });
    expect(result.success).toBe(false);
  });

  it("should reject missing tip ID", () => {
    const result = dismissTipRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject non-string tip ID", () => {
    const result = dismissTipRequestSchema.safeParse({ tipId: 123 });
    expect(result.success).toBe(false);
  });
});

describe("dismissedTipsArraySchema", () => {
  it("should accept empty array", () => {
    const result = dismissedTipsArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("should accept array of strings", () => {
    const tips = ["pie-chart-interaction", "allocation-indicator"];
    const result = dismissedTipsArraySchema.safeParse(tips);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(tips);
    }
  });

  it("should default to empty array when undefined", () => {
    const result = dismissedTipsArraySchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("should reject non-array values", () => {
    const result = dismissedTipsArraySchema.safeParse("not-an-array");
    expect(result.success).toBe(false);
  });
});

describe("onboardingPreferencesSchema", () => {
  it("should accept valid preferences", () => {
    const prefs = {
      tipsDismissed: ["pie-chart-interaction"],
      completedAt: "2024-01-01T00:00:00Z",
    };
    const result = onboardingPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(true);
  });

  it("should accept null completedAt", () => {
    const prefs = {
      tipsDismissed: [],
      completedAt: null,
    };
    const result = onboardingPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(true);
  });

  it("should default tipsDismissed to empty array", () => {
    const prefs = {
      completedAt: null,
    };
    const result = onboardingPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipsDismissed).toEqual([]);
    }
  });

  it("should reject invalid datetime format", () => {
    const prefs = {
      tipsDismissed: [],
      completedAt: "not-a-date",
    };
    const result = onboardingPreferencesSchema.safeParse(prefs);
    expect(result.success).toBe(false);
  });
});

describe("strictTipIdSchema", () => {
  it("should accept valid tip IDs", () => {
    VALID_TIP_IDS.forEach((tipId) => {
      const result = strictTipIdSchema.safeParse(tipId);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid tip IDs", () => {
    const result = strictTipIdSchema.safeParse("invalid-tip");
    expect(result.success).toBe(false);
  });
});
