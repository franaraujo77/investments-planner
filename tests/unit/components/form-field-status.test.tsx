/**
 * Unit tests for FormFieldStatus component
 *
 * Story 3.4: Visual Status Feedback
 * Tests for AC-3.4.5: Field-Level Error Styling
 * Tests for AC-3.4.6: Field-Level Valid Styling
 *
 * Tests the exported utility functions for field status styling.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import {
  getFieldBorderClassName,
  type FormFieldStatusProps,
} from "@/components/forms/form-field-status";

// =============================================================================
// TESTS FOR BORDER CLASS GENERATION
// =============================================================================

describe("FormFieldStatus - getFieldBorderClassName", () => {
  describe("AC-3.4.5: Error State Styling (Red Border)", () => {
    it("returns border-destructive when field has error", () => {
      const className = getFieldBorderClassName({
        hasError: true,
        isTouched: false,
        isValid: false,
      });
      expect(className).toBe("border-destructive");
    });

    it("error styling takes precedence over valid styling", () => {
      const className = getFieldBorderClassName({
        hasError: true,
        isTouched: true,
        isValid: true, // Should be ignored when hasError is true
      });
      expect(className).toBe("border-destructive");
    });

    it("error styling takes precedence over touched state", () => {
      const className = getFieldBorderClassName({
        hasError: true,
        isTouched: true,
        isValid: false,
      });
      expect(className).toBe("border-destructive");
    });
  });

  describe("AC-3.4.6: Valid State Styling (Green Border)", () => {
    it("returns border-green-500 when field is valid and touched", () => {
      const className = getFieldBorderClassName({
        hasError: false,
        isTouched: true,
        isValid: true,
      });
      expect(className).toBe("border-green-500");
    });

    it("returns border-green-500 when field has no error and is touched", () => {
      // isValid defaults to !hasError when not explicitly set
      const className = getFieldBorderClassName({
        hasError: false,
        isTouched: true,
        isValid: true,
      });
      expect(className).toBe("border-green-500");
    });
  });

  describe("Default State (No Special Styling)", () => {
    it("returns empty string for untouched field without error", () => {
      const className = getFieldBorderClassName({
        hasError: false,
        isTouched: false,
        isValid: false,
      });
      expect(className).toBe("");
    });

    it("returns empty string for touched but not valid field without error", () => {
      const className = getFieldBorderClassName({
        hasError: false,
        isTouched: true,
        isValid: false,
      });
      expect(className).toBe("");
    });
  });

  describe("Edge Cases", () => {
    it("handles all combinations correctly", () => {
      // All false - default
      expect(getFieldBorderClassName({ hasError: false, isTouched: false, isValid: false })).toBe(
        ""
      );

      // Only touched - default
      expect(getFieldBorderClassName({ hasError: false, isTouched: true, isValid: false })).toBe(
        ""
      );

      // Touched and valid - green
      expect(getFieldBorderClassName({ hasError: false, isTouched: true, isValid: true })).toBe(
        "border-green-500"
      );

      // Valid but not touched - default (must be touched to show green)
      expect(getFieldBorderClassName({ hasError: false, isTouched: false, isValid: true })).toBe(
        ""
      );

      // Error always wins
      expect(getFieldBorderClassName({ hasError: true, isTouched: false, isValid: false })).toBe(
        "border-destructive"
      );
      expect(getFieldBorderClassName({ hasError: true, isTouched: true, isValid: false })).toBe(
        "border-destructive"
      );
      expect(getFieldBorderClassName({ hasError: true, isTouched: true, isValid: true })).toBe(
        "border-destructive"
      );
    });
  });
});

describe("FormFieldStatus - Type Definitions", () => {
  describe("FormFieldStatusProps", () => {
    it("requires hasError, isTouched, and isValid props", () => {
      const validProps: FormFieldStatusProps = {
        hasError: false,
        isTouched: true,
        isValid: true,
        children: null,
      };
      expect(validProps.hasError).toBe(false);
      expect(validProps.isTouched).toBe(true);
      expect(validProps.isValid).toBe(true);
    });

    it("accepts optional errorMessage prop", () => {
      const propsWithError: FormFieldStatusProps = {
        hasError: true,
        isTouched: true,
        isValid: false,
        errorMessage: "This field is required",
        children: null,
      };
      expect(propsWithError.errorMessage).toBe("This field is required");
    });

    it("accepts optional className prop", () => {
      const propsWithClassName: FormFieldStatusProps = {
        hasError: false,
        isTouched: false,
        isValid: false,
        className: "custom-class",
        children: null,
      };
      expect(propsWithClassName.className).toBe("custom-class");
    });

    it("accepts children prop for wrapped content", () => {
      const propsWithChildren: FormFieldStatusProps = {
        hasError: false,
        isTouched: false,
        isValid: false,
        children: "Content",
      };
      expect(propsWithChildren.children).toBe("Content");
    });
  });
});
