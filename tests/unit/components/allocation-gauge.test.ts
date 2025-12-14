/**
 * AllocationGauge Component Tests
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * AC-7.5.2: RecommendationCard Display - AllocationGauge
 *
 * Tests the getAllocationStatus utility function.
 * Note: Since @testing-library/react is not installed,
 * we test the exported utility functions and validation logic.
 * Component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import { getAllocationStatus } from "@/components/recommendations/allocation-gauge";

describe("AllocationGauge Utilities", () => {
  describe("getAllocationStatus", () => {
    describe("within target range", () => {
      it("returns 'within' when current is within target range", () => {
        expect(getAllocationStatus(25, 20, 30)).toBe("within");
      });

      it("returns 'within' at min boundary", () => {
        expect(getAllocationStatus(20, 20, 30)).toBe("within");
      });

      it("returns 'within' at max boundary", () => {
        expect(getAllocationStatus(30, 20, 30)).toBe("within");
      });

      it("returns 'within' at exact midpoint", () => {
        expect(getAllocationStatus(25, 20, 30)).toBe("within");
      });
    });

    describe("near target range (within 5% of boundary)", () => {
      it("returns 'near' when 2% below min", () => {
        expect(getAllocationStatus(18, 20, 30)).toBe("near");
      });

      it("returns 'near' when 3% above max", () => {
        expect(getAllocationStatus(33, 20, 30)).toBe("near");
      });

      it("returns 'near' when exactly 5% below min", () => {
        expect(getAllocationStatus(15, 20, 30)).toBe("near");
      });

      it("returns 'near' when exactly 5% above max", () => {
        expect(getAllocationStatus(35, 20, 30)).toBe("near");
      });
    });

    describe("outside target range (more than 5% from boundary)", () => {
      it("returns 'outside' when 10% below min", () => {
        expect(getAllocationStatus(10, 20, 30)).toBe("outside");
      });

      it("returns 'outside' when 10% above max", () => {
        expect(getAllocationStatus(40, 20, 30)).toBe("outside");
      });

      it("returns 'outside' for zero allocation", () => {
        expect(getAllocationStatus(0, 20, 30)).toBe("outside");
      });

      it("returns 'outside' for 100% allocation when target is low", () => {
        expect(getAllocationStatus(100, 20, 30)).toBe("outside");
      });
    });

    describe("edge cases", () => {
      it("handles narrow target range", () => {
        expect(getAllocationStatus(25, 24, 26)).toBe("within");
        expect(getAllocationStatus(30, 24, 26)).toBe("near"); // 4% above max
        expect(getAllocationStatus(35, 24, 26)).toBe("outside"); // 9% above max
      });

      it("handles wide target range", () => {
        expect(getAllocationStatus(50, 0, 100)).toBe("within");
        expect(getAllocationStatus(0, 0, 100)).toBe("within");
        expect(getAllocationStatus(100, 0, 100)).toBe("within");
      });

      it("handles same min and max (single point target)", () => {
        expect(getAllocationStatus(25, 25, 25)).toBe("within");
        expect(getAllocationStatus(28, 25, 25)).toBe("near"); // 3% above
        expect(getAllocationStatus(32, 25, 25)).toBe("outside"); // 7% above
      });
    });
  });
});

describe("AllocationGauge Status to Color Mapping", () => {
  // Verify status values for display purposes

  const testCases = [
    // Within range (green)
    { current: 25, targetMin: 20, targetMax: 30, expected: "within" },
    { current: 20, targetMin: 20, targetMax: 30, expected: "within" },
    { current: 30, targetMin: 20, targetMax: 30, expected: "within" },

    // Near range (amber)
    { current: 18, targetMin: 20, targetMax: 30, expected: "near" },
    { current: 33, targetMin: 20, targetMax: 30, expected: "near" },

    // Outside range (red)
    { current: 10, targetMin: 20, targetMax: 30, expected: "outside" },
    { current: 50, targetMin: 20, targetMax: 30, expected: "outside" },
  ];

  it.each(testCases)(
    "current=$current in range [$targetMin, $targetMax] returns '$expected'",
    ({ current, targetMin, targetMax, expected }) => {
      expect(getAllocationStatus(current, targetMin, targetMax)).toBe(expected);
    }
  );
});
