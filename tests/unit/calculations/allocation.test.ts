/**
 * Allocation Calculation Tests
 *
 * Story 3.7: Allocation Percentage View
 * Tests for allocation gauge status calculations.
 *
 * Test Coverage:
 * - Status calculation logic
 * - Near-boundary detection
 * - Decimal precision
 */

import { describe, it, expect } from "vitest";
import { calculateAllocationStatus, isNearBoundary } from "@/components/fintech/allocation-gauge";

describe("Allocation Gauge Calculations", () => {
  describe("calculateAllocationStatus", () => {
    describe("no-target status", () => {
      it("should return no-target when both targets are null", () => {
        expect(calculateAllocationStatus("50", null, null)).toBe("no-target");
      });

      it("should return no-target when targetMin is null", () => {
        expect(calculateAllocationStatus("50", null, "60")).toBe("no-target");
      });

      it("should return no-target when targetMax is null", () => {
        expect(calculateAllocationStatus("50", "40", null)).toBe("no-target");
      });
    });

    describe("under status", () => {
      it("should return under when current is below targetMin", () => {
        expect(calculateAllocationStatus("35", "40", "60")).toBe("under");
      });

      it("should return under when current is just below targetMin", () => {
        expect(calculateAllocationStatus("39.9", "40", "60")).toBe("under");
      });

      it("should return under with very precise decimal", () => {
        expect(calculateAllocationStatus("39.9999", "40", "60")).toBe("under");
      });
    });

    describe("on-target status", () => {
      it("should return on-target when current equals targetMin", () => {
        expect(calculateAllocationStatus("40", "40", "60")).toBe("on-target");
      });

      it("should return on-target when current is in middle of range", () => {
        expect(calculateAllocationStatus("50", "40", "60")).toBe("on-target");
      });

      it("should return on-target when current equals targetMax", () => {
        expect(calculateAllocationStatus("60", "40", "60")).toBe("on-target");
      });

      it("should return on-target for precise boundary values", () => {
        expect(calculateAllocationStatus("40.0000", "40", "60")).toBe("on-target");
        expect(calculateAllocationStatus("60.0000", "40", "60")).toBe("on-target");
      });
    });

    describe("over status", () => {
      it("should return over when current is above targetMax", () => {
        expect(calculateAllocationStatus("65", "40", "60")).toBe("over");
      });

      it("should return over when current is just above targetMax", () => {
        expect(calculateAllocationStatus("60.1", "40", "60")).toBe("over");
      });

      it("should return over with very precise decimal", () => {
        expect(calculateAllocationStatus("60.0001", "40", "60")).toBe("over");
      });
    });

    describe("edge cases", () => {
      it("should handle zero current value", () => {
        expect(calculateAllocationStatus("0", "10", "20")).toBe("under");
      });

      it("should handle 100% allocation", () => {
        expect(calculateAllocationStatus("100", "90", "100")).toBe("on-target");
      });

      it("should handle very small ranges", () => {
        expect(calculateAllocationStatus("5.5", "5", "6")).toBe("on-target");
        expect(calculateAllocationStatus("4.9", "5", "6")).toBe("under");
        expect(calculateAllocationStatus("6.1", "5", "6")).toBe("over");
      });

      it("should handle invalid input gracefully", () => {
        expect(calculateAllocationStatus("invalid", "40", "60")).toBe("no-target");
      });
    });
  });

  describe("isNearBoundary", () => {
    describe("near minimum boundary", () => {
      it("should return true when exactly at min boundary", () => {
        expect(isNearBoundary("40", "40", "60", "5")).toBe(true);
      });

      it("should return true when within threshold of min", () => {
        expect(isNearBoundary("42", "40", "60", "5")).toBe(true);
        expect(isNearBoundary("44", "40", "60", "5")).toBe(true);
        expect(isNearBoundary("45", "40", "60", "5")).toBe(true);
      });

      it("should return false when beyond threshold of min", () => {
        expect(isNearBoundary("46", "40", "60", "5")).toBe(false);
        expect(isNearBoundary("50", "40", "60", "5")).toBe(false);
      });
    });

    describe("near maximum boundary", () => {
      it("should return true when exactly at max boundary", () => {
        expect(isNearBoundary("60", "40", "60", "5")).toBe(true);
      });

      it("should return true when within threshold of max", () => {
        expect(isNearBoundary("58", "40", "60", "5")).toBe(true);
        expect(isNearBoundary("56", "40", "60", "5")).toBe(true);
        expect(isNearBoundary("55", "40", "60", "5")).toBe(true);
      });

      it("should return false when beyond threshold of max", () => {
        expect(isNearBoundary("54", "40", "60", "5")).toBe(false);
        expect(isNearBoundary("50", "40", "60", "5")).toBe(false);
      });
    });

    describe("middle of range", () => {
      it("should return false when in middle of range", () => {
        expect(isNearBoundary("50", "40", "60", "5")).toBe(false);
        expect(isNearBoundary("48", "40", "60", "5")).toBe(false);
        expect(isNearBoundary("52", "40", "60", "5")).toBe(false);
      });
    });

    describe("custom threshold", () => {
      it("should respect custom threshold", () => {
        // With 10% threshold
        expect(isNearBoundary("48", "40", "60", "10")).toBe(true);
        expect(isNearBoundary("52", "40", "60", "10")).toBe(true);

        // With 2% threshold
        expect(isNearBoundary("42", "40", "60", "2")).toBe(true);
        expect(isNearBoundary("43", "40", "60", "2")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle very small thresholds", () => {
        expect(isNearBoundary("40.5", "40", "60", "1")).toBe(true);
        expect(isNearBoundary("41.5", "40", "60", "1")).toBe(false);
      });

      it("should handle invalid input gracefully", () => {
        expect(isNearBoundary("invalid", "40", "60", "5")).toBe(false);
      });

      it("should handle ranges where values outside range", () => {
        // Below min
        expect(isNearBoundary("35", "40", "60", "5")).toBe(true); // Within 5 of 40

        // Above max
        expect(isNearBoundary("64", "40", "60", "5")).toBe(true); // Within 5 of 60
      });
    });
  });
});
