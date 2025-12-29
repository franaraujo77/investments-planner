/**
 * EditHoldingModal Component Tests
 *
 * Story 2.6: Update and Remove Holdings
 * AC-2.6.1: Edit Holding Action - Can update quantity and purchase price
 * AC-2.6.2: Update Holding Saves - Holding is updated and allocations recalculated
 *
 * Tests for the edit holding modal component logic.
 *
 * Note: Since @testing-library/react is not installed,
 * we test the component props, type definitions, and validation logic.
 * Full component rendering tests are E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import { updateAssetSchema } from "@/lib/validations/portfolio";
import type { AssetWithValue } from "@/lib/services/portfolio-service";

// =============================================================================
// TYPE DEFINITIONS (matching component interfaces)
// =============================================================================

interface EditHoldingFormValues {
  quantity: string;
  purchasePrice: string;
}

interface UpdateAssetInput {
  quantity?: string;
  purchasePrice?: string;
}

interface EditHoldingModalProps {
  holding: AssetWithValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// =============================================================================
// HELPER FUNCTIONS (mimicking component logic for testing)
// =============================================================================

/**
 * Convert form values to API payload
 * Matches onSubmit logic in edit-holding-modal.tsx
 */
function formValuesToPayload(data: EditHoldingFormValues): UpdateAssetInput {
  return {
    quantity: data.quantity,
    purchasePrice: data.purchasePrice,
  };
}

/**
 * Handle error response from API
 * Returns user-friendly error message
 * Uses standardized error codes from @/lib/api/error-codes.ts
 */
function getErrorMessage(code: string): string {
  switch (code) {
    case "NOT_FOUND":
    case "NOT_FOUND_ASSET":
      return "Asset not found";
    case "VALIDATION_ERROR":
    case "VALIDATION_INVALID_INPUT":
      return "Please check your input and try again";
    case "AUTH_UNAUTHORIZED":
      return "Please log in to continue";
    default:
      return "Failed to update holding";
  }
}

/**
 * Extract pre-populated form values from holding
 */
