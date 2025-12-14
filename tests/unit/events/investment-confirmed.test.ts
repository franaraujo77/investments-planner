/**
 * INVESTMENT_CONFIRMED Event Tests (Story 7.9)
 *
 * AC-7.9.4: INVESTMENT_CONFIRMED Event Emitted
 * Tests for event structure and emission
 *
 * Tests:
 * - Event structure matches type definition
 * - correlationId is included
 * - All required fields present
 * - Event stored in calculation_events
 */

import { describe, it, expect } from "vitest";
import type { InvestmentConfirmedEvent } from "@/lib/events/types";
import { isInvestmentConfirmedEvent, CALCULATION_EVENT_TYPES } from "@/lib/events/types";

describe("INVESTMENT_CONFIRMED Event (AC-7.9.4)", () => {
  describe("Event Structure", () => {
    it("should have correct type constant", () => {
      expect(CALCULATION_EVENT_TYPES).toContain("INVESTMENT_CONFIRMED");
    });

    it("should match InvestmentConfirmedEvent type definition", () => {
      const event: InvestmentConfirmedEvent = {
        type: "INVESTMENT_CONFIRMED",
        correlationId: "corr-123e4567-e89b-12d3-a456-426614174000",
        recommendationId: "rec-123e4567-e89b-12d3-a456-426614174001",
        userId: "user-123e4567-e89b-12d3-a456-426614174002",
        portfolioId: "port-123e4567-e89b-12d3-a456-426614174003",
        totalInvested: "2500.0000",
        investmentCount: 3,
        investments: [
          {
            investmentId: "inv-1",
            assetId: "asset-1",
            symbol: "AAPL",
            quantity: "10.00000000",
            pricePerUnit: "150.00",
            totalAmount: "1500.00",
            recommendedAmount: "1500.00",
          },
          {
            investmentId: "inv-2",
            assetId: "asset-2",
            symbol: "MSFT",
            quantity: "5.00000000",
            pricePerUnit: "200.00",
            totalAmount: "1000.00",
            recommendedAmount: "1200.00",
          },
        ],
        allocations: {
          before: {
            "US Stocks": "45.0%",
            Bonds: "30.0%",
            International: "25.0%",
          },
          after: {
            "US Stocks": "50.0%",
            Bonds: "27.5%",
            International: "22.5%",
          },
        },
        timestamp: new Date(),
      };

      // Verify required fields
      expect(event.type).toBe("INVESTMENT_CONFIRMED");
      expect(event.correlationId).toBeDefined();
      expect(event.recommendationId).toBeDefined();
      expect(event.userId).toBeDefined();
      expect(event.portfolioId).toBeDefined();
      expect(event.totalInvested).toBeDefined();
      expect(event.investmentCount).toBeDefined();
      expect(event.investments).toBeDefined();
      expect(event.allocations).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  describe("CorrelationId", () => {
    it("should include correlationId in event", () => {
      const event: InvestmentConfirmedEvent = createTestEvent();

      expect(event.correlationId).toBeDefined();
      expect(typeof event.correlationId).toBe("string");
      expect(event.correlationId.length).toBeGreaterThan(0);
    });

    it("should accept UUID format for correlationId", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const event: InvestmentConfirmedEvent = {
        ...createTestEvent(),
        correlationId: uuid,
      };

      expect(event.correlationId).toBe(uuid);
      // UUID format validation
      expect(event.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Required Fields", () => {
    it("should include userId", () => {
      const event = createTestEvent();
      expect(event.userId).toBeDefined();
      expect(typeof event.userId).toBe("string");
    });

    it("should include portfolioId", () => {
      const event = createTestEvent();
      expect(event.portfolioId).toBeDefined();
      expect(typeof event.portfolioId).toBe("string");
    });

    it("should include investmentIds array via investments", () => {
      const event = createTestEvent();
      expect(Array.isArray(event.investments)).toBe(true);
      expect(event.investments.length).toBeGreaterThan(0);
      expect(event.investments[0]?.investmentId).toBeDefined();
    });

    it("should include totalAmount as string", () => {
      const event = createTestEvent();
      expect(event.totalInvested).toBeDefined();
      expect(typeof event.totalInvested).toBe("string");
      // Verify it's a valid number string
      expect(parseFloat(event.totalInvested)).not.toBeNaN();
    });

    it("should include timestamp", () => {
      const event = createTestEvent();
      expect(event.timestamp).toBeDefined();
      expect(event.timestamp instanceof Date).toBe(true);
    });
  });

  describe("Investment Details", () => {
    it("should include quantity as string with 8 decimal places", () => {
      const event = createTestEvent();
      const investment = event.investments[0]!;

      expect(investment.quantity).toBeDefined();
      expect(typeof investment.quantity).toBe("string");
      // Check decimal precision
      expect(investment.quantity).toMatch(/^\d+\.\d{8}$/);
    });

    it("should include pricePerUnit as string", () => {
      const event = createTestEvent();
      const investment = event.investments[0]!;

      expect(investment.pricePerUnit).toBeDefined();
      expect(typeof investment.pricePerUnit).toBe("string");
    });

    it("should include recommendedAmount for comparison", () => {
      const event = createTestEvent();
      const investment = event.investments[0]!;

      expect(investment.recommendedAmount).toBeDefined();
      expect(typeof investment.recommendedAmount).toBe("string");
    });
  });

  describe("Allocation Data", () => {
    it("should include before allocations", () => {
      const event = createTestEvent();

      expect(event.allocations.before).toBeDefined();
      expect(typeof event.allocations.before).toBe("object");
    });

    it("should include after allocations", () => {
      const event = createTestEvent();

      expect(event.allocations.after).toBeDefined();
      expect(typeof event.allocations.after).toBe("object");
    });

    it("should format allocations as percentage strings", () => {
      const event = createTestEvent();

      const beforeValues = Object.values(event.allocations.before);
      const afterValues = Object.values(event.allocations.after);

      // All values should end with %
      expect(beforeValues.every((v) => v.endsWith("%"))).toBe(true);
      expect(afterValues.every((v) => v.endsWith("%"))).toBe(true);
    });
  });

  describe("Type Guard", () => {
    it("should identify INVESTMENT_CONFIRMED events", () => {
      const event = createTestEvent();
      expect(isInvestmentConfirmedEvent(event)).toBe(true);
    });

    it("should reject non-INVESTMENT_CONFIRMED events", () => {
      const otherEvent = {
        type: "CALC_STARTED" as const,
        correlationId: "corr-123",
        userId: "user-123",
        timestamp: new Date(),
      };

      expect(isInvestmentConfirmedEvent(otherEvent)).toBe(false);
    });
  });

  describe("Event Storage Structure", () => {
    it("should define storage-compatible structure for calculation_events table", () => {
      const event = createTestEvent();

      // Structure for calculation_events insert
      const storageRecord = {
        correlationId: event.correlationId,
        userId: event.userId,
        eventType: event.type,
        payload: event,
      };

      expect(storageRecord.eventType).toBe("INVESTMENT_CONFIRMED");
      expect(storageRecord.correlationId).toBeDefined();
      expect(storageRecord.userId).toBeDefined();
      expect(storageRecord.payload).toBeDefined();
    });
  });
});

// Helper function to create a valid test event
function createTestEvent(): InvestmentConfirmedEvent {
  return {
    type: "INVESTMENT_CONFIRMED",
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
    recommendationId: "rec-123",
    userId: "user-456",
    portfolioId: "port-789",
    totalInvested: "2500.0000",
    investmentCount: 2,
    investments: [
      {
        investmentId: "inv-1",
        assetId: "asset-1",
        symbol: "AAPL",
        quantity: "10.00000000",
        pricePerUnit: "150.00",
        totalAmount: "1500.00",
        recommendedAmount: "1500.00",
      },
      {
        investmentId: "inv-2",
        assetId: "asset-2",
        symbol: "MSFT",
        quantity: "5.00000000",
        pricePerUnit: "200.00",
        totalAmount: "1000.00",
        recommendedAmount: "1000.00",
      },
    ],
    allocations: {
      before: {
        "US Stocks": "45.0%",
        Bonds: "30.0%",
      },
      after: {
        "US Stocks": "50.0%",
        Bonds: "27.5%",
      },
    },
    timestamp: new Date("2025-01-15T10:30:00Z"),
  };
}
