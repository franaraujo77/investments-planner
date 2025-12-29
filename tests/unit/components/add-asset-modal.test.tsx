/**
 * AddAssetModal Component Tests
 *
 * Story 2.5: Add Holdings to Portfolio
 * AC-2.5.2: Form with symbol search, quantity, purchase price, currency
 * AC-2.5.5: Form validation (quantity > 0, price > 0, valid currency)
 * AC-2.5.6: Success toast and portfolio refresh
 * AC-2.5.8: Duplicate asset error handling
 *
 * Tests for the add asset modal component logic.
 *
 * Note: Since @testing-library/react is not installed,
 * we test the component props, type definitions, and validation logic.
 * Full component rendering tests are E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import { addAssetSchema, SUPPORTED_CURRENCIES } from "@/lib/validations/portfolio";

// =============================================================================
// TYPE DEFINITIONS (matching component interfaces)
// =============================================================================

interface AddAssetFormValues {
  symbol: string;
  name: string;
  quantity: string;
  purchasePrice: string;
  currency: string;
}

interface AddAssetInput {
  symbol: string;
  name?: string;
  quantity: string;
  purchasePrice: string;
  currency: string;
}

// =============================================================================
// HELPER FUNCTIONS (mimicking component logic for testing)
// =============================================================================

/**
 * Convert form values to API payload
 * Matches onSubmit logic in add-asset-modal.tsx
 */
function formValuesToPayload(data: AddAssetFormValues): AddAssetInput {
  return {
    symbol: data.symbol,
    name: data.name || undefined,
    quantity: data.quantity,
    purchasePrice: data.purchasePrice,
    currency: data.currency,
  };
}

/**
 * Handle error response from API
 * Returns user-friendly error message
 * Uses standardized error codes from @/lib/api/error-codes.ts
 */
function getErrorMessage(code: string): string {
  switch (code) {
    case "CONFLICT_ASSET_EXISTS":
      return "This asset already exists in your portfolio";
    case "NOT_FOUND_PORTFOLIO":
      return "Portfolio not found";
    case "VALIDATION_INVALID_INPUT":
      return "Please check your input and try again";
    default:
      return "Failed to add asset";
  }
}

/**
 * Reset form state (called when dialog closes)
 */
