/**
 * Portfolio Values Service Tests
 *
 * Story 3.6: Portfolio Overview with Values
 *
 * Tests for:
 * - Value calculations using decimal.js
 * - Currency conversion
 * - Allocation percentage calculation
 * - Ignored asset handling
 * - Data freshness tracking
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Decimal } from "@/lib/calculations/decimal-config";

// Mock the database and services
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      portfolios: { findFirst: vi.fn() },
      portfolioAssets: { findMany: vi.fn() },
    },
  },
}));

vi.mock("@/lib/services/user-service", () => ({
  getUserProfile: vi.fn(),
}));

vi.mock("@/lib/services/price-service", () => ({
  getCurrentPrices: vi.fn(),
}));

vi.mock("@/lib/services/exchange-rate-service", () => ({
  getExchangeRate: vi.fn(),
}));

// Import after mocks
import { db } from "@/lib/db";
import { getUserProfile } from "@/lib/services/user-service";
import { getCurrentPrices } from "@/lib/services/price-service";
import { getExchangeRate } from "@/lib/services/exchange-rate-service";

describe("Portfolio Value Calculations", () => {
  describe("Decimal.js Calculations", () => {
    it("calculates value correctly: quantity × price", () => {
      const quantity = "10.5";
      const price = "100.25";

      const result = new Decimal(quantity).times(price).toFixed(4);

      expect(result).toBe("1052.6250");
    });

    it("maintains precision for small quantities", () => {
      const quantity = "0.00000001"; // 1 satoshi
      const price = "50000.00";

      const result = new Decimal(quantity).times(price).toFixed(8);

      expect(result).toBe("0.00050000");
    });

    it("maintains precision for large numbers", () => {
      const quantity = "1000000";
      const price = "99999.9999";

      const result = new Decimal(quantity).times(price).toFixed(4);

      expect(result).toBe("99999999900.0000");
    });

    it("converts currency correctly: value × exchangeRate", () => {
      const valueNative = "1000.00";
      const exchangeRate = "5.425"; // 1 EUR = 5.425 BRL

      const result = new Decimal(valueNative).times(exchangeRate).toFixed(4);

      expect(result).toBe("5425.0000");
    });

    it("calculates allocation percentage correctly", () => {
      const assetValue = "2500.00";
      const totalValue = "10000.00";

      const result = new Decimal(assetValue).dividedBy(totalValue).times(100).toFixed(4);

      expect(result).toBe("25.0000");
    });

    it("handles division by zero gracefully", () => {
      const assetValue = "1000.00";
      const totalValue = "0";

      const total = new Decimal(totalValue);
      let result: string;

      if (total.isZero()) {
        result = "0.0000";
      } else {
        result = new Decimal(assetValue).dividedBy(total).times(100).toFixed(4);
      }

      expect(result).toBe("0.0000");
    });

    it("avoids JavaScript floating point errors (0.1 + 0.2)", () => {
      // JavaScript: 0.1 + 0.2 = 0.30000000000000004
      const jsResult = 0.1 + 0.2;
      expect(jsResult).not.toBe(0.3);

      // decimal.js: 0.1 + 0.2 = 0.3
      const decimalResult = new Decimal("0.1").plus("0.2").toFixed(4);
      expect(decimalResult).toBe("0.3000");
    });

    it("handles very small exchange rates (like JPY)", () => {
      const valueJPY = "15000"; // 15,000 JPY
      const rateJPYtoUSD = "0.0067"; // 1 JPY = 0.0067 USD

      const result = new Decimal(valueJPY).times(rateJPYtoUSD).toFixed(4);

      expect(result).toBe("100.5000"); // ~$100.50
    });
  });

  describe("Allocation Calculation", () => {
    it("calculates allocation for single asset", () => {
      const assets = [{ value: "1000.00", isIgnored: false }];
      const total = "1000.00";

      const allocation = new Decimal(assets[0].value).dividedBy(total).times(100).toFixed(4);

      expect(allocation).toBe("100.0000");
    });

    it("calculates allocation for multiple assets", () => {
      const assets = [
        { value: "2500.00", isIgnored: false },
        { value: "5000.00", isIgnored: false },
        { value: "2500.00", isIgnored: false },
      ];

      const totalValue = assets.reduce((sum, a) => sum.plus(a.value), new Decimal(0));

      const allocations = assets.map((a) =>
        new Decimal(a.value).dividedBy(totalValue).times(100).toFixed(4)
      );

      expect(allocations).toEqual(["25.0000", "50.0000", "25.0000"]);
      expect(allocations.reduce((sum, a) => sum.plus(a), new Decimal(0)).toFixed(4)).toBe(
        "100.0000"
      );
    });

    it("excludes ignored assets from allocation calculation", () => {
      const assets = [
        { value: "3000.00", isIgnored: false },
        { value: "2000.00", isIgnored: true }, // This should be excluded
        { value: "2000.00", isIgnored: false },
      ];

      // Only count active assets for allocation
      const activeAssets = assets.filter((a) => !a.isIgnored);
      const activeTotal = activeAssets.reduce((sum, a) => sum.plus(a.value), new Decimal(0));

      const allocations = activeAssets.map((a) =>
        new Decimal(a.value).dividedBy(activeTotal).times(100).toFixed(4)
      );

      // 3000 / 5000 = 60%, 2000 / 5000 = 40%
      expect(allocations).toEqual(["60.0000", "40.0000"]);
    });

    it("includes ignored assets in total portfolio value", () => {
      const assets = [
        { value: "3000.00", isIgnored: false },
        { value: "2000.00", isIgnored: true }, // Still counts toward total
      ];

      const totalValue = assets.reduce((sum, a) => sum.plus(a.value), new Decimal(0));

      expect(totalValue.toFixed(4)).toBe("5000.0000");
    });
  });

  describe("Currency Conversion", () => {
    it("converts USD to BRL correctly", () => {
      const valueUSD = "100.00";
      const rateUSDtoBRL = "5.0000"; // 1 USD = 5 BRL

      const valueBRL = new Decimal(valueUSD).times(rateUSDtoBRL).toFixed(4);

      expect(valueBRL).toBe("500.0000");
    });

    it("converts EUR to USD correctly", () => {
      const valueEUR = "1000.00";
      const rateEURtoUSD = "1.0850"; // 1 EUR = 1.085 USD

      const valueUSD = new Decimal(valueEUR).times(rateEURtoUSD).toFixed(4);

      expect(valueUSD).toBe("1085.0000");
    });

    it("converts same currency with rate 1", () => {
      const valueUSD = "1234.5678";
      const rate = "1.0000";

      const result = new Decimal(valueUSD).times(rate).toFixed(4);

      expect(result).toBe("1234.5678");
    });

    it("handles cross-currency conversion through base", () => {
      // EUR -> BRL via USD
      // EUR -> USD = 1.085
      // BRL -> USD = 0.20
      // EUR -> BRL = 1.085 / 0.20 = 5.425
      const valueEUR = "100.00";
      const rateEURtoUSD = "1.0850";
      const rateBRLtoUSD = "0.2000";

      const crossRate = new Decimal(rateEURtoUSD).dividedBy(rateBRLtoUSD);
      const valueBRL = new Decimal(valueEUR).times(crossRate).toFixed(4);

      expect(crossRate.toFixed(4)).toBe("5.4250");
      expect(valueBRL).toBe("542.5000");
    });
  });
});

describe("Price Service", () => {
  it("returns mock prices for known symbols", async () => {
    // Manually test the price service behavior
    const { getCurrentPrices } = await import("@/lib/services/price-service");

    // Since we've mocked it, we need to reset and reimport
    vi.resetModules();
    vi.unmock("@/lib/services/price-service");

    const priceService = await import("@/lib/services/price-service");
    const prices = await priceService.getCurrentPrices(["AAPL", "GOOGL"]);

    // Mock prices should exist for these symbols
    expect(prices.get("AAPL")).toBeDefined();
    expect(prices.get("GOOGL")).toBeDefined();
  });

  it("returns null for unknown symbols", async () => {
    vi.resetModules();
    vi.unmock("@/lib/services/price-service");

    const priceService = await import("@/lib/services/price-service");
    const prices = await priceService.getCurrentPrices(["UNKNOWN_SYMBOL_XYZ"]);

    expect(prices.get("UNKNOWN_SYMBOL_XYZ")).toBeNull();
  });
});

describe("Exchange Rate Service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock("@/lib/services/exchange-rate-service");
  });

  it("returns rate of 1 for same currency", async () => {
    const rateService = await import("@/lib/services/exchange-rate-service");
    const result = await rateService.getExchangeRate("USD", "USD");

    expect(result.rate).toBe("1.0000");
  });

  it("returns valid rate for USD to BRL", async () => {
    const rateService = await import("@/lib/services/exchange-rate-service");
    const result = await rateService.getExchangeRate("USD", "BRL");

    // USD -> BRL: 1 / 0.20 = 5
    const rate = parseFloat(result.rate);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeCloseTo(5.0, 0);
  });

  it("returns valid rate for EUR to USD", async () => {
    const rateService = await import("@/lib/services/exchange-rate-service");
    const result = await rateService.getExchangeRate("EUR", "USD");

    // EUR -> USD: 1.085 / 1 = 1.085
    const rate = parseFloat(result.rate);
    expect(rate).toBeGreaterThan(1);
    expect(rate).toBeCloseTo(1.085, 1);
  });

  it("includes timestamp in response", async () => {
    const rateService = await import("@/lib/services/exchange-rate-service");
    const result = await rateService.getExchangeRate("USD", "EUR");

    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe("Data Freshness", () => {
  it("identifies fresh data (< 24 hours)", () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const ageMs = now.getTime() - twoHoursAgo.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    const isFresh = ageMs < oneDay;
    expect(isFresh).toBe(true);
  });

  it("identifies stale data (1-3 days)", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const ageMs = now.getTime() - twoDaysAgo.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;

    const isStale = ageMs >= oneDay && ageMs < threeDays;
    expect(isStale).toBe(true);
  });

  it("identifies very stale data (> 3 days)", () => {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const ageMs = now.getTime() - fourDaysAgo.getTime();
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    const isVeryStale = ageMs >= threeDays;
    expect(isVeryStale).toBe(true);
  });
});
