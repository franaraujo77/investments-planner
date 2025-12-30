/**
 * Unit tests for useAllocationWarning hook
 *
 * Story 3.3: Allocation Validation
 * Tests for AC-3.3.3: Exit Warning for Incomplete Allocation
 *
 * Tests the hook's logic for managing warning dialog state.
 */

import { describe, it, expect } from "vitest";
import { computeWarningState, type AllocationWarningState } from "@/hooks/useAllocationWarning";

// =============================================================================
// TESTS FOR WARNING STATE COMPUTATION
// =============================================================================

describe("useAllocationWarning - computeWarningState", () => {
  describe("AC-3.3.3: Exit Warning Triggers", () => {
    it("returns shouldWarn=true when isDirty=true and isValid=false", () => {
      const result = computeWarningState({
        isDirty: true,
        isValid: false,
        navigationAttempt: true,
      });

      expect(result.shouldWarn).toBe(true);
    });

    it("returns shouldWarn=false when isDirty=true and isValid=true", () => {
      const result = computeWarningState({
        isDirty: true,
        isValid: true,
        navigationAttempt: true,
      });

      expect(result.shouldWarn).toBe(false);
    });

    it("returns shouldWarn=false when isDirty=false", () => {
      const result = computeWarningState({
        isDirty: false,
        isValid: false,
        navigationAttempt: true,
      });

      expect(result.shouldWarn).toBe(false);
    });

    it("returns shouldWarn=false when no navigation attempt", () => {
      const result = computeWarningState({
        isDirty: true,
        isValid: false,
        navigationAttempt: false,
      });

      expect(result.shouldWarn).toBe(false);
    });
  });

  describe("Warning Message Content", () => {
    it("includes correct warning message", () => {
      const result = computeWarningState({
        isDirty: true,
        isValid: false,
        navigationAttempt: true,
      });

      expect(result.message).toBe(
        "Your allocation doesn't equal 100%. Changes will be lost. Leave anyway?"
      );
    });
  });

  describe("Dialog Title", () => {
    it("includes correct dialog title", () => {
      const result = computeWarningState({
        isDirty: true,
        isValid: false,
        navigationAttempt: true,
      });

      expect(result.title).toBe("Unsaved Changes");
    });
  });
});

describe("useAllocationWarning - Type Definitions", () => {
  describe("AllocationWarningState", () => {
    it("includes all required properties", () => {
      const state: AllocationWarningState = {
        shouldWarn: true,
        title: "Unsaved Changes",
        message: "Your allocation doesn't equal 100%. Changes will be lost. Leave anyway?",
      };

      expect(state.shouldWarn).toBe(true);
      expect(state.title).toBe("Unsaved Changes");
      expect(state.message).toContain("doesn't equal 100%");
    });
  });
});
