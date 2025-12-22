/**
 * Unit tests for Provider Configuration Validation
 *
 * Tests the startup validation functions that check provider API keys
 * and log appropriate warnings/errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the logger before importing the module
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the env utility
vi.mock("@/lib/utils/env", () => ({
  isEnvSet: vi.fn(),
}));

import {
  validateProviderConfig,
  logProviderConfigStatus,
  isUsingMockProviders,
  getProviderConfigSummary,
} from "@/lib/providers/validate-config";
import { logger } from "@/lib/telemetry/logger";
import { isEnvSet } from "@/lib/utils/env";

// =============================================================================
// Test Setup
// =============================================================================

describe("validate-config", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // =============================================================================
  // validateProviderConfig
  // =============================================================================

  describe("validateProviderConfig", () => {
    it("should detect when all required providers are configured", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        if (envVar === "EXCHANGE_RATE_API_KEY") return true;
        return false;
      });

      const result = validateProviderConfig();

      expect(result.usingMockProviders).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it("should detect when required providers are missing", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const result = validateProviderConfig();

      expect(result.usingMockProviders).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should include correct provider information in results", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        return false;
      });

      const result = validateProviderConfig();

      const geminiProvider = result.providers.find((p) => p.envVar === "GEMINI_API_KEY");
      const exchangeProvider = result.providers.find((p) => p.envVar === "EXCHANGE_RATE_API_KEY");

      expect(geminiProvider?.configured).toBe(true);
      expect(exchangeProvider?.configured).toBe(false);
    });

    it("should generate warnings only for missing required providers", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        // Only GEMINI configured, missing EXCHANGE_RATE
        if (envVar === "GEMINI_API_KEY") return true;
        return false;
      });

      const result = validateProviderConfig();

      // Should have warning for EXCHANGE_RATE_API_KEY (required)
      // Should NOT have warning for YAHOO_FINANCE_API_KEY (optional)
      expect(result.warnings.some((w) => w.includes("EXCHANGE_RATE_API_KEY"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("YAHOO_FINANCE_API_KEY"))).toBe(false);
    });

    it("should detect production environment", () => {
      process.env.NODE_ENV = "production";
      vi.mocked(isEnvSet).mockReturnValue(true);

      const result = validateProviderConfig();

      expect(result.isProduction).toBe(true);
    });

    it("should detect development environment", () => {
      process.env.NODE_ENV = "development";
      vi.mocked(isEnvSet).mockReturnValue(true);

      const result = validateProviderConfig();

      expect(result.isProduction).toBe(false);
    });

    it("should include all four provider configurations", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const result = validateProviderConfig();

      expect(result.providers).toHaveLength(4);
      expect(result.providers.map((p) => p.envVar)).toEqual([
        "GEMINI_API_KEY",
        "EXCHANGE_RATE_API_KEY",
        "YAHOO_FINANCE_API_KEY",
        "OPEN_EXCHANGE_RATES_APP_ID",
      ]);
    });

    it("should mark optional providers correctly", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const result = validateProviderConfig();

      const yahooProvider = result.providers.find((p) => p.envVar === "YAHOO_FINANCE_API_KEY");
      const oxrProvider = result.providers.find((p) => p.envVar === "OPEN_EXCHANGE_RATES_APP_ID");

      expect(yahooProvider?.required).toBe(false);
      expect(oxrProvider?.required).toBe(false);
    });

    it("should include getKeyUrl for each provider", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const result = validateProviderConfig();

      for (const provider of result.providers) {
        expect(provider.getKeyUrl).toBeDefined();
        expect(provider.getKeyUrl.startsWith("https://")).toBe(true);
      }
    });
  });

  // =============================================================================
  // logProviderConfigStatus
  // =============================================================================

  describe("logProviderConfigStatus", () => {
    it("should log error in production when using mock providers", () => {
      process.env.NODE_ENV = "production";
      vi.mocked(isEnvSet).mockReturnValue(false);

      logProviderConfigStatus();

      expect(logger.error).toHaveBeenCalledWith(
        "PRODUCTION USING MOCK PROVIDERS - Data refresh will return fake data",
        expect.objectContaining({
          action: "Set required API keys in environment variables",
        })
      );
    });

    it("should log info in development when using mock providers", () => {
      process.env.NODE_ENV = "development";
      vi.mocked(isEnvSet).mockReturnValue(false);

      logProviderConfigStatus();

      expect(logger.info).toHaveBeenCalledWith(
        "Development mode: Using mock providers",
        expect.any(Object)
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should log success when all required providers are configured", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        if (envVar === "EXCHANGE_RATE_API_KEY") return true;
        return false;
      });

      logProviderConfigStatus();

      expect(logger.info).toHaveBeenCalledWith(
        "All required data providers configured",
        expect.objectContaining({
          configuredProviders: expect.stringContaining("Gemini API"),
        })
      );
    });

    it("should include mock provider names in error log", () => {
      process.env.NODE_ENV = "production";
      vi.mocked(isEnvSet).mockReturnValue(false);

      logProviderConfigStatus();

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mockProviders: expect.stringContaining("Gemini API"),
        })
      );
    });

    it("should include configured provider names when some are set", () => {
      process.env.NODE_ENV = "production";
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        return false;
      });

      logProviderConfigStatus();

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          configuredProviders: "Gemini API",
          mockProviders: "ExchangeRate-API",
        })
      );
    });
  });

  // =============================================================================
  // isUsingMockProviders
  // =============================================================================

  describe("isUsingMockProviders", () => {
    it("should return true when required providers are missing", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const result = isUsingMockProviders();

      expect(result).toBe(true);
    });

    it("should return false when all required providers are configured", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        if (envVar === "EXCHANGE_RATE_API_KEY") return true;
        return false;
      });

      const result = isUsingMockProviders();

      expect(result).toBe(false);
    });

    it("should return false even if optional providers are missing", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        // Required providers set, optional not set
        if (envVar === "GEMINI_API_KEY") return true;
        if (envVar === "EXCHANGE_RATE_API_KEY") return true;
        return false;
      });

      const result = isUsingMockProviders();

      expect(result).toBe(false);
    });

    it("should return true if only one required provider is missing", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        // EXCHANGE_RATE_API_KEY is not set
        return false;
      });

      const result = isUsingMockProviders();

      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // getProviderConfigSummary
  // =============================================================================

  describe("getProviderConfigSummary", () => {
    it("should return correct summary when all providers are configured", () => {
      vi.mocked(isEnvSet).mockReturnValue(true);

      const summary = getProviderConfigSummary();

      expect(summary).toEqual({
        GEMINI_API_KEY: true,
        EXCHANGE_RATE_API_KEY: true,
        YAHOO_FINANCE_API_KEY: true,
        OPEN_EXCHANGE_RATES_APP_ID: true,
      });
    });

    it("should return correct summary when no providers are configured", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const summary = getProviderConfigSummary();

      expect(summary).toEqual({
        GEMINI_API_KEY: false,
        EXCHANGE_RATE_API_KEY: false,
        YAHOO_FINANCE_API_KEY: false,
        OPEN_EXCHANGE_RATES_APP_ID: false,
      });
    });

    it("should return correct summary for mixed configuration", () => {
      vi.mocked(isEnvSet).mockImplementation((envVar) => {
        if (envVar === "GEMINI_API_KEY") return true;
        if (envVar === "OPEN_EXCHANGE_RATES_APP_ID") return true;
        return false;
      });

      const summary = getProviderConfigSummary();

      expect(summary).toEqual({
        GEMINI_API_KEY: true,
        EXCHANGE_RATE_API_KEY: false,
        YAHOO_FINANCE_API_KEY: false,
        OPEN_EXCHANGE_RATES_APP_ID: true,
      });
    });

    it("should return an object with exactly 4 keys", () => {
      vi.mocked(isEnvSet).mockReturnValue(false);

      const summary = getProviderConfigSummary();

      expect(Object.keys(summary)).toHaveLength(4);
    });

    it("should have boolean values for all keys", () => {
      vi.mocked(isEnvSet).mockReturnValue(true);

      const summary = getProviderConfigSummary();

      for (const value of Object.values(summary)) {
        expect(typeof value).toBe("boolean");
      }
    });
  });
});
