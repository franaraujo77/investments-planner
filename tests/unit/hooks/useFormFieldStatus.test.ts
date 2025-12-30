/**
 * Unit tests for useFormFieldStatus hook
 *
 * Story 3.4: Visual Status Feedback
 * Tests for AC-3.4.5: Field-Level Error Styling
 * Tests for AC-3.4.6: Field-Level Valid Styling
 *
 * Tests the hook's logic for extracting field status from react-hook-form.
 */

import { describe, it, expect } from "vitest";
import { extractFieldStatus, type FormFieldStatusResult } from "@/hooks/useFormFieldStatus";

// =============================================================================
// TESTS FOR FIELD STATUS EXTRACTION
// =============================================================================

describe("useFormFieldStatus - extractFieldStatus", () => {
  describe("Error Detection", () => {
    it("sets hasError to true when error exists for field", () => {
      const errors = { email: { message: "Required", type: "required" } };
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.hasError).toBe(true);
      expect(result.errorMessage).toBe("Required");
    });

    it("sets hasError to false when no error for field", () => {
      const errors = {};
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.hasError).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });

    it("handles nested field paths", () => {
      const errors = {
        user: {
          email: { message: "Invalid email", type: "pattern" },
        },
      };
      const touchedFields = {
        user: { email: true },
      };

      const result = extractFieldStatus("user.email", errors, touchedFields);

      expect(result.hasError).toBe(true);
      expect(result.errorMessage).toBe("Invalid email");
    });

    it("handles array field paths", () => {
      const errors = {
        holdings: [{ percentage: { message: "Must be positive", type: "min" } }],
      };
      const touchedFields = {
        holdings: [{ percentage: true }],
      };

      const result = extractFieldStatus("holdings.0.percentage", errors, touchedFields);

      expect(result.hasError).toBe(true);
      expect(result.errorMessage).toBe("Must be positive");
    });
  });

  describe("Touched Detection", () => {
    it("sets isTouched to true when field has been touched", () => {
      const errors = {};
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.isTouched).toBe(true);
    });

    it("sets isTouched to false when field has not been touched", () => {
      const errors = {};
      const touchedFields = {};

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.isTouched).toBe(false);
    });

    it("handles nested touched fields", () => {
      const errors = {};
      const touchedFields = { user: { email: true } };

      const result = extractFieldStatus("user.email", errors, touchedFields);

      expect(result.isTouched).toBe(true);
    });
  });

  describe("Valid Detection", () => {
    it("sets isValid to true when no error and field is touched", () => {
      const errors = {};
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.isValid).toBe(true);
    });

    it("sets isValid to false when error exists", () => {
      const errors = { email: { message: "Required", type: "required" } };
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.isValid).toBe(false);
    });

    it("sets isValid to false when not touched (regardless of error state)", () => {
      const errors = {};
      const touchedFields = {};

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.isValid).toBe(false);
    });
  });

  describe("Border Class Computation", () => {
    it("returns border-destructive when hasError is true", () => {
      const errors = { email: { message: "Required", type: "required" } };
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.borderClassName).toBe("border-destructive");
    });

    it("returns border-green-500 when valid and touched", () => {
      const errors = {};
      const touchedFields = { email: true };

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.borderClassName).toBe("border-green-500");
    });

    it("returns empty string for untouched field without error", () => {
      const errors = {};
      const touchedFields = {};

      const result = extractFieldStatus("email", errors, touchedFields);

      expect(result.borderClassName).toBe("");
    });
  });
});

describe("useFormFieldStatus - Type Definitions", () => {
  describe("FormFieldStatusResult", () => {
    it("includes all required properties", () => {
      const result: FormFieldStatusResult = {
        hasError: false,
        isTouched: true,
        isValid: true,
        errorMessage: undefined,
        borderClassName: "border-green-500",
      };

      expect(result.hasError).toBe(false);
      expect(result.isTouched).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(result.borderClassName).toBe("border-green-500");
    });

    it("allows errorMessage to be string", () => {
      const result: FormFieldStatusResult = {
        hasError: true,
        isTouched: true,
        isValid: false,
        errorMessage: "This field is required",
        borderClassName: "border-destructive",
      };

      expect(result.errorMessage).toBe("This field is required");
    });
  });
});
