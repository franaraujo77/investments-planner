/**
 * Unit tests for useAllocationValidation hook
 *
 * Story 3.3: Allocation Validation
 * Tests for AC-3.3.1: Save Button Disabled When Invalid
 * Tests for AC-3.3.2: Save Button Enabled When Valid
 *
 * Tests validation logic for allocation percentage totals.
 */

import { describe, it, expect } from "vitest";
import {
  computeAllocationValidation,
  type AllocationValidationResult,
} from "@/hooks/useAllocationValidation";

// =============================================================================
// TESTS FOR ALLOCATION VALIDATION COMPUTATION
// =============================================================================

describe("useAllocationValidation - computeAllocationValidation", () => {
  describe("Valid State (AC-3.3.2)", () => {
    it("returns isValid=true when total = 100%", () => {
      const result = computeAllocationValidation({
        total: 100,
        remaining: 0,
        isAllocationValid: true,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(true);
      expect(result.validationMessage).toBe("Ready to save");
    });

    it("returns isValid=true when total = 99.99% (floating-point tolerance)", () => {
      // 99.99% should be considered valid due to floating-point tolerance
      const result = computeAllocationValidation({
        total: 99.99,
        remaining: 0.01,
        isAllocationValid: true,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(true);
    });

    it("returns isValid=true when total = 100.01% (floating-point tolerance)", () => {
      // 100.01% should be considered valid due to floating-point tolerance
      const result = computeAllocationValidation({
        total: 100.01,
        remaining: -0.01,
        isAllocationValid: true,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(true);
    });

    it("returns isValid=true for 99.999999% (floating-point precision)", () => {
      // Extreme floating-point case
      const result = computeAllocationValidation({
        total: 99.999999,
        remaining: 0.000001,
        isAllocationValid: true,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe("Invalid State (AC-3.3.1)", () => {
    it("returns isValid=false when total < 100%", () => {
      const result = computeAllocationValidation({
        total: 80,
        remaining: 20,
        isAllocationValid: false,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.canSubmit).toBe(false);
      expect(result.validationMessage).toBe("Allocation must equal 100%");
    });

    it("returns isValid=false when total > 100%", () => {
      const result = computeAllocationValidation({
        total: 120,
        remaining: -20,
        isAllocationValid: false,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.canSubmit).toBe(false);
    });

    it("returns isValid=false when total = 0%", () => {
      const result = computeAllocationValidation({
        total: 0,
        remaining: 100,
        isAllocationValid: false,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(false);
    });

    it("returns isValid=false for 98% (outside tolerance)", () => {
      const result = computeAllocationValidation({
        total: 98,
        remaining: 2,
        isAllocationValid: false,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("canSubmit Logic", () => {
    it("returns canSubmit=false when isSubmitting=true", () => {
      const result = computeAllocationValidation({
        total: 100,
        remaining: 0,
        isAllocationValid: true,
        isSubmitting: true,
        hasFormErrors: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(false);
    });

    it("returns canSubmit=false when hasFormErrors=true", () => {
      const result = computeAllocationValidation({
        total: 100,
        remaining: 0,
        isAllocationValid: true,
        isSubmitting: false,
        hasFormErrors: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(false);
    });

    it("returns canSubmit=false when both invalid allocation and submitting", () => {
      const result = computeAllocationValidation({
        total: 80,
        remaining: 20,
        isAllocationValid: false,
        isSubmitting: true,
        hasFormErrors: false,
      });

      expect(result.canSubmit).toBe(false);
    });

    it("returns canSubmit=true only when all conditions are met", () => {
      const result = computeAllocationValidation({
        total: 100,
        remaining: 0,
        isAllocationValid: true,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.canSubmit).toBe(true);
    });
  });

  describe("Allocated and Remaining Values", () => {
    it("passes through allocated value correctly", () => {
      const result = computeAllocationValidation({
        total: 75,
        remaining: 25,
        isAllocationValid: false,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.allocated).toBe(75);
      expect(result.remaining).toBe(25);
    });

    it("handles negative remaining (overallocated)", () => {
      const result = computeAllocationValidation({
        total: 110,
        remaining: -10,
        isAllocationValid: false,
        isSubmitting: false,
        hasFormErrors: false,
      });

      expect(result.allocated).toBe(110);
      expect(result.remaining).toBe(-10);
    });
  });
});

describe("useAllocationValidation - Type Definitions", () => {
  describe("AllocationValidationResult", () => {
    it("includes all required properties", () => {
      const result: AllocationValidationResult = {
        isValid: true,
        canSubmit: true,
        validationMessage: "Ready to save",
        allocated: 100,
        remaining: 0,
      };

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(true);
      expect(result.validationMessage).toBe("Ready to save");
      expect(result.allocated).toBe(100);
      expect(result.remaining).toBe(0);
    });
  });
});
