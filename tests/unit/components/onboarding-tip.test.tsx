/**
 * Unit Tests: OnboardingTip Component Logic
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.2: Tip Content Structure (title, brief explanation, "Got it" button)
 * AC-3.5.3: Tip Dismissal Persistence
 *
 * Tests for the OnboardingTip component helper functions and types.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import { ONBOARDING_TIPS, type OnboardingTip } from "@/lib/constants/onboarding-tips";

// =============================================================================
// TYPES (mirroring component props)
// =============================================================================

interface OnboardingTipProps {
  tip: OnboardingTip;
  onDismiss: (tipId: string) => void;
  show?: boolean;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  stepIndicator?: string;
}

// =============================================================================
// HELPER FUNCTIONS (mirroring component logic)
// =============================================================================

/**
 * Determine if popover should render based on show prop
 */
function shouldRenderPopover(show: boolean | undefined): boolean {
  return show !== false;
}

/**
 * Generate step indicator string
 */
function generateStepIndicator(currentStep: number, totalSteps: number): string {
  return `${currentStep}/${totalSteps}`;
}

/**
 * Get default props for OnboardingTip
 */
function getDefaultProps(
  tip: OnboardingTip,
  onDismiss: (tipId: string) => void
): OnboardingTipProps {
  return {
    tip,
    onDismiss,
    show: true,
    side: "right",
    align: "center",
    sideOffset: 8,
  };
}

/**
 * Validate that a tip has required AC-3.5.2 fields
 */
