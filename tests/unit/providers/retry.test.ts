/**
 * Retry Utility Tests
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.4: Retry Logic Applied
 *
 * Tests for retry logic with exponential backoff.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, createRetryWrapper } from "@/lib/providers/retry";
import { ProviderError, PROVIDER_ERROR_CODES } from "@/lib/providers/types";

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("success scenarios", () => {
    it("should return result on first attempt success", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const resultPromise = withRetry(operation, { providerName: "test" });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should succeed on second attempt after first failure", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValue("success");

      const resultPromise = withRetry(operation, {
        providerName: "test",
        backoffMs: [100, 200, 400],
      });

      // First attempt fails, wait for backoff
      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should succeed on third attempt after two failures", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue("success");

      const resultPromise = withRetry(operation, {
        providerName: "test",
        backoffMs: [100, 200, 400],
      });

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe("failure scenarios", () => {
    it("should throw ProviderError after all retries fail", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Always fails"));

      let caughtError: Error | null = null;
      const resultPromise = withRetry(operation, {
        providerName: "test",
        maxAttempts: 3,
        backoffMs: [100, 200, 400],
      }).catch((e) => {
        caughtError = e;
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(ProviderError);
      const providerError = caughtError as ProviderError;
      expect(providerError.code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
      expect(providerError.provider).toBe("test");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should include attempt details in error", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Test error"));

      let caughtError: Error | null = null;
      const resultPromise = withRetry(operation, {
        providerName: "test-provider",
        operationName: "testOperation",
        maxAttempts: 2,
        backoffMs: [50],
      }).catch((e) => {
        caughtError = e;
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(ProviderError);
      const providerError = caughtError as ProviderError;
      expect(providerError.message).toContain("testOperation failed after 2 attempts");
      expect(providerError.details?.attempts).toBeDefined();
      expect(providerError.details?.totalAttempts).toBe(2);
    });
  });

  describe("exponential backoff", () => {
    it("should use configured backoff delays", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue("success");

      const backoffMs = [1000, 2000, 4000];

      const resultPromise = withRetry(operation, {
        providerName: "test",
        backoffMs,
        maxAttempts: 3,
      });

      // First failure - immediate
      expect(operation).toHaveBeenCalledTimes(1);

      // Advance past first backoff
      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      // Advance past second backoff
      await vi.advanceTimersByTimeAsync(2000);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await resultPromise;
      expect(result).toBe("success");
    });
  });

  describe("timeout handling", () => {
    it("should timeout slow operations", async () => {
      const slowOperation = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("slow result"), 20000);
        });
      });

      let caughtError: Error | null = null;
      const resultPromise = withRetry(slowOperation, {
        providerName: "test",
        timeoutMs: 100,
        maxAttempts: 1,
        backoffMs: [50],
      }).catch((e) => {
        caughtError = e;
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(ProviderError);
      const providerError = caughtError as ProviderError;
      expect(providerError.code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
    });
  });

  describe("configuration", () => {
    it("should use default configuration when not specified", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

describe("createRetryWrapper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create wrapper with default options", async () => {
    const wrapper = createRetryWrapper({ providerName: "test-wrapper" });
    const operation = vi.fn().mockResolvedValue("wrapped result");

    const result = await wrapper(operation, "testOp");

    expect(result).toBe("wrapped result");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("should use operation name from call when provided", async () => {
    const wrapper = createRetryWrapper({
      providerName: "test-wrapper",
      operationName: "defaultOp",
    });
    const operation = vi.fn().mockResolvedValue("result");

    await wrapper(operation, "overrideOp");

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
