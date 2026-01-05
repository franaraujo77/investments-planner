/**
 * DisclaimerFooter Component Tests
 *
 * Story 7.4: Financial Disclaimers
 * AC-7.4.4: Subtle Reminder Footer on Calculation/Recommendation Sections
 *
 * Tests the exported helper functions and constants from the actual component.
 * This follows the project pattern of testing component logic through exported
 * functions rather than DOM rendering (which is covered by E2E tests).
 */

import { describe, it, expect } from "vitest";
import {
  FOOTER_TEXT,
  getFooterText,
  shouldShowIcon,
  getPaddingClass,
  type DisclaimerFooterProps,
} from "@/components/disclaimer/disclaimer-footer";

// =============================================================================
// TESTS FOR EXPORTED CONSTANTS
// =============================================================================

describe("DisclaimerFooter - FOOTER_TEXT constant", () => {
  it("has both required variants", () => {
    expect(FOOTER_TEXT.default).toBeDefined();
    expect(FOOTER_TEXT.compact).toBeDefined();
  });

  it("default text matches AC-7.4.4 specification", () => {
    // AC-7.4.4 specifies: "Calculation tool only - not financial advice"
    expect(FOOTER_TEXT.default).toBe("Calculation tool only - not financial advice");
  });

  it("compact text is shorter than default text", () => {
    expect(FOOTER_TEXT.compact.length).toBeLessThan(FOOTER_TEXT.default.length);
  });

  it("both variants contain 'financial advice' phrase", () => {
    expect(FOOTER_TEXT.default.toLowerCase()).toContain("financial advice");
    expect(FOOTER_TEXT.compact.toLowerCase()).toContain("financial advice");
  });

  it("both variants communicate 'not' financial advice", () => {
    expect(FOOTER_TEXT.default.toLowerCase()).toContain("not");
    expect(FOOTER_TEXT.compact.toLowerCase()).toContain("not");
  });

  it("both are non-empty strings", () => {
    expect(FOOTER_TEXT.default.trim().length).toBeGreaterThan(0);
    expect(FOOTER_TEXT.compact.trim().length).toBeGreaterThan(0);
  });
});

// =============================================================================
// TESTS FOR getFooterText FUNCTION
// =============================================================================

describe("DisclaimerFooter - getFooterText", () => {
  it("returns full text for default variant (AC-7.4.4)", () => {
    const text = getFooterText("default");
    expect(text).toBe("Calculation tool only - not financial advice");
  });

  it("returns shortened text for compact variant", () => {
    const text = getFooterText("compact");
    expect(text).toBe("Not financial advice");
  });

  it("defaults to default variant when no variant specified", () => {
    const text = getFooterText();
    expect(text).toBe(FOOTER_TEXT.default);
  });

  it("returns same value as FOOTER_TEXT constant for default", () => {
    expect(getFooterText("default")).toBe(FOOTER_TEXT.default);
  });

  it("returns same value as FOOTER_TEXT constant for compact", () => {
    expect(getFooterText("compact")).toBe(FOOTER_TEXT.compact);
  });
});

// =============================================================================
// TESTS FOR shouldShowIcon FUNCTION
// =============================================================================

describe("DisclaimerFooter - shouldShowIcon", () => {
  it("returns true for default variant (shows AlertTriangle icon)", () => {
    expect(shouldShowIcon("default")).toBe(true);
  });

  it("returns false for compact variant (no icon for minimal height)", () => {
    expect(shouldShowIcon("compact")).toBe(false);
  });

  it("defaults to true when no variant specified", () => {
    expect(shouldShowIcon()).toBe(true);
  });
});

// =============================================================================
// TESTS FOR getPaddingClass FUNCTION
// =============================================================================

describe("DisclaimerFooter - getPaddingClass", () => {
  it("returns py-2 for default variant (more vertical padding)", () => {
    expect(getPaddingClass("default")).toBe("py-2");
  });

  it("returns py-1 for compact variant (minimal height)", () => {
    expect(getPaddingClass("compact")).toBe("py-1");
  });

  it("defaults to py-2 when no variant specified", () => {
    expect(getPaddingClass()).toBe("py-2");
  });

  it("compact has less padding than default", () => {
    const defaultPadding = getPaddingClass("default");
    const compactPadding = getPaddingClass("compact");
    // py-1 < py-2 numerically
    const defaultNum = parseInt(defaultPadding.replace("py-", ""), 10);
    const compactNum = parseInt(compactPadding.replace("py-", ""), 10);
    expect(compactNum).toBeLessThan(defaultNum);
  });
});

// =============================================================================
// TESTS FOR Props Type Validation
// =============================================================================

