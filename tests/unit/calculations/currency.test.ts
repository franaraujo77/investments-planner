/**
 * Currency Calculation Tests
 *
 * Story 3.6: Portfolio Overview with Values
 *
 * Tests for:
 * - Currency formatting
 * - Currency symbol lookup
 * - Exchange rate calculations
 * - Decimal precision
 */

import { describe, expect, it } from "vitest";
import { Decimal } from "@/lib/calculations/decimal-config";
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  getCurrencySymbol,
  isSupportedCurrency,
} from "@/lib/services/exchange-rate-service";

describe("Currency Symbols", () => {
  it("returns correct symbol for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns correct symbol for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns correct symbol for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns correct symbol for BRL", () => {
    expect(getCurrencySymbol("BRL")).toBe("R$");
  });

  it("returns correct symbol for CAD", () => {
    expect(getCurrencySymbol("CAD")).toBe("C$");
  });

  it("returns correct symbol for AUD", () => {
    expect(getCurrencySymbol("AUD")).toBe("A$");
  });

  it("returns correct symbol for JPY", () => {
    expect(getCurrencySymbol("JPY")).toBe("¥");
  });

  it("returns correct symbol for CHF", () => {
    expect(getCurrencySymbol("CHF")).toBe("CHF");
  });

  it("returns currency code for unsupported currency", () => {
    expect(getCurrencySymbol("XXX")).toBe("XXX");
  });
});

describe("Supported Currencies", () => {
  it("includes all required currencies", () => {
    const required = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"];
    for (const currency of required) {
      expect(SUPPORTED_CURRENCIES).toContain(currency);
    }
  });

  it("validates supported currencies correctly", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("BRL")).toBe(true);
  });

  it("rejects unsupported currencies", () => {
    expect(isSupportedCurrency("XXX")).toBe(false);
    expect(isSupportedCurrency("ABC")).toBe(false);
    expect(isSupportedCurrency("usd")).toBe(false); // Case sensitive
  });

  it("has symbols for all supported currencies", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_SYMBOLS[currency]).toBeDefined();
    }
  });
});

describe("Currency Formatting", () => {
  it("formats USD correctly", () => {
    const value = 1234.56;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

    expect(formatted).toBe("$1,234.56");
  });

  it("formats EUR correctly", () => {
    const value = 1234.56;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value);

    // In en-US locale, EUR shows as €1,234.56
    expect(formatted).toContain("€");
    expect(formatted).toContain("1,234.56");
  });

  it("formats JPY without decimals", () => {
    const value = 15000;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "JPY",
    }).format(value);

    expect(formatted).toContain("¥");
    expect(formatted).toContain("15,000");
  });

  it("formats large numbers correctly", () => {
    const value = 1234567.89;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

    expect(formatted).toBe("$1,234,567.89");
  });

  it("formats small numbers correctly", () => {
    const value = 0.01;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

    expect(formatted).toBe("$0.01");
  });
});

describe("Decimal.js Configuration", () => {
  it("uses precision of 20", () => {
    // Verify configured precision handles large calculations
    const large1 = new Decimal("12345678901234567890");
    const large2 = new Decimal("2");
    const result = large1.times(large2);

    expect(result.toString()).toBe("24691357802469135780");
  });

  it("uses ROUND_HALF_UP rounding", () => {
    // ROUND_HALF_UP: rounds towards nearest neighbor, ties round up
    const value1 = new Decimal("1.235");
    const value2 = new Decimal("1.234");

    // Round to 2 decimal places
    expect(value1.toFixed(2)).toBe("1.24"); // 5 rounds up
    expect(value2.toFixed(2)).toBe("1.23"); // 4 rounds down
  });

  it("handles crypto satoshi precision", () => {
    // Bitcoin has 8 decimal places (satoshis)
    const btcQuantity = new Decimal("0.00000001"); // 1 satoshi
    const btcPrice = new Decimal("50000.00");

    const value = btcQuantity.times(btcPrice);
    expect(value.toFixed(8)).toBe("0.00050000");
  });

  it("maintains precision in complex calculations", () => {
    // Complex multi-step calculation
    const quantity = new Decimal("123.45678901");
    const price = new Decimal("9876.54321");
    const rate = new Decimal("0.1234567890");

    const nativeValue = quantity.times(price);
    const baseValue = nativeValue.times(rate);

    // Verify precision is maintained - calculated actual values
    expect(nativeValue.toFixed(8)).toBe("1219326.31122512");
    expect(baseValue.toFixed(8)).toBe("150534.11112707");
  });
});

describe("Value Calculations with Decimal.js", () => {
  it("calculates portfolio asset value correctly", () => {
    const quantity = "100";
    const price = "150.50";

    const value = new Decimal(quantity).times(price);
    expect(value.toFixed(2)).toBe("15050.00");
  });

  it("calculates converted value correctly", () => {
    const valueNative = "1000.00";
    const exchangeRate = "0.85"; // 1 USD = 0.85 EUR

    const valueBase = new Decimal(valueNative).times(exchangeRate);
    expect(valueBase.toFixed(4)).toBe("850.0000");
  });

  it("calculates allocation percentage correctly", () => {
    const assetValue = "2500.00";
    const portfolioTotal = "10000.00";

    const allocation = new Decimal(assetValue).dividedBy(portfolioTotal).times(100);

    expect(allocation.toFixed(4)).toBe("25.0000");
  });

  it("sums multiple asset values correctly", () => {
    const values = ["1000.00", "2500.50", "3749.50"];

    const total = values.reduce((sum, val) => sum.plus(val), new Decimal(0));

    expect(total.toFixed(2)).toBe("7250.00");
  });

  it("handles zero values gracefully", () => {
    const quantity = "0";
    const price = "100.00";

    const value = new Decimal(quantity).times(price);
    expect(value.toFixed(2)).toBe("0.00");
    expect(value.isZero()).toBe(true);
  });

  it("handles negative values (not allowed but handles gracefully)", () => {
    // In our app we validate positive values, but decimal.js handles negatives
    const quantity = "-10";
    const price = "100.00";

    const value = new Decimal(quantity).times(price);
    expect(value.toFixed(2)).toBe("-1000.00");
    expect(value.isNegative()).toBe(true);
  });
});

describe("Exchange Rate Calculations", () => {
  it("calculates same currency rate as 1", () => {
    const rate = "1.0000";
    const value = "1234.5678";

    const converted = new Decimal(value).times(rate);
    expect(converted.toFixed(4)).toBe("1234.5678");
  });

  it("calculates cross rate correctly", () => {
    // EUR -> USD = 1.085
    // BRL -> USD = 0.20
    // EUR -> BRL = 1.085 / 0.20 = 5.425
    const eurToUsd = new Decimal("1.085");
    const brlToUsd = new Decimal("0.20");

    const eurToBrl = eurToUsd.dividedBy(brlToUsd);
    expect(eurToBrl.toFixed(4)).toBe("5.4250");
  });

  it("converts portfolio value to different currency", () => {
    const portfolioValueUSD = "50000.00";
    const usdToBRL = "5.0";

    const portfolioValueBRL = new Decimal(portfolioValueUSD).times(usdToBRL);
    expect(portfolioValueBRL.toFixed(2)).toBe("250000.00");
  });

  it("handles very small exchange rates (JPY)", () => {
    // 1 JPY = 0.0067 USD (approx)
    const jpyToUsd = "0.0067";
    const valueJPY = "1000000"; // 1 million yen

    const valueUSD = new Decimal(valueJPY).times(jpyToUsd);
    expect(valueUSD.toFixed(2)).toBe("6700.00"); // ~$6,700
  });
});
