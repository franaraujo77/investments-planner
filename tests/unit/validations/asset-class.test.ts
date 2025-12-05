/**
 * Asset Class and Subclass Validation Schema Unit Tests
 *
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * Tests for Zod validation schemas:
 * - AC-4.1.2: Asset class name validation (1-50 characters)
 * - Icon validation (optional, max 10 characters)
 * - AC-4.2.2: Subclass name validation (1-50 characters)
 * - AC-4.3.1: Allocation range input validation (targetMin, targetMax)
 * - AC-4.3.2: Min cannot exceed max validation
 * - AC-4.4.1: Subclass allocation range validation
 * - AC-4.4.4: Subclass min cannot exceed max validation
 * - AC-4.5.1: Max assets validation (integer 0-100, null = no limit)
 * - AC-4.6.1: Min allocation value validation (0-1000000, null = no minimum)
 * - AC-4.6.4: Min allocation value format validation
 */

import { describe, it, expect } from "vitest";
import {
  createAssetClassSchema,
  updateAssetClassSchema,
  deleteAssetClassQuerySchema,
  createSubclassSchema,
  updateSubclassSchema,
  deleteSubclassQuerySchema,
  ASSET_CLASS_NAME_MIN_LENGTH,
  ASSET_CLASS_NAME_MAX_LENGTH,
  ASSET_CLASS_ICON_MAX_LENGTH,
  MAX_SUBCLASSES_PER_CLASS,
  ASSET_CLASS_MESSAGES,
  SUBCLASS_MESSAGES,
} from "@/lib/validations/asset-class-schemas";