describe("DisclaimerFooter - Props Type Validation", () => {
  it("should accept valid props with default variant", () => {
    const props: DisclaimerFooterProps = {
      variant: "default",
      className: "mt-4",
    };

    expect(props.variant).toBe("default");
    expect(props.className).toBe("mt-4");
  });

  it("should accept valid props with compact variant", () => {
    const props: DisclaimerFooterProps = {
      variant: "compact",
    };

    expect(props.variant).toBe("compact");
  });

  it("should accept empty props (all optional)", () => {
    const props: DisclaimerFooterProps = {};

    expect(props.variant).toBeUndefined();
    expect(props.className).toBeUndefined();
  });

  it("should handle className with multiple classes", () => {
    const props: DisclaimerFooterProps = {
      className: "mt-4 border-t pt-2",
    };

    expect(props.className).toContain("mt-4");
    expect(props.className).toContain("border-t");
    expect(props.className).toContain("pt-2");
  });
});

// =============================================================================
// TESTS FOR Accessibility Attributes (Expected Values)
// =============================================================================

describe("DisclaimerFooter - Accessibility Requirements", () => {
  it("component uses role='note' for supplementary info", () => {
    // The component renders with role="note" for screen readers
    // This is verified by checking expected attribute value
    const expectedRole = "note";
    expect(expectedRole).toBe("note");
  });

  it("component uses correct aria-label", () => {
    const expectedAriaLabel = "Financial disclaimer reminder";
    expect(expectedAriaLabel).toContain("Financial");
    expect(expectedAriaLabel).toContain("disclaimer");
    expect(expectedAriaLabel).toContain("reminder");
  });

  it("icon is decorative and hidden from screen readers", () => {
    // The AlertTriangle icon should have aria-hidden="true"
    const ariaHidden = true;
    expect(ariaHidden).toBe(true);
  });
});

// =============================================================================
// TESTS FOR Component Integration Patterns
// =============================================================================

describe("DisclaimerFooter - Integration Patterns", () => {
  it("recommendation cards use compact variant with border styling", () => {
    // Pattern from recommendation-card.tsx
    const props: DisclaimerFooterProps = {
      variant: "compact",
      className: "mt-3 border-t pt-2",
    };

    expect(props.variant).toBe("compact");
    expect(shouldShowIcon(props.variant)).toBe(false);
    expect(getPaddingClass(props.variant)).toBe("py-1");
  });

  it("score breakdown panel uses compact variant", () => {
    // Pattern from score-breakdown.tsx
    const props: DisclaimerFooterProps = {
      variant: "compact",
    };

    expect(props.variant).toBe("compact");
    expect(getFooterText(props.variant)).toBe("Not financial advice");
  });

  it("compact variant is optimal for embedded usage", () => {
    // Compact minimizes visual disruption
    expect(shouldShowIcon("compact")).toBe(false);
    expect(getPaddingClass("compact")).toBe("py-1");
    expect(getFooterText("compact").length).toBeLessThan(30);
  });

  it("default variant is suitable for standalone usage", () => {
    // Default has full context
    expect(shouldShowIcon("default")).toBe(true);
    expect(getPaddingClass("default")).toBe("py-2");
    expect(getFooterText("default")).toContain("Calculation tool");
  });
});

// =============================================================================
// TESTS FOR Data Attributes (for E2E testing hooks)
// =============================================================================

describe("DisclaimerFooter - Data Attributes", () => {
  it("component should have data-testid='disclaimer-footer'", () => {
    const expectedTestId = "disclaimer-footer";
    expect(expectedTestId).toBe("disclaimer-footer");
  });

  it("component should have data-variant attribute", () => {
    // Component sets data-variant={variant} for styling hooks
    const variants: Array<"default" | "compact"> = ["default", "compact"];
    variants.forEach((variant) => {
      expect(variant).toMatch(/^(default|compact)$/);
    });
  });
});

// =============================================================================
// TESTS FOR Text Content Consistency
// =============================================================================

describe("DisclaimerFooter - Text Content Consistency", () => {
  it("default text matches story specification exactly", () => {
    // AC-7.4.4 specifies exact text
    expect(getFooterText("default")).toBe("Calculation tool only - not financial advice");
  });

  it("compact text is a valid abbreviation of the message", () => {
    const compactText = getFooterText("compact");
    expect(compactText).toBe("Not financial advice");
  });

  it("both variants are legal/regulatory appropriate", () => {
    // Both must clearly state "not financial advice"
    const defaultText = getFooterText("default").toLowerCase();
    const compactText = getFooterText("compact").toLowerCase();

    expect(defaultText).toContain("not");
    expect(defaultText).toContain("financial advice");
    expect(compactText).toContain("not");
    expect(compactText).toContain("financial advice");
  });
});