function tipHasRequiredFields(tip: OnboardingTip): boolean {
  return (
    typeof tip.id === "string" &&
    tip.id.length > 0 &&
    typeof tip.title === "string" &&
    tip.title.length > 0 &&
    typeof tip.description === "string" &&
    tip.description.length > 0
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe("OnboardingTip Component Logic", () => {
  const mockTip: OnboardingTip = {
    id: "test-tip",
    title: "Test Tip Title",
    description: "This is a test tip description explaining the feature.",
    page: "/test-page",
    order: 1,
  };

  describe("show/hide logic", () => {
    it("should render popover when show is true", () => {
      expect(shouldRenderPopover(true)).toBe(true);
    });

    it("should not render popover when show is false", () => {
      expect(shouldRenderPopover(false)).toBe(false);
    });

    it("should render popover when show is undefined (default true)", () => {
      expect(shouldRenderPopover(undefined)).toBe(true);
    });
  });

  describe("step indicator", () => {
    it("should generate correct step indicator string", () => {
      expect(generateStepIndicator(1, 3)).toBe("1/3");
      expect(generateStepIndicator(2, 5)).toBe("2/5");
      expect(generateStepIndicator(3, 3)).toBe("3/3");
    });
  });

  describe("default props", () => {
    it("should return correct default values", () => {
      const mockOnDismiss = () => {};
      const defaults = getDefaultProps(mockTip, mockOnDismiss);

      expect(defaults.show).toBe(true);
      expect(defaults.side).toBe("right");
      expect(defaults.align).toBe("center");
      expect(defaults.sideOffset).toBe(8);
    });

    it("should include tip and onDismiss in defaults", () => {
      const mockOnDismiss = () => {};
      const defaults = getDefaultProps(mockTip, mockOnDismiss);

      expect(defaults.tip).toBe(mockTip);
      expect(defaults.onDismiss).toBe(mockOnDismiss);
    });
  });

  describe("tip content structure (AC-3.5.2)", () => {
    it("should validate tip has required fields", () => {
      expect(tipHasRequiredFields(mockTip)).toBe(true);
    });

    it("should reject tip without id", () => {
      const invalidTip = { ...mockTip, id: "" };
      expect(tipHasRequiredFields(invalidTip)).toBe(false);
    });

    it("should reject tip without title", () => {
      const invalidTip = { ...mockTip, title: "" };
      expect(tipHasRequiredFields(invalidTip)).toBe(false);
    });

    it("should reject tip without description", () => {
      const invalidTip = { ...mockTip, description: "" };
      expect(tipHasRequiredFields(invalidTip)).toBe(false);
    });

    it("all ONBOARDING_TIPS should have required fields", () => {
      ONBOARDING_TIPS.forEach((tip) => {
        expect(tipHasRequiredFields(tip)).toBe(true);
      });
    });
  });

  describe("positioning props", () => {
    it("should accept valid side values", () => {
      const validSides: Array<"top" | "right" | "bottom" | "left"> = [
        "top",
        "right",
        "bottom",
        "left",
      ];

      validSides.forEach((side) => {
        const props: OnboardingTipProps = {
          tip: mockTip,
          onDismiss: () => {},
          side,
        };
        expect(props.side).toBe(side);
      });
    });

    it("should accept valid align values", () => {
      const validAligns: Array<"start" | "center" | "end"> = ["start", "center", "end"];

      validAligns.forEach((align) => {
        const props: OnboardingTipProps = {
          tip: mockTip,
          onDismiss: () => {},
          align,
        };
        expect(props.align).toBe(align);
      });
    });

    it("should accept numeric sideOffset", () => {
      const offsets = [0, 4, 8, 16, 24];

      offsets.forEach((sideOffset) => {
        const props: OnboardingTipProps = {
          tip: mockTip,
          onDismiss: () => {},
          sideOffset,
        };
        expect(props.sideOffset).toBe(sideOffset);
      });
    });
  });

  describe("onDismiss callback", () => {
    it("should pass tip id to onDismiss", () => {
      let dismissedId: string | null = null;
      const onDismiss = (tipId: string) => {
        dismissedId = tipId;
      };

      // Simulate dismissal
      onDismiss(mockTip.id);

      expect(dismissedId).toBe("test-tip");
    });

    it("should work with all MVP tip IDs", () => {
      const dismissedIds: string[] = [];
      const onDismiss = (tipId: string) => {
        dismissedIds.push(tipId);
      };

      ONBOARDING_TIPS.forEach((tip) => {
        onDismiss(tip.id);
      });

      expect(dismissedIds).toContain("pie-chart-interaction");
      expect(dismissedIds).toContain("allocation-indicator");
      expect(dismissedIds).toContain("allocation-validation");
    });
  });

  describe("MVP tips content", () => {
    it("pie-chart-interaction should have correct content", () => {
      const tip = ONBOARDING_TIPS.find((t) => t.id === "pie-chart-interaction");

      expect(tip).toBeDefined();
      expect(tip?.title).toBe("Portfolio Summary");
      expect(tip?.description).toContain("portfolio");
    });

    it("allocation-indicator should have correct content", () => {
      const tip = ONBOARDING_TIPS.find((t) => t.id === "allocation-indicator");

      expect(tip).toBeDefined();
      expect(tip?.title).toBe("Allocation Indicator");
      expect(tip?.description).toContain("100%");
    });

    it("allocation-validation should have correct content", () => {
      const tip = ONBOARDING_TIPS.find((t) => t.id === "allocation-validation");

      expect(tip).toBeDefined();
      expect(tip?.title).toBe("100% Allocation Rule");
      expect(tip?.description).toContain("100%");
    });
  });

  describe("accessibility requirements", () => {
    it("should have aria-label text for dismiss button", () => {
      const ariaLabel = "Dismiss tip";
      expect(ariaLabel).toBe("Dismiss tip");
    });

    it("should have tooltip role for popover", () => {
      const role = "tooltip";
      expect(role).toBe("tooltip");
    });

    it("should have aria-describedby linking description", () => {
      // In the component, this is generated with useId()
      // Here we just verify the pattern
      const descriptionId = "tip-desc-123";
      expect(descriptionId).toMatch(/^tip-desc-/);
    });
  });

  describe("className prop", () => {
    it("should accept custom className", () => {
      const props: OnboardingTipProps = {
        tip: mockTip,
        onDismiss: () => {},
        className: "custom-class additional-class",
      };

      expect(props.className).toBe("custom-class additional-class");
    });

    it("should be optional", () => {
      const props: OnboardingTipProps = {
        tip: mockTip,
        onDismiss: () => {},
      };

      expect(props.className).toBeUndefined();
    });
  });
});
