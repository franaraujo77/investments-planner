/**
 * AllocationComparisonView Component Tests
 *
 * Story 7.10: View Updated Allocation
 * AC-7.10.1: Before/After Allocation Comparison
 * AC-7.10.2: Improved Allocations Highlighted
 * AC-7.10.3: Navigate to Portfolio View
 *
 * Tests for the allocation comparison view component logic.
 *
 * Note: Since @testing-library/react is not installed,
 * we test the component props, type definitions, and utility functions.
 * Full component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import {
  parsePercentage,
  calculateDelta,
  isImproved,
  getDirection,
  calculateAllocationDeltas,
  type AllocationComparisonViewProps,
  type AllocationDelta,
} from "@/components/recommendations/allocation-comparison-view";

// =============================================================================
// TEST DATA
// =============================================================================

const mockBefore: Record<string, string> = {
  "Variable Income": "48.5%",
  "Fixed Income": "51.5%",
};

const mockAfter: Record<string, string> = {
  "Variable Income": "52.3%",
  "Fixed Income": "47.7%",
};

const mockTargets: Record<string, { min: string; max: string }> = {
  "Variable Income": { min: "45%", max: "55%" },
  "Fixed Income": { min: "40%", max: "50%" },
};

// =============================================================================
// parsePercentage TESTS
// =============================================================================

describe("parsePercentage", () => {
  it("should parse percentage string with % symbol", () => {
    expect(parsePercentage("48.5%")).toBe(48.5);
  });

  it("should parse percentage string without % symbol", () => {
    expect(parsePercentage("48.5")).toBe(48.5);
  });

  it("should handle integer percentage", () => {
    expect(parsePercentage("50%")).toBe(50);
  });

  it("should handle zero", () => {
    expect(parsePercentage("0%")).toBe(0);
    expect(parsePercentage("0")).toBe(0);
  });

  it("should handle percentage with extra whitespace", () => {
    expect(parsePercentage(" 48.5% ")).toBe(48.5);
  });

  it("should return 0 for invalid input", () => {
    expect(parsePercentage("invalid")).toBe(0);
    expect(parsePercentage("")).toBe(0);
  });
});

// =============================================================================
// calculateDelta TESTS (AC-7.10.1)
// =============================================================================

describe("calculateDelta (AC-7.10.1)", () => {
  it("should calculate positive delta correctly", () => {
    // AC-7.10.1: Delta (change) is calculated for each class
    const result = calculateDelta("48.5%", "52.3%");

    expect(result.value).toBeCloseTo(3.8, 1);
    expect(result.formatted).toBe("+3.8%");
  });

  it("should calculate negative delta correctly", () => {
    const result = calculateDelta("55.0%", "52.0%");

    expect(result.value).toBeCloseTo(-3.0, 1);
    expect(result.formatted).toBe("-3.0%");
  });

  it("should calculate zero delta correctly", () => {
    const result = calculateDelta("50.0%", "50.0%");

    expect(result.value).toBe(0);
    expect(result.formatted).toBe("0.0%");
  });

  it("should handle values without % symbol", () => {
    const result = calculateDelta("48.5", "52.3");

    expect(result.value).toBeCloseTo(3.8, 1);
  });

  it("should format with 1 decimal place", () => {
    const result = calculateDelta("48.55%", "52.33%");

    // 52.33 - 48.55 = 3.78, formatted as 3.8%
    expect(result.formatted).toBe("+3.8%");
  });

  it("should handle large deltas", () => {
    const result = calculateDelta("10%", "90%");

    expect(result.value).toBe(80);
    expect(result.formatted).toBe("+80.0%");
  });
});

// =============================================================================
// isImproved TESTS (AC-7.10.2)
// =============================================================================

describe("isImproved (AC-7.10.2)", () => {
  it("should return true when allocation moves closer to target midpoint", () => {
    // Target: 45-55%, midpoint = 50%
    // Before: 48%, After: 50% -> moved from 2 away to 0 away = improved
    const result = isImproved("48%", "50%", "45%", "55%");

    expect(result).toBe(true);
  });

  it("should return true when under-allocation improves", () => {
    // Target: 45-55%, midpoint = 50%
    // Before: 40%, After: 48% -> moved from 10 away to 2 away = improved
    const result = isImproved("40%", "48%", "45%", "55%");

    expect(result).toBe(true);
  });

  it("should return false when allocation moves away from target", () => {
    // Target: 45-55%, midpoint = 50%
    // Before: 52%, After: 60% -> moved from 2 away to 10 away = worse
    const result = isImproved("52%", "60%", "45%", "55%");

    expect(result).toBe(false);
  });

  it("should return false when over-allocation gets worse", () => {
    // Target: 45-55%, midpoint = 50%
    // Before: 55%, After: 60% -> moved from 5 away to 10 away = worse
    const result = isImproved("55%", "60%", "45%", "55%");

    expect(result).toBe(false);
  });

  it("should return null when targets are not provided", () => {
    const result = isImproved("48%", "52%", undefined, undefined);

    expect(result).toBeNull();
  });

  it("should return null when only min is provided", () => {
    const result = isImproved("48%", "52%", "45%", undefined);

    expect(result).toBeNull();
  });

  it("should return null when only max is provided", () => {
    const result = isImproved("48%", "52%", undefined, "55%");

    expect(result).toBeNull();
  });

  it("should handle equal before and after (no change)", () => {
    const result = isImproved("50%", "50%", "45%", "55%");

    // Same distance, not improved
    expect(result).toBe(false);
  });
});

// =============================================================================
// getDirection TESTS (AC-7.10.2)
// =============================================================================

describe("getDirection (AC-7.10.2)", () => {
  it("should return 'up' for positive delta", () => {
    expect(getDirection(3.8)).toBe("up");
    expect(getDirection(0.1)).toBe("up");
  });

  it("should return 'down' for negative delta", () => {
    expect(getDirection(-3.8)).toBe("down");
    expect(getDirection(-0.1)).toBe("down");
  });

  it("should return 'none' for zero delta", () => {
    expect(getDirection(0)).toBe("none");
  });

  it("should return 'none' for very small positive delta (tolerance)", () => {
    expect(getDirection(0.001)).toBe("none");
    expect(getDirection(0.01)).toBe("none");
  });

  it("should return 'none' for very small negative delta (tolerance)", () => {
    expect(getDirection(-0.001)).toBe("none");
    expect(getDirection(-0.01)).toBe("none");
  });

  it("should return 'up' for delta just above threshold", () => {
    expect(getDirection(0.02)).toBe("up");
  });

  it("should return 'down' for delta just below threshold", () => {
    expect(getDirection(-0.02)).toBe("down");
  });
});

// =============================================================================
// calculateAllocationDeltas TESTS (AC-7.10.1, AC-7.10.2)
// =============================================================================

describe("calculateAllocationDeltas (AC-7.10.1, AC-7.10.2)", () => {
  it("should calculate deltas for all asset classes", () => {
    const deltas = calculateAllocationDeltas(mockBefore, mockAfter);

    expect(deltas).toHaveLength(2);

    const variableIncome = deltas.find((d) => d.className === "Variable Income");
    const fixedIncome = deltas.find((d) => d.className === "Fixed Income");

    expect(variableIncome).toBeDefined();
    expect(fixedIncome).toBeDefined();
  });

  it("should calculate delta values correctly", () => {
    const deltas = calculateAllocationDeltas(mockBefore, mockAfter);

    const variableIncome = deltas.find((d) => d.className === "Variable Income")!;
    const fixedIncome = deltas.find((d) => d.className === "Fixed Income")!;

    // Variable Income: 52.3 - 48.5 = +3.8
    expect(variableIncome.deltaValue).toBeCloseTo(3.8, 1);
    expect(variableIncome.deltaFormatted).toBe("+3.8%");

    // Fixed Income: 47.7 - 51.5 = -3.8
    expect(fixedIncome.deltaValue).toBeCloseTo(-3.8, 1);
    expect(fixedIncome.deltaFormatted).toBe("-3.8%");
  });

  it("should set direction based on delta", () => {
    const deltas = calculateAllocationDeltas(mockBefore, mockAfter);

    const variableIncome = deltas.find((d) => d.className === "Variable Income")!;
    const fixedIncome = deltas.find((d) => d.className === "Fixed Income")!;

    expect(variableIncome.direction).toBe("up");
    expect(fixedIncome.direction).toBe("down");
  });

  it("should set isImproved based on target when targets provided", () => {
    const deltas = calculateAllocationDeltas(mockBefore, mockAfter, mockTargets);

    const variableIncome = deltas.find((d) => d.className === "Variable Income")!;
    const fixedIncome = deltas.find((d) => d.className === "Fixed Income")!;

    // Variable Income: Target midpoint = 50%, before = 48.5 (1.5 away), after = 52.3 (2.3 away)
    // Actually got further from midpoint, so NOT improved
    expect(variableIncome.isImproved).toBe(false);

    // Fixed Income: Target midpoint = 45%, before = 51.5 (6.5 away), after = 47.7 (2.7 away)
    // Got closer to midpoint, so improved
    expect(fixedIncome.isImproved).toBe(true);
  });

  it("should set isImproved to null when no targets provided", () => {
    const deltas = calculateAllocationDeltas(mockBefore, mockAfter);

    for (const delta of deltas) {
      expect(delta.isImproved).toBeNull();
    }
  });

  it("should sort by absolute delta descending", () => {
    const before = {
      A: "50%",
      B: "40%",
      C: "10%",
    };
    const after = {
      A: "51%", // delta = 1
      B: "30%", // delta = -10
      C: "20%", // delta = 10
    };

    const deltas = calculateAllocationDeltas(before, after);

    // Sorted by |delta|: B (10), C (10), A (1)
    expect(Math.abs(deltas[0].deltaValue)).toBeGreaterThanOrEqual(Math.abs(deltas[1].deltaValue));
    expect(Math.abs(deltas[1].deltaValue)).toBeGreaterThanOrEqual(Math.abs(deltas[2].deltaValue));
  });

  it("should handle new asset class appearing in after", () => {
    const before = { Stocks: "100%" };
    const after = { Stocks: "80%", Bonds: "20%" };

    const deltas = calculateAllocationDeltas(before, after);

    expect(deltas).toHaveLength(2);

    const bonds = deltas.find((d) => d.className === "Bonds")!;
    expect(bonds.before).toBe("0.0%");
    expect(bonds.after).toBe("20%");
    expect(bonds.deltaValue).toBe(20);
  });

  it("should handle asset class disappearing in after", () => {
    const before = { Stocks: "80%", Bonds: "20%" };
    const after = { Stocks: "100%" };

    const deltas = calculateAllocationDeltas(before, after);

    expect(deltas).toHaveLength(2);

    const bonds = deltas.find((d) => d.className === "Bonds")!;
    expect(bonds.before).toBe("20%");
    expect(bonds.after).toBe("0.0%");
    expect(bonds.deltaValue).toBe(-20);
  });

  it("should handle empty before/after", () => {
    const deltas = calculateAllocationDeltas({}, {});

    expect(deltas).toHaveLength(0);
  });
});

// =============================================================================
// PROPS INTERFACE TESTS
// =============================================================================

describe("AllocationComparisonViewProps Interface", () => {
  it("should accept required props", () => {
    const props: AllocationComparisonViewProps = {
      before: mockBefore,
      after: mockAfter,
      onNavigateToPortfolio: () => {},
    };

    expect(props.before).toEqual(mockBefore);
    expect(props.after).toEqual(mockAfter);
    expect(typeof props.onNavigateToPortfolio).toBe("function");
  });

  it("should accept optional targets prop", () => {
    const props: AllocationComparisonViewProps = {
      before: mockBefore,
      after: mockAfter,
      targets: mockTargets,
      onNavigateToPortfolio: () => {},
    };

    expect(props.targets).toEqual(mockTargets);
  });

  it("should accept undefined targets", () => {
    const props: AllocationComparisonViewProps = {
      before: mockBefore,
      after: mockAfter,
      targets: undefined,
      onNavigateToPortfolio: () => {},
    };

    expect(props.targets).toBeUndefined();
  });
});

// =============================================================================
// AllocationDelta TYPE TESTS
// =============================================================================

describe("AllocationDelta Type", () => {
  it("should have all required properties", () => {
    const delta: AllocationDelta = {
      className: "Variable Income",
      before: "48.5%",
      after: "52.3%",
      deltaValue: 3.8,
      deltaFormatted: "+3.8%",
      isImproved: true,
      direction: "up",
    };

    expect(delta.className).toBe("Variable Income");
    expect(delta.before).toBe("48.5%");
    expect(delta.after).toBe("52.3%");
    expect(delta.deltaValue).toBe(3.8);
    expect(delta.deltaFormatted).toBe("+3.8%");
    expect(delta.isImproved).toBe(true);
    expect(delta.direction).toBe("up");
  });

  it("should allow isImproved to be null", () => {
    const delta: AllocationDelta = {
      className: "Test",
      before: "50%",
      after: "55%",
      deltaValue: 5,
      deltaFormatted: "+5.0%",
      isImproved: null, // No target available
      direction: "up",
    };

    expect(delta.isImproved).toBeNull();
  });
});

// =============================================================================
// NAVIGATION CALLBACK TESTS (AC-7.10.3)
// =============================================================================

describe("Navigation Callback (AC-7.10.3)", () => {
  it("should call onNavigateToPortfolio when invoked", () => {
    let called = false;
    const onNavigateToPortfolio = () => {
      called = true;
    };

    const props: AllocationComparisonViewProps = {
      before: mockBefore,
      after: mockAfter,
      onNavigateToPortfolio,
    };

    props.onNavigateToPortfolio();

    expect(called).toBe(true);
  });

  it("should be typed as void return", () => {
    const props: AllocationComparisonViewProps = {
      before: mockBefore,
      after: mockAfter,
      onNavigateToPortfolio: () => {
        // Do nothing - void return
      },
    };

    const result = props.onNavigateToPortfolio();
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("should handle 100% single class", () => {
    const before = { Stocks: "100%" };
    const after = { Stocks: "100%" };

    const deltas = calculateAllocationDeltas(before, after);

    expect(deltas).toHaveLength(1);
    expect(deltas[0].deltaValue).toBe(0);
    expect(deltas[0].direction).toBe("none");
  });

  it("should handle very small percentage values", () => {
    const result = calculateDelta("0.1%", "0.3%");

    expect(result.value).toBeCloseTo(0.2, 1);
    expect(result.formatted).toBe("+0.2%");
  });

  it("should handle negative improvement with targets", () => {
    // Moving from over-allocated to closer to target is improvement
    // Target: 40-50%, midpoint = 45%
    // Before: 60% (15 away), After: 50% (5 away) = improved
    const result = isImproved("60%", "50%", "40%", "50%");

    expect(result).toBe(true);
  });

  it("should handle asset class names with special characters", () => {
    const before = { "US Large-Cap": "50%" };
    const after = { "US Large-Cap": "55%" };

    const deltas = calculateAllocationDeltas(before, after);

    expect(deltas[0].className).toBe("US Large-Cap");
  });
});
