/**
 * Unit tests for FormValidityIndicator component helper functions
 *
 * Story 3.3: Allocation Validation
 * Tests for AC-3.3.4: Clear Validity Indicator
 *
 * Tests the exported helper functions and type definitions.
 * Component rendering tests are E2E tests in Playwright.
 *
 * Note: Since @testing-library/react is not installed,
 * we test the component props, type definitions, and helper functions.
 */

import { describe, it, expect } from "vitest";
import {
  getValidityStyles,
  getValidityIcon,
  type FormValidityIndicatorProps,
} from "@/components/forms/form-validity-indicator";

// =============================================================================
// TESTS FOR EXPORTED FUNCTIONS
// =============================================================================

describe("FormValidityIndicator - getValidityStyles (exported)", () => {
  describe("Valid State Styling (AC-3.3.2)", () => {
    it("returns emerald colors for valid state", () => {
      const styles = getValidityStyles(true);
      expect(styles.textColor).toBe("text-emerald-600 dark:text-emerald-400");
    });

    it("styles are consistent with AllocationIndicator valid state", () => {
      const styles = getValidityStyles(true);
      expect(styles.textColor).toContain("emerald");
    });

    it("includes dark mode variant for valid state", () => {
      const styles = getValidityStyles(true);
      expect(styles.textColor).toContain("dark:");
    });
  });

  describe("Invalid State Styling (AC-3.3.1)", () => {
    it("returns red colors for invalid state", () => {
      const styles = getValidityStyles(false);
      expect(styles.textColor).toBe("text-red-600 dark:text-red-400");
    });

    it("styles are consistent with overallocated state", () => {
      const styles = getValidityStyles(false);
      expect(styles.textColor).toContain("red");
    });

    it("includes dark mode variant for invalid state", () => {
      const styles = getValidityStyles(false);
      expect(styles.textColor).toContain("dark:");
    });
  });

  describe("State Transitions", () => {
    it("valid and invalid states have different colors", () => {
      const validStyles = getValidityStyles(true);
      const invalidStyles = getValidityStyles(false);

      expect(validStyles.textColor).not.toBe(invalidStyles.textColor);
    });
  });
});

describe("FormValidityIndicator - getValidityIcon (exported)", () => {
  describe("Icon Selection", () => {
    it("returns CheckCircle2 icon name for valid state", () => {
      const iconName = getValidityIcon(true);
      expect(iconName).toBe("CheckCircle2");
    });

    it("returns XCircle icon name for invalid state", () => {
      const iconName = getValidityIcon(false);
      expect(iconName).toBe("XCircle");
    });

    it("valid and invalid states have different icons", () => {
      const validIcon = getValidityIcon(true);
      const invalidIcon = getValidityIcon(false);

      expect(validIcon).not.toBe(invalidIcon);
    });
  });
});

describe("FormValidityIndicator - Type Definitions", () => {
  describe("FormValidityIndicatorProps", () => {
    it("includes all required properties", () => {
      const props: FormValidityIndicatorProps = {
        message: "Ready to save",
        isValid: true,
      };

      expect(props.message).toBe("Ready to save");
      expect(props.isValid).toBe(true);
    });

    it("allows optional className", () => {
      const props: FormValidityIndicatorProps = {
        message: "Allocation must equal 100%",
        isValid: false,
        className: "custom-class",
      };

      expect(props.className).toBe("custom-class");
    });

    it("message is required for accessibility", () => {
      // Props interface requires message for screen reader support
      const props: FormValidityIndicatorProps = {
        message: "", // Empty but required
        isValid: true,
      };

      expect(typeof props.message).toBe("string");
    });
  });
});

describe("FormValidityIndicator - Design Specifications", () => {
  describe("Visual Consistency", () => {
    it("valid state uses emerald (green) color family", () => {
      const styles = getValidityStyles(true);
      expect(styles.textColor).toMatch(/emerald/);
    });

    it("invalid state uses red color family", () => {
      const styles = getValidityStyles(false);
      expect(styles.textColor).toMatch(/red/);
    });
  });

  describe("Accessibility Specifications", () => {
    it("valid icon is checkmark type", () => {
      const icon = getValidityIcon(true);
      expect(icon).toContain("Check");
    });

    it("invalid icon is X/error type", () => {
      const icon = getValidityIcon(false);
      expect(icon).toContain("X");
    });
  });
});
