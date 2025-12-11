/**
 * Circuit Breaker Tests
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Tests for circuit breaker pattern implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker, CircuitBreakerRegistry } from "@/lib/providers/circuit-breaker";
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

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start in closed state", () => {
      const breaker = new CircuitBreaker({ providerName: "test" });
      const state = breaker.getState();

      expect(state.state).toBe("closed");
      expect(state.failures).toBe(0);
      expect(state.lastFailure).toBeNull();
      expect(state.openedAt).toBeNull();
    });

    it("should be closed by default", () => {
      const breaker = new CircuitBreaker({ providerName: "test" });

      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.isHalfOpen()).toBe(false);
    });
  });

  describe("failure recording", () => {
    it("should increment failure count on recordFailure", () => {
      const breaker = new CircuitBreaker({ providerName: "test" });

      breaker.recordFailure();
      expect(breaker.getState().failures).toBe(1);

      breaker.recordFailure();
      expect(breaker.getState().failures).toBe(2);
    });

    it("should remain closed until failure threshold is reached", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
      });

      // Record 4 failures - should stay closed
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure();
        expect(breaker.isClosed()).toBe(true);
      }
    });

    it("should open after exactly 5 consecutive failures", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
      });

      // Record 5 failures
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(breaker.isOpen()).toBe(true);
      expect(breaker.isClosed()).toBe(false);
      expect(breaker.getState().state).toBe("open");
    });
  });

  describe("success recording", () => {
    it("should reset failure count on success", () => {
      const breaker = new CircuitBreaker({ providerName: "test" });

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState().failures).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getState().failures).toBe(0);
    });

    it("should stay closed after success", () => {
      const breaker = new CircuitBreaker({ providerName: "test" });

      breaker.recordSuccess();
      expect(breaker.isClosed()).toBe(true);
    });
  });

  describe("state transitions", () => {
    it("should transition from open to half-open after reset timeout", () => {
      const resetTimeoutMs = 5 * 60 * 1000; // 5 minutes
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
        resetTimeoutMs,
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.isOpen()).toBe(true);

      // Advance time past reset timeout
      vi.advanceTimersByTime(resetTimeoutMs + 1);

      expect(breaker.isHalfOpen()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
    });

    it("should transition from half-open to closed on success", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
        resetTimeoutMs: 100,
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      // Wait for half-open
      vi.advanceTimersByTime(101);
      expect(breaker.isHalfOpen()).toBe(true);

      // Success closes the circuit
      breaker.recordSuccess();
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.getState().failures).toBe(0);
    });

    it("should transition from half-open to open on failure", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
        resetTimeoutMs: 100,
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      // Wait for half-open
      vi.advanceTimersByTime(101);
      expect(breaker.isHalfOpen()).toBe(true);

      // Failure reopens the circuit
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe("checkRequest", () => {
    it("should not throw when circuit is closed", () => {
      const breaker = new CircuitBreaker({ providerName: "test" });

      expect(() => breaker.checkRequest()).not.toThrow();
    });

    it("should throw ProviderError when circuit is open", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(() => breaker.checkRequest()).toThrow(ProviderError);
      expect(() => breaker.checkRequest()).toThrow(
        expect.objectContaining({
          code: PROVIDER_ERROR_CODES.CIRCUIT_OPEN,
          provider: "test",
        })
      );
    });

    it("should not throw when circuit is half-open", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
        resetTimeoutMs: 100,
      });

      // Open then wait for half-open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      vi.advanceTimersByTime(101);

      expect(() => breaker.checkRequest()).not.toThrow();
    });
  });

  describe("execute", () => {
    it("should execute operation and record success", async () => {
      const breaker = new CircuitBreaker({ providerName: "test" });
      const operation = vi.fn().mockResolvedValue("result");

      const result = await breaker.execute(operation);

      expect(result).toBe("result");
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getState().failures).toBe(0);
    });

    it("should record failure on operation error", async () => {
      const breaker = new CircuitBreaker({ providerName: "test" });
      const operation = vi.fn().mockRejectedValue(new Error("Operation failed"));

      await expect(breaker.execute(operation)).rejects.toThrow("Operation failed");
      expect(breaker.getState().failures).toBe(1);
    });

    it("should throw immediately when circuit is open", async () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      const operation = vi.fn().mockResolvedValue("result");

      await expect(breaker.execute(operation)).rejects.toThrow(ProviderError);
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("should reset circuit to closed state", () => {
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.isOpen()).toBe(true);

      // Reset
      breaker.reset();

      expect(breaker.isClosed()).toBe(true);
      expect(breaker.getState().failures).toBe(0);
      expect(breaker.getState().openedAt).toBeNull();
    });
  });

  describe("onStateChange callback", () => {
    it("should call callback when state changes", () => {
      const onStateChange = vi.fn();
      const breaker = new CircuitBreaker({
        providerName: "test",
        failureThreshold: 5,
        onStateChange,
      });

      // Trigger state change to open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(onStateChange).toHaveBeenCalledWith("closed", "open");
    });
  });
});

describe("CircuitBreakerRegistry", () => {
  it("should create new breaker for unknown provider", () => {
    const registry = new CircuitBreakerRegistry();

    const breaker = registry.getBreaker("new-provider");

    expect(breaker).toBeInstanceOf(CircuitBreaker);
    expect(breaker.getState().provider).toBe("new-provider");
  });

  it("should return same breaker for same provider", () => {
    const registry = new CircuitBreakerRegistry();

    const breaker1 = registry.getBreaker("test-provider");
    const breaker2 = registry.getBreaker("test-provider");

    expect(breaker1).toBe(breaker2);
  });

  it("should return different breakers for different providers", () => {
    const registry = new CircuitBreakerRegistry();

    const breaker1 = registry.getBreaker("provider-1");
    const breaker2 = registry.getBreaker("provider-2");

    expect(breaker1).not.toBe(breaker2);
  });

  it("should return all states", () => {
    const registry = new CircuitBreakerRegistry();

    registry.getBreaker("provider-1");
    registry.getBreaker("provider-2");

    const states = registry.getAllStates();

    expect(states).toHaveLength(2);
    expect(states.map((s) => s.provider)).toContain("provider-1");
    expect(states.map((s) => s.provider)).toContain("provider-2");
  });

  it("should reset all breakers", () => {
    const registry = new CircuitBreakerRegistry({ failureThreshold: 5, resetTimeoutMs: 300000 });

    const breaker1 = registry.getBreaker("provider-1");
    const breaker2 = registry.getBreaker("provider-2");

    // Open both breakers
    for (let i = 0; i < 5; i++) {
      breaker1.recordFailure();
      breaker2.recordFailure();
    }

    expect(breaker1.isOpen()).toBe(true);
    expect(breaker2.isOpen()).toBe(true);

    // Reset all
    registry.resetAll();

    expect(breaker1.isClosed()).toBe(true);
    expect(breaker2.isClosed()).toBe(true);
  });
});