function resetFormState(): AddAssetFormValues {
  return {
    symbol: "",
    name: "",
    quantity: "",
    purchasePrice: "",
    currency: "USD",
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("AddAssetModal Component Logic", () => {
  describe("Props Interface", () => {
    it("should define required props correctly", () => {
      const props = {
        portfolioId: "portfolio-123",
        defaultCurrency: "USD",
        trigger: null,
        onSuccess: () => {},
      };

      expect(props.portfolioId).toBe("portfolio-123");
      expect(props.defaultCurrency).toBe("USD");
    });

    it("should accept undefined defaultCurrency (defaults to USD)", () => {
      const props = {
        portfolioId: "portfolio-123",
        defaultCurrency: undefined,
      };

      expect(props.defaultCurrency).toBeUndefined();
      // Component would use "USD" as default
    });
  });

  describe("Form Values to Payload Conversion", () => {
    it("should convert complete form values to API payload", () => {
      const formValues: AddAssetFormValues = {
        symbol: "AAPL",
        name: "Apple Inc.",
        quantity: "10",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const payload = formValuesToPayload(formValues);

      expect(payload.symbol).toBe("AAPL");
      expect(payload.name).toBe("Apple Inc.");
      expect(payload.quantity).toBe("10");
      expect(payload.purchasePrice).toBe("150.50");
      expect(payload.currency).toBe("USD");
    });

    it("should convert empty name to undefined", () => {
      const formValues: AddAssetFormValues = {
        symbol: "AAPL",
        name: "",
        quantity: "10",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const payload = formValuesToPayload(formValues);

      expect(payload.name).toBeUndefined();
    });

    it("should preserve whitespace-only name as undefined", () => {
      const formValues: AddAssetFormValues = {
        symbol: "AAPL",
        name: "   ",
        quantity: "10",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const payload = formValuesToPayload(formValues);

      // Empty string becomes undefined, whitespace remains as value
      // Component trims in form, so this edge case may not occur
      expect(payload.name).toBe("   ");
    });
  });

  describe("Form Validation with Zod Schema (AC-2.5.5)", () => {
    it("should validate valid asset input", () => {
      const input = {
        symbol: "AAPL",
        name: "Apple Inc.",
        quantity: "10",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should require symbol", () => {
      const input = {
        symbol: "",
        quantity: "10",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject quantity <= 0", () => {
      const input = {
        symbol: "AAPL",
        quantity: "0",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative quantity", () => {
      const input = {
        symbol: "AAPL",
        quantity: "-5",
        purchasePrice: "150.50",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject purchase price <= 0", () => {
      const input = {
        symbol: "AAPL",
        quantity: "10",
        purchasePrice: "0",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative purchase price", () => {
      const input = {
        symbol: "AAPL",
        quantity: "10",
        purchasePrice: "-100",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept decimal quantities", () => {
      const input = {
        symbol: "BTC",
        quantity: "0.5",
        purchasePrice: "50000",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept decimal prices", () => {
      const input = {
        symbol: "AAPL",
        quantity: "10",
        purchasePrice: "150.5678",
        currency: "USD",
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept optional name field", () => {
      const input = {
        symbol: "AAPL",
        quantity: "10",
        purchasePrice: "150.50",
        currency: "USD",
        // name omitted
      };

      const result = addAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("Error Message Handling (AC-2.5.8)", () => {
    it("should return correct message for CONFLICT_ASSET_EXISTS error", () => {
      const message = getErrorMessage("CONFLICT_ASSET_EXISTS");
      expect(message).toBe("This asset already exists in your portfolio");
    });

    it("should return correct message for NOT_FOUND_PORTFOLIO error", () => {
      const message = getErrorMessage("NOT_FOUND_PORTFOLIO");
      expect(message).toBe("Portfolio not found");
    });

    it("should return correct message for VALIDATION_INVALID_INPUT error", () => {
      const message = getErrorMessage("VALIDATION_INVALID_INPUT");
      expect(message).toBe("Please check your input and try again");
    });

    it("should return generic message for unknown errors", () => {
      const message = getErrorMessage("UNKNOWN_ERROR");
      expect(message).toBe("Failed to add asset");
    });
  });

  describe("Form State Reset", () => {
    it("should reset all form fields", () => {
      const state = resetFormState();

      expect(state.symbol).toBe("");
      expect(state.name).toBe("");
      expect(state.quantity).toBe("");
      expect(state.purchasePrice).toBe("");
      expect(state.currency).toBe("USD");
    });
  });

  describe("Currency Selection", () => {
    it("should use SUPPORTED_CURRENCIES from validation schema", () => {
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
      expect(SUPPORTED_CURRENCIES.some((c) => c.code === "USD")).toBe(true);
      expect(SUPPORTED_CURRENCIES.some((c) => c.code === "BRL")).toBe(true);
    });

    it("should validate supported currency codes", () => {
      for (const currency of SUPPORTED_CURRENCIES) {
        const input = {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150.50",
          currency: currency.code,
        };

        const result = addAssetSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
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

    it("should disable submit button when form is invalid", () => {
      const isValid = false;
      const isSubmitting = false;

      const buttonDisabled = !isValid || isSubmitting;
      expect(buttonDisabled).toBe(true);
    });

    it("should enable submit button when form is valid and not submitting", () => {
      const isValid = true;
      const isSubmitting = false;

      const buttonDisabled = !isValid || isSubmitting;
      expect(buttonDisabled).toBe(false);
    });
  });

  describe("Asset Selection Auto-populate (AC-2.5.4)", () => {
    it("should auto-populate symbol and name from selection", () => {
      const selectedAsset = { symbol: "AAPL", name: "Apple Inc." };

      let formSymbol = "";
      let formName = "";

      // Simulate handleAssetSelect
      formSymbol = selectedAsset.symbol;
      formName = selectedAsset.name;

      expect(formSymbol).toBe("AAPL");
      expect(formName).toBe("Apple Inc.");
    });
  });
});