describe("Asset Class Validation Schemas", () => {
  describe("Constants", () => {
    it("should have correct name length constraints", () => {
      expect(ASSET_CLASS_NAME_MIN_LENGTH).toBe(1);
      expect(ASSET_CLASS_NAME_MAX_LENGTH).toBe(50);
    });

    it("should have correct icon length constraint", () => {
      expect(ASSET_CLASS_ICON_MAX_LENGTH).toBe(10);
    });
  });

  describe("createAssetClassSchema", () => {
    it("should accept valid name", () => {
      const result = createAssetClassSchema.safeParse({ name: "Stocks" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Stocks");
      }
    });

    it("should accept name with icon", () => {
      const result = createAssetClassSchema.safeParse({
        name: "Stocks",
        icon: "📈",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Stocks");
        expect(result.data.icon).toBe("📈");
      }
    });

    it("should trim whitespace from name", () => {
      const result = createAssetClassSchema.safeParse({ name: "  Stocks  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Stocks");
      }
    });

    it("should reject empty name", () => {
      const result = createAssetClassSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only name", () => {
      const result = createAssetClassSchema.safeParse({ name: "   " });
      expect(result.success).toBe(false);
    });

    it("should reject name exceeding 50 characters", () => {
      const longName = "a".repeat(51);
      const result = createAssetClassSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it("should accept name with exactly 50 characters", () => {
      const name = "a".repeat(50);
      const result = createAssetClassSchema.safeParse({ name });
      expect(result.success).toBe(true);
    });

    it("should reject icon exceeding 10 characters", () => {
      const result = createAssetClassSchema.safeParse({
        name: "Stocks",
        icon: "a".repeat(11),
      });
      expect(result.success).toBe(false);
    });

    it("should accept null icon", () => {
      const result = createAssetClassSchema.safeParse({
        name: "Stocks",
        icon: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept missing icon (optional)", () => {
      const result = createAssetClassSchema.safeParse({ name: "Stocks" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBeUndefined();
      }
    });
  });

  describe("updateAssetClassSchema", () => {
    it("should accept valid name update", () => {
      const result = updateAssetClassSchema.safeParse({ name: "Equities" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Equities");
      }
    });

    it("should accept valid icon update", () => {
      const result = updateAssetClassSchema.safeParse({ icon: "🏠" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe("🏠");
      }
    });

    it("should accept both name and icon update", () => {
      const result = updateAssetClassSchema.safeParse({
        name: "Real Estate",
        icon: "🏠",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object (no updates)", () => {
      const result = updateAssetClassSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from name", () => {
      const result = updateAssetClassSchema.safeParse({
        name: "  Updated Name  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }
    });

    it("should reject name exceeding 50 characters", () => {
      const longName = "a".repeat(51);
      const result = updateAssetClassSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it("should accept null icon to clear it", () => {
      const result = updateAssetClassSchema.safeParse({ icon: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBeNull();
      }
    });

    // ==========================================================================
    // ALLOCATION RANGE VALIDATION TESTS (Story 4.3)
    // ==========================================================================

    describe("Allocation Range Validation (AC-4.3.1, AC-4.3.2)", () => {
      it("should accept valid allocation range (40.00, 50.00)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "40.00",
          targetMax: "50.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMin).toBe("40.00");
          expect(result.data.targetMax).toBe("50.00");
        }
      });

      it("should accept valid integer percentages (40, 50)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "40",
          targetMax: "50",
        });
        expect(result.success).toBe(true);
      });

      it("should accept boundary values (0.00, 100.00)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "0.00",
          targetMax: "100.00",
        });
        expect(result.success).toBe(true);
      });

      it("should accept single decimal place values (40.5, 50.5)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "40.5",
          targetMax: "50.5",
        });
        expect(result.success).toBe(true);
      });

      it("should accept equal min and max values (45.00, 45.00)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "45.00",
          targetMax: "45.00",
        });
        expect(result.success).toBe(true);
      });

      it("should accept 100 as exact maximum", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "50",
          targetMax: "100",
        });
        expect(result.success).toBe(true);
      });

      it("should accept 0 as exact minimum", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "0",
          targetMax: "50",
        });
        expect(result.success).toBe(true);
      });

      it("should reject min > max (60.00, 40.00) - AC-4.3.2", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "60.00",
          targetMax: "40.00",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.flatten().fieldErrors;
          expect(errors.targetMin).toBeDefined();
          expect(errors.targetMin?.[0]).toContain("Minimum cannot exceed maximum");
        }
      });

      it("should accept null targetMin (optional)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: null,
          targetMax: "50.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMin).toBeNull();
        }
      });

      it("should accept null targetMax (optional)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "40.00",
          targetMax: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMax).toBeNull();
        }
      });

      it("should accept both null values", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: null,
          targetMax: null,
        });
        expect(result.success).toBe(true);
      });

      it("should accept missing allocation fields", () => {
        const result = updateAssetClassSchema.safeParse({
          name: "Stocks",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMin).toBeUndefined();
          expect(result.data.targetMax).toBeUndefined();
        }
      });

      it("should reject invalid percentage format (abc)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "abc",
          targetMax: "50.00",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative percentage (-10)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "-10",
          targetMax: "50.00",
        });
        expect(result.success).toBe(false);
      });

      it("should reject percentage over 100 (150)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "40.00",
          targetMax: "150.00",
        });
        expect(result.success).toBe(false);
      });

      it("should reject more than 2 decimal places (40.123)", () => {
        const result = updateAssetClassSchema.safeParse({
          targetMin: "40.123",
          targetMax: "50.00",
        });
        expect(result.success).toBe(false);
      });

      it("should allow combining name, icon, and allocation range updates", () => {
        const result = updateAssetClassSchema.safeParse({
          name: "Equities",
          icon: "📈",
          targetMin: "40.00",
          targetMax: "60.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Equities");
          expect(result.data.icon).toBe("📈");
          expect(result.data.targetMin).toBe("40.00");
          expect(result.data.targetMax).toBe("60.00");
        }
      });
    });

    // ==========================================================================
    // MAX ASSETS VALIDATION TESTS (Story 4.5)
    // ==========================================================================

    describe("Max Assets Validation (AC-4.5.1)", () => {
      it("should accept valid maxAssets value (5)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: 5 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(5);
        }
      });

      it("should accept maxAssets = 0 (no limit)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: 0 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(0);
        }
      });

      it("should accept maxAssets = 100 (upper boundary)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: 100 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(100);
        }
      });

      it("should accept maxAssets = 10 (typical value)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: 10 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(10);
        }
      });

      it("should accept null maxAssets (no limit)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: null });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBeNull();
        }
      });

      it("should accept undefined maxAssets (no change)", () => {
        const result = updateAssetClassSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBeUndefined();
        }
      });

      it("should reject negative maxAssets (-1)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: -1 });
        expect(result.success).toBe(false);
      });

      it("should reject maxAssets over 100 (101)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: 101 });
        expect(result.success).toBe(false);
      });

      it("should reject non-integer maxAssets (5.5)", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: 5.5 });
        expect(result.success).toBe(false);
      });

      it("should reject string maxAssets ('abc')", () => {
        const result = updateAssetClassSchema.safeParse({ maxAssets: "abc" });
        expect(result.success).toBe(false);
      });

      it("should allow combining name, allocation range, and maxAssets updates", () => {
        const result = updateAssetClassSchema.safeParse({
          name: "Equities",
          targetMin: "40.00",
          targetMax: "60.00",
          maxAssets: 10,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Equities");
          expect(result.data.targetMin).toBe("40.00");
          expect(result.data.targetMax).toBe("60.00");
          expect(result.data.maxAssets).toBe(10);
        }
      });
    });

    // ==========================================================================
    // MIN ALLOCATION VALUE VALIDATION TESTS (Story 4.6)
    // ==========================================================================

    describe("Min Allocation Value Validation (AC-4.6.1, AC-4.6.4)", () => {
      it("should accept valid minAllocationValue (100)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "100" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("100");
        }
      });

      it("should accept minAllocationValue with decimals (100.50)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "100.50" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("100.50");
        }
      });

      it("should accept minAllocationValue = 0 (no minimum)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "0" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("0");
        }
      });

      it("should accept minAllocationValue = 1000000 (upper boundary)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "1000000" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("1000000");
        }
      });

      it("should accept minAllocationValue with up to 4 decimal places (100.1234)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "100.1234" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("100.1234");
        }
      });

      it("should accept null minAllocationValue (no minimum)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: null });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBeNull();
        }
      });

      it("should accept undefined minAllocationValue (no change)", () => {
        const result = updateAssetClassSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBeUndefined();
        }
      });

      it("should reject negative minAllocationValue (-1)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "-1" });
        expect(result.success).toBe(false);
      });

      it("should reject minAllocationValue over 1000000 (1000001)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "1000001" });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric minAllocationValue (abc)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "abc" });
        expect(result.success).toBe(false);
      });

      it("should reject minAllocationValue with more than 4 decimal places (100.12345)", () => {
        const result = updateAssetClassSchema.safeParse({ minAllocationValue: "100.12345" });
        expect(result.success).toBe(false);
      });

      it("should allow combining all fields including minAllocationValue", () => {
        const result = updateAssetClassSchema.safeParse({
          name: "Equities",
          targetMin: "40.00",
          targetMax: "60.00",
          maxAssets: 10,
          minAllocationValue: "500",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Equities");
          expect(result.data.targetMin).toBe("40.00");
          expect(result.data.targetMax).toBe("60.00");
          expect(result.data.maxAssets).toBe(10);
          expect(result.data.minAllocationValue).toBe("500");
        }
      });
    });
  });

  describe("deleteAssetClassQuerySchema", () => {
    it("should parse force=true", () => {
      const result = deleteAssetClassQuerySchema.safeParse({ force: "true" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(true);
      }
    });

    it("should parse force=false", () => {
      const result = deleteAssetClassQuerySchema.safeParse({ force: "false" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });

    it("should default to false when force not provided", () => {
      const result = deleteAssetClassQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });

    it("should treat non-'true' values as false", () => {
      const result = deleteAssetClassQuerySchema.safeParse({ force: "yes" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });
  });

  describe("ASSET_CLASS_MESSAGES", () => {
    it("should have required error messages", () => {
      expect(ASSET_CLASS_MESSAGES.NAME_REQUIRED).toBeDefined();
      expect(ASSET_CLASS_MESSAGES.NAME_TOO_LONG).toBeDefined();
      expect(ASSET_CLASS_MESSAGES.ICON_TOO_LONG).toBeDefined();
      expect(ASSET_CLASS_MESSAGES.LIMIT_REACHED).toBeDefined();
      expect(ASSET_CLASS_MESSAGES.NOT_FOUND).toBeDefined();
      expect(ASSET_CLASS_MESSAGES.HAS_ASSETS).toBeDefined();
    });

    it("should include max length in NAME_TOO_LONG message", () => {
      expect(ASSET_CLASS_MESSAGES.NAME_TOO_LONG).toContain("50");
    });

    it("should include max count in LIMIT_REACHED message", () => {
      expect(ASSET_CLASS_MESSAGES.LIMIT_REACHED).toContain("10");
    });

    // Allocation range messages (Story 4.3)
    it("should have allocation range error messages (AC-4.3.2)", () => {
      expect(ASSET_CLASS_MESSAGES.MIN_EXCEEDS_MAX).toBeDefined();
      expect(ASSET_CLASS_MESSAGES.MIN_EXCEEDS_MAX).toContain("Minimum cannot exceed maximum");
    });

    it("should have invalid percentage message", () => {
      expect(ASSET_CLASS_MESSAGES.INVALID_PERCENTAGE).toBeDefined();
    });
  });

  // ==========================================================================
  // SUBCLASS VALIDATION SCHEMA TESTS (Story 4.2)
  // ==========================================================================

  describe("Subclass Constants", () => {
    it("should have correct subclass limit", () => {
      expect(MAX_SUBCLASSES_PER_CLASS).toBe(10);
    });
  });

  describe("createSubclassSchema", () => {
    it("should accept valid name (AC-4.2.2)", () => {
      const result = createSubclassSchema.safeParse({ name: "ETFs" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("ETFs");
      }
    });

    it("should trim whitespace from name", () => {
      const result = createSubclassSchema.safeParse({ name: "  ETFs  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("ETFs");
      }
    });

    it("should reject empty name", () => {
      const result = createSubclassSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only name", () => {
      const result = createSubclassSchema.safeParse({ name: "   " });
      expect(result.success).toBe(false);
    });

    it("should reject name exceeding 50 characters", () => {
      const longName = "a".repeat(51);
      const result = createSubclassSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it("should accept name with exactly 50 characters", () => {
      const name = "a".repeat(50);
      const result = createSubclassSchema.safeParse({ name });
      expect(result.success).toBe(true);
    });
  });

  describe("updateSubclassSchema", () => {
    it("should accept valid name update (AC-4.2.3)", () => {
      const result = updateSubclassSchema.safeParse({ name: "Index Funds" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Index Funds");
      }
    });

    it("should accept empty object (no updates)", () => {
      const result = updateSubclassSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from name", () => {
      const result = updateSubclassSchema.safeParse({
        name: "  Updated Name  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }
    });

    it("should reject name exceeding 50 characters", () => {
      const longName = "a".repeat(51);
      const result = updateSubclassSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    // ==========================================================================
    // SUBCLASS ALLOCATION RANGE VALIDATION TESTS (Story 4.4)
    // ==========================================================================

    describe("Subclass Allocation Range Validation (AC-4.4.1, AC-4.4.4)", () => {
      it("should accept valid allocation range (20.00, 30.00)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "20.00",
          targetMax: "30.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMin).toBe("20.00");
          expect(result.data.targetMax).toBe("30.00");
        }
      });

      it("should accept valid integer percentages (15, 25)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "15",
          targetMax: "25",
        });
        expect(result.success).toBe(true);
      });

      it("should accept boundary values (0.00, 100.00)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "0.00",
          targetMax: "100.00",
        });
        expect(result.success).toBe(true);
      });

      it("should accept single decimal place values (20.5, 30.5)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "20.5",
          targetMax: "30.5",
        });
        expect(result.success).toBe(true);
      });

      it("should accept equal min and max values (25.00, 25.00)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "25.00",
          targetMax: "25.00",
        });
        expect(result.success).toBe(true);
      });

      it("should reject min > max (40.00, 30.00) - AC-4.4.4", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "40.00",
          targetMax: "30.00",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.flatten().fieldErrors;
          expect(errors.targetMin).toBeDefined();
          expect(errors.targetMin?.[0]).toContain("Minimum cannot exceed maximum");
        }
      });

      it("should accept null targetMin (optional - flexible subclass)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: null,
          targetMax: "30.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMin).toBeNull();
        }
      });

      it("should accept null targetMax (optional - flexible subclass)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "20.00",
          targetMax: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMax).toBeNull();
        }
      });

      it("should accept both null values (flexible subclass - AC-4.4.5)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: null,
          targetMax: null,
        });
        expect(result.success).toBe(true);
      });

      it("should accept missing allocation fields", () => {
        const result = updateSubclassSchema.safeParse({
          name: "ETFs",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetMin).toBeUndefined();
          expect(result.data.targetMax).toBeUndefined();
        }
      });

      it("should reject invalid percentage format (abc)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "abc",
          targetMax: "30.00",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative percentage (-10)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "-10",
          targetMax: "30.00",
        });
        expect(result.success).toBe(false);
      });

      it("should reject percentage over 100 (120)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "20.00",
          targetMax: "120.00",
        });
        expect(result.success).toBe(false);
      });

      it("should reject more than 2 decimal places (20.123)", () => {
        const result = updateSubclassSchema.safeParse({
          targetMin: "20.123",
          targetMax: "30.00",
        });
        expect(result.success).toBe(false);
      });

      it("should allow combining name and allocation range updates", () => {
        const result = updateSubclassSchema.safeParse({
          name: "ETFs",
          targetMin: "20.00",
          targetMax: "30.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("ETFs");
          expect(result.data.targetMin).toBe("20.00");
          expect(result.data.targetMax).toBe("30.00");
        }
      });
    });

    // ==========================================================================
    // SUBCLASS MAX ASSETS VALIDATION TESTS (Story 4.5)
    // ==========================================================================

    describe("Subclass Max Assets Validation (AC-4.5.1, AC-4.5.5)", () => {
      it("should accept valid maxAssets value (5)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: 5 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(5);
        }
      });

      it("should accept maxAssets = 0 (no limit)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: 0 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(0);
        }
      });

      it("should accept maxAssets = 100 (upper boundary)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: 100 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBe(100);
        }
      });

      it("should accept null maxAssets (no limit)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: null });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBeNull();
        }
      });

      it("should accept undefined maxAssets (no change)", () => {
        const result = updateSubclassSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.maxAssets).toBeUndefined();
        }
      });

      it("should reject negative maxAssets (-1)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: -1 });
        expect(result.success).toBe(false);
      });

      it("should reject maxAssets over 100 (101)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: 101 });
        expect(result.success).toBe(false);
      });

      it("should reject non-integer maxAssets (5.5)", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: 5.5 });
        expect(result.success).toBe(false);
      });

      it("should reject string maxAssets ('abc')", () => {
        const result = updateSubclassSchema.safeParse({ maxAssets: "abc" });
        expect(result.success).toBe(false);
      });

      it("should allow combining name, allocation range, and maxAssets updates", () => {
        const result = updateSubclassSchema.safeParse({
          name: "ETFs",
          targetMin: "20.00",
          targetMax: "30.00",
          maxAssets: 8,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("ETFs");
          expect(result.data.targetMin).toBe("20.00");
          expect(result.data.targetMax).toBe("30.00");
          expect(result.data.maxAssets).toBe(8);
        }
      });
    });

    // ==========================================================================
    // SUBCLASS MIN ALLOCATION VALUE VALIDATION TESTS (Story 4.6)
    // ==========================================================================

    describe("Subclass Min Allocation Value Validation (AC-4.6.1, AC-4.6.4)", () => {
      it("should accept valid minAllocationValue (100)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "100" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("100");
        }
      });

      it("should accept minAllocationValue with decimals (100.50)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "100.50" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("100.50");
        }
      });

      it("should accept minAllocationValue = 0 (no minimum)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "0" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("0");
        }
      });

      it("should accept minAllocationValue = 1000000 (upper boundary)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "1000000" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("1000000");
        }
      });

      it("should accept minAllocationValue with up to 4 decimal places (100.1234)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "100.1234" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBe("100.1234");
        }
      });

      it("should accept null minAllocationValue (no minimum)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: null });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBeNull();
        }
      });

      it("should accept undefined minAllocationValue (no change)", () => {
        const result = updateSubclassSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.minAllocationValue).toBeUndefined();
        }
      });

      it("should reject negative minAllocationValue (-1)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "-1" });
        expect(result.success).toBe(false);
      });

      it("should reject minAllocationValue over 1000000 (1000001)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "1000001" });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric minAllocationValue (abc)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "abc" });
        expect(result.success).toBe(false);
      });

      it("should reject minAllocationValue with more than 4 decimal places (100.12345)", () => {
        const result = updateSubclassSchema.safeParse({ minAllocationValue: "100.12345" });
        expect(result.success).toBe(false);
      });

      it("should allow combining all fields including minAllocationValue", () => {
        const result = updateSubclassSchema.safeParse({
          name: "ETFs",
          targetMin: "20.00",
          targetMax: "30.00",
          maxAssets: 8,
          minAllocationValue: "250",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("ETFs");
          expect(result.data.targetMin).toBe("20.00");
          expect(result.data.targetMax).toBe("30.00");
          expect(result.data.maxAssets).toBe(8);
          expect(result.data.minAllocationValue).toBe("250");
        }
      });
    });
  });

  describe("deleteSubclassQuerySchema", () => {
    it("should parse force=true", () => {
      const result = deleteSubclassQuerySchema.safeParse({ force: "true" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(true);
      }
    });

    it("should parse force=false", () => {
      const result = deleteSubclassQuerySchema.safeParse({ force: "false" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });

    it("should default to false when force not provided", () => {
      const result = deleteSubclassQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });

    it("should treat non-'true' values as false", () => {
      const result = deleteSubclassQuerySchema.safeParse({ force: "yes" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });
  });

  describe("SUBCLASS_MESSAGES", () => {
    it("should have required error messages", () => {
      expect(SUBCLASS_MESSAGES.NAME_REQUIRED).toBeDefined();
      expect(SUBCLASS_MESSAGES.NAME_TOO_LONG).toBeDefined();
      expect(SUBCLASS_MESSAGES.LIMIT_REACHED).toBeDefined();
      expect(SUBCLASS_MESSAGES.NOT_FOUND).toBeDefined();
      expect(SUBCLASS_MESSAGES.CLASS_NOT_FOUND).toBeDefined();
      expect(SUBCLASS_MESSAGES.HAS_ASSETS).toBeDefined();
    });

    it("should include max length in NAME_TOO_LONG message", () => {
      expect(SUBCLASS_MESSAGES.NAME_TOO_LONG).toContain("50");
    });

    it("should include max count in LIMIT_REACHED message", () => {
      expect(SUBCLASS_MESSAGES.LIMIT_REACHED).toContain("10");
    });

    // Subclass allocation range messages (Story 4.4)
    it("should have subclass allocation range error messages (AC-4.4.4)", () => {
      expect(SUBCLASS_MESSAGES.MIN_EXCEEDS_MAX).toBeDefined();
      expect(SUBCLASS_MESSAGES.MIN_EXCEEDS_MAX).toContain("Minimum cannot exceed maximum");
    });

    it("should have invalid percentage message for subclass", () => {
      expect(SUBCLASS_MESSAGES.INVALID_PERCENTAGE).toBeDefined();
    });
  });
});