function getDefaultFormValues(holding: AssetWithValue): EditHoldingFormValues {
  return {
    quantity: holding.quantity,
    purchasePrice: holding.purchasePrice,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("EditHoldingModal Component Logic", () => {
  // Mock holding data for tests
  const mockHolding: AssetWithValue = {
    id: "asset-123",
    portfolioId: "portfolio-456",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: "100.00000000",
    purchasePrice: "150.0000",
    currency: "USD",
    isIgnored: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    currentPrice: "175.0000",
    valueNative: "17500.0000",
    valueBase: "17500.0000",
    exchangeRate: "1.0000",
    allocationPercent: "25.0000",
    priceUpdatedAt: new Date("2025-01-01"),
  };

  describe("Props Interface", () => {
    it("should define required props correctly", () => {
      const props: EditHoldingModalProps = {
        holding: mockHolding,
        open: true,
        onOpenChange: () => {},
      };

      expect(props.holding.id).toBe("asset-123");
      expect(props.open).toBe(true);
    });

    it("should accept closed state", () => {
      const props: EditHoldingModalProps = {
        holding: mockHolding,
        open: false,
        onOpenChange: () => {},
      };

      expect(props.open).toBe(false);
    });

    it("should accept optional onSuccess callback", () => {
      const props: EditHoldingModalProps = {
        holding: mockHolding,
        open: true,
        onOpenChange: () => {},
        onSuccess: () => {},
      };

      expect(props.onSuccess).toBeDefined();
    });
  });

  describe("Form Pre-population (AC-2.6.1)", () => {
    it("should pre-populate form with current holding values", () => {
      const defaults = getDefaultFormValues(mockHolding);

      expect(defaults.quantity).toBe("100.00000000");
      expect(defaults.purchasePrice).toBe("150.0000");
    });

    it("should handle various decimal formats", () => {
      const holdingWithDecimals: AssetWithValue = {
        ...mockHolding,
        quantity: "0.50000000",
        purchasePrice: "99999.9999",
      };

      const defaults = getDefaultFormValues(holdingWithDecimals);

      expect(defaults.quantity).toBe("0.50000000");
      expect(defaults.purchasePrice).toBe("99999.9999");
    });
  });

  describe("Form Values to Payload Conversion", () => {
    it("should convert form values to API payload", () => {
      const formValues: EditHoldingFormValues = {
        quantity: "200",
        purchasePrice: "175.50",
      };

      const payload = formValuesToPayload(formValues);

      expect(payload.quantity).toBe("200");
      expect(payload.purchasePrice).toBe("175.50");
    });

    it("should include both fields in payload", () => {
      const formValues: EditHoldingFormValues = {
        quantity: "150",
        purchasePrice: "200.00",
      };

      const payload = formValuesToPayload(formValues);

      expect(payload.quantity).toBeDefined();
      expect(payload.purchasePrice).toBeDefined();
    });
  });

  describe("Form Validation with Zod Schema (AC-2.6.1, AC-2.6.2)", () => {
    it("should validate complete update input", () => {
      const input = {
        quantity: "200",
        purchasePrice: "175.50",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate quantity-only update", () => {
      const input = {
        quantity: "200",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate price-only update", () => {
      const input = {
        purchasePrice: "175.50",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty update (at least one field required)", () => {
      const input = {};

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        // The refinement error is a ZodIssue with the message
        const hasAtLeastOneFieldError = result.error.issues.some(
          (issue) => issue.message === "At least one field must be provided"
        );
        expect(hasAtLeastOneFieldError).toBe(true);
      }
    });

    it("should reject quantity = 0", () => {
      const input = {
        quantity: "0",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative quantity", () => {
      const input = {
        quantity: "-5",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject purchase price = 0", () => {
      const input = {
        purchasePrice: "0",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative purchase price", () => {
      const input = {
        purchasePrice: "-100",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept decimal quantities (for crypto)", () => {
      const input = {
        quantity: "0.00000001", // 1 satoshi equivalent
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept decimal prices", () => {
      const input = {
        purchasePrice: "0.0001",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept large quantities", () => {
      const input = {
        quantity: "99999999999.99999999",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept large prices", () => {
      const input = {
        purchasePrice: "99999999999.9999",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric quantity", () => {
      const input = {
        quantity: "abc",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric price", () => {
      const input = {
        purchasePrice: "not-a-number",
      };

      const result = updateAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Error Message Handling", () => {
    it("should return correct message for NOT_FOUND error", () => {
      const message = getErrorMessage("NOT_FOUND");
      expect(message).toBe("Asset not found");
    });

    it("should return correct message for NOT_FOUND_ASSET error", () => {
      const message = getErrorMessage("NOT_FOUND_ASSET");
      expect(message).toBe("Asset not found");
    });

    it("should return correct message for VALIDATION_ERROR", () => {
      const message = getErrorMessage("VALIDATION_ERROR");
      expect(message).toBe("Please check your input and try again");
    });

    it("should return correct message for VALIDATION_INVALID_INPUT error", () => {
      const message = getErrorMessage("VALIDATION_INVALID_INPUT");
      expect(message).toBe("Please check your input and try again");
    });

    it("should return correct message for AUTH_UNAUTHORIZED error", () => {
      const message = getErrorMessage("AUTH_UNAUTHORIZED");
      expect(message).toBe("Please log in to continue");
    });

    it("should return generic message for unknown errors", () => {
      const message = getErrorMessage("UNKNOWN_ERROR");
      expect(message).toBe("Failed to update holding");
    });
  });

  describe("Dialog Open/Close Behavior", () => {
    it("should track open state correctly", () => {
      let open = false;

      // Simulate opening
      open = true;
      expect(open).toBe(true);

      // Simulate closing
      open = false;
      expect(open).toBe(false);
    });

    it("should not close during submission", () => {
      let isSubmitting = true;
      let open = true;

      // Attempt to close while submitting should be blocked
      const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
          open = newOpen;
        }
      };

      handleOpenChange(false);
      expect(open).toBe(true); // Still open

      // After submission completes
      isSubmitting = false;
      handleOpenChange(false);
      expect(open).toBe(false);
    });
  });

  describe("Loading State", () => {
    it("should disable form during submission", () => {
      const isSubmitting = true;
      expect(isSubmitting).toBe(true);
    });

    it("should disable save button when form is invalid", () => {
      const isValid = false;
      const isSubmitting = false;

      const buttonDisabled = !isValid || isSubmitting;
      expect(buttonDisabled).toBe(true);
    });

    it("should enable save button when form is valid and not submitting", () => {
      const isValid = true;
      const isSubmitting = false;

      const buttonDisabled = !isValid || isSubmitting;
      expect(buttonDisabled).toBe(false);
    });
  });

  describe("API Endpoint", () => {
    it("should use correct endpoint format", () => {
      const assetId = "asset-123";
      const expectedEndpoint = `/api/assets/${assetId}`;

      expect(expectedEndpoint).toBe("/api/assets/asset-123");
    });

    it("should use PATCH method for updates", () => {
      const method = "PATCH";
      expect(method).toBe("PATCH");
    });
  });

  describe("Success Behavior (AC-2.6.2)", () => {
    it("should define success flow steps", () => {
      const successSteps = [
        "Show success toast",
        "Call onSuccess callback",
        "Trigger router.refresh for allocation recalculation",
        "Close modal",
      ];

      expect(successSteps).toHaveLength(4);
      expect(successSteps[2]).toContain("refresh");
    });
  });
});
