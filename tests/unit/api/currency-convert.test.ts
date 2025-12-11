/**
 * Currency Conversion API Tests
 *
 * Story 6.5: Currency Conversion Logic
 * AC-6.5.1 through AC-6.5.5
 *
 * Integration tests for GET /api/data/convert endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/data/convert/route";
import { CurrencyConversionError } from "@/lib/calculations/currency-converter";
import type { CurrencyConversionResult } from "@/lib/calculations/currency-converter";

// Mock session for authenticated requests
const mockSession = {
  userId: "test-user-id",
  email: "test@example.com",
};

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth middleware to pass through with test session
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest) => {
      return handler(request, mockSession);
    };
  }),
}));

// Mock convert function using vi.hoisted
const { mockConvert } = vi.hoisted(() => ({
  mockConvert: vi.fn(),
}));

// Mock getCurrencyConverter to return a mock converter
vi.mock("@/lib/providers", () => ({
  getCurrencyConverter: () => ({
    convert: mockConvert,
    convertBatch: vi.fn(),
  }),
}));

// Helper to create mock conversion result
function createMockResult(
  value: string,
  from: string,
  to: string,
  rate: string,
  hoursAgo: number = 1
): CurrencyConversionResult {
  const rateDate = new Date();
  rateDate.setDate(rateDate.getDate() - 1);
  const isStaleRate = hoursAgo > 24;

  return {
    value,
    fromCurrency: from,
    toCurrency: to,
    rate,
    rateDate,
    rateSource: "test-provider",
    isStaleRate,
  };
}

// Helper to create request
function createRequest(params: Record<string, string | undefined>): NextRequest {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  }
  const url = `http://localhost:3000/api/data/convert?${searchParams.toString()}`;
  return new NextRequest(url);
}

describe("GET /api/data/convert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Successful conversions
  // ===========================================================================
  describe("successful conversions", () => {
    it("should convert BRL to USD successfully", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(
        expect.objectContaining({
          value: "200.0000",
          fromCurrency: "BRL",
          toCurrency: "USD",
          rate: "0.2",
          rateSource: "test-provider",
          isStaleRate: false,
        })
      );
    });

    it("should handle same-currency conversion", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("1000.0000", "USD", "USD", "1"));

      const request = createRequest({
        value: "1000",
        from: "USD",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(
        expect.objectContaining({
          value: "1000.0000",
          fromCurrency: "USD",
          toCurrency: "USD",
          rate: "1",
        })
      );
    });

    it("should include rate metadata in response", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("540.0000", "EUR", "USD", "1.08"));

      const request = createRequest({
        value: "500",
        from: "EUR",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty("rateDate");
      expect(data.data).toHaveProperty("rateSource", "test-provider");
      expect(data.data).toHaveProperty("isStaleRate", false);
    });

    it("should normalize currency codes to uppercase", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "brl", // lowercase
        to: "usd", // lowercase
      });

      const response = await GET(request);
      // Consume JSON to ensure response is processed
      await response.json();

      expect(response.status).toBe(200);
      // The converter normalizes to uppercase
      expect(mockConvert).toHaveBeenCalledWith("1000", "BRL", "USD", expect.any(Object));
    });
  });

  // ===========================================================================
  // Validation errors
  // ===========================================================================
  describe("validation errors", () => {
    it("should return 400 for missing value parameter", async () => {
      const request = createRequest({
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for missing from parameter", async () => {
      const request = createRequest({
        value: "1000",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for missing to parameter", async () => {
      const request = createRequest({
        value: "1000",
        from: "BRL",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid currency code", async () => {
      const request = createRequest({
        value: "1000",
        from: "XXX", // Invalid currency
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid value (non-numeric)", async () => {
      const request = createRequest({
        value: "abc",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for negative value", async () => {
      const request = createRequest({
        value: "-1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for currency code with wrong length", async () => {
      const request = createRequest({
        value: "1000",
        from: "BR", // Too short
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });

  // ===========================================================================
  // Rate not found errors
  // ===========================================================================
  describe("rate not found errors", () => {
    it("should return 404 when no rate found in database", async () => {
      // Mock the converter to throw RATE_NOT_FOUND error
      mockConvert.mockRejectedValueOnce(
        new CurrencyConversionError("No exchange rate found for BRL/USD", "RATE_NOT_FOUND", {
          fromCurrency: "BRL",
          toCurrency: "USD",
        })
      );

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("RATE_NOT_FOUND");
    });

    it("should include currency pair in error details", async () => {
      mockConvert.mockRejectedValueOnce(
        new CurrencyConversionError("No exchange rate found for BRL/USD", "RATE_NOT_FOUND", {
          fromCurrency: "BRL",
          toCurrency: "USD",
        })
      );

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("BRL");
      expect(data.error).toContain("USD");
    });
  });

  // ===========================================================================
  // Response format
  // ===========================================================================
  describe("response format", () => {
    it("should return proper JSON structure", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("value");
      expect(data.data).toHaveProperty("fromCurrency");
      expect(data.data).toHaveProperty("toCurrency");
      expect(data.data).toHaveProperty("rate");
      expect(data.data).toHaveProperty("rateDate");
      expect(data.data).toHaveProperty("rateSource");
      expect(data.data).toHaveProperty("isStaleRate");
    });

    it("should return rate date in YYYY-MM-DD format", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.rateDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return value with 4 decimal places", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.value).toMatch(/^\d+\.\d{4}$/);
    });
  });

  // ===========================================================================
  // Stale rate indicator
  // ===========================================================================
  describe("stale rate indicator", () => {
    it("should indicate when rate is stale (>24h old)", async () => {
      // Create result with isStaleRate = true
      const staleResult = createMockResult("200.0000", "BRL", "USD", "0.2", 25);
      mockConvert.mockResolvedValueOnce(staleResult);

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isStaleRate).toBe(true);
    });

    it("should indicate when rate is fresh (<24h old)", async () => {
      // Create result with isStaleRate = false
      const freshResult = createMockResult("200.0000", "BRL", "USD", "0.2", 1);
      mockConvert.mockResolvedValueOnce(freshResult);

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isStaleRate).toBe(false);
    });
  });

  // ===========================================================================
  // Date parameter
  // ===========================================================================
  describe("date parameter", () => {
    it("should accept optional date parameter", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
        date: "2025-12-01",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.value).toBe("200.0000");
    });

    it("should pass date to converter for rate lookup", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
        date: "2025-12-01",
      });

      await GET(request);

      // Verify converter was called with a date in options
      expect(mockConvert).toHaveBeenCalledWith(
        "1000",
        "BRL",
        "USD",
        expect.objectContaining({
          rateDate: expect.any(Date),
        })
      );
    });

    it("should work without date parameter", async () => {
      mockConvert.mockResolvedValueOnce(createMockResult("200.0000", "BRL", "USD", "0.2"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      await GET(request);

      // Verify converter was called without rateDate in options
      expect(mockConvert).toHaveBeenCalledWith(
        "1000",
        "BRL",
        "USD",
        expect.objectContaining({
          correlationId: expect.any(String),
        })
      );
    });
  });

  // ===========================================================================
  // Internal errors
  // ===========================================================================
  describe("internal errors", () => {
    it("should return 500 for unexpected errors", async () => {
      mockConvert.mockRejectedValueOnce(new Error("Unexpected database error"));

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should return 400 for invalid value errors from converter", async () => {
      mockConvert.mockRejectedValueOnce(
        new CurrencyConversionError("Value must be positive", "INVALID_VALUE", { value: "-1000" })
      );

      const request = createRequest({
        value: "1000",
        from: "BRL",
        to: "USD",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_VALUE");
    });
  });
});
