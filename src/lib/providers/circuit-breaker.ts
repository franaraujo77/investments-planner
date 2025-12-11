/**
 * Circuit Breaker
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Implements circuit breaker pattern for provider health management.
 * - Opens after 5 consecutive failures
 * - Resets after 5 minutes
 * - Half-open state allows single test request
 * - All state transitions are logged with metrics for observability
 *
 * @module @/lib/providers/circuit-breaker
 */

import { logger } from "@/lib/telemetry/logger";
import {
  type CircuitBreakerConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  ProviderError,
  PROVIDER_ERROR_CODES,
} from "./types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Circuit breaker states
 */
export type CircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerState {
  /** Provider name this circuit breaker is for */
  provider: string;
  /** Current state of the circuit */
  state: CircuitState;
  /** Number of consecutive failures */
  failures: number;
  /** Timestamp of last failure */
  lastFailure: Date | null;
  /** When the circuit opened (if open) */
  openedAt: Date | null;
  /** When the circuit can transition to half-open */
  nextAttemptAt: Date | null;
}

/**
 * Options for circuit breaker
 */
export interface CircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
  /** Provider name for logging and identification */
  providerName: string;
  /** Optional callback when state changes */
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

// =============================================================================
// CIRCUIT BREAKER CLASS
// =============================================================================

/**
 * Circuit Breaker
 *
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider disabled, requests fail immediately
 * - HALF-OPEN: Single test request allowed to check recovery
 *
 * Transitions:
 * - CLOSED → OPEN: After 5 consecutive failures
 * - OPEN → HALF-OPEN: After 5 minute timeout
 * - HALF-OPEN → CLOSED: On successful test request
 * - HALF-OPEN → OPEN: On failed test request
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({ providerName: 'gemini' });
 *
 * if (breaker.isOpen()) {
 *   // Skip this provider, use fallback
 * }
 *
 * try {
 *   const result = await fetchPrices();
 *   breaker.recordSuccess();
 * } catch (error) {
 *   breaker.recordFailure();
 * }
 * ```
 */
export class CircuitBreaker {
  private readonly providerName: string;
  private readonly config: CircuitBreakerConfig;
  private readonly onStateChange:
    | ((oldState: CircuitState, newState: CircuitState) => void)
    | undefined;

  private state: CircuitState = "closed";
  private failures: number = 0;
  private lastFailure: Date | null = null;
  private openedAt: Date | null = null;

  constructor(options: CircuitBreakerOptions) {
    this.providerName = options.providerName;
    this.config = {
      failureThreshold: options.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
      resetTimeoutMs: options.resetTimeoutMs ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs,
    };
    this.onStateChange = options.onStateChange;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    // Check if we should transition from open to half-open
    this.checkStateTransition();

    return {
      provider: this.providerName,
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      openedAt: this.openedAt,
      nextAttemptAt: this.getNextAttemptTime(),
    };
  }

  /**
   * Check if circuit is currently open (provider disabled)
   */
  isOpen(): boolean {
    this.checkStateTransition();
    return this.state === "open";
  }

  /**
   * Check if circuit is closed (normal operation)
   */
  isClosed(): boolean {
    this.checkStateTransition();
    return this.state === "closed";
  }

  /**
   * Check if circuit is half-open (test request allowed)
   */
  isHalfOpen(): boolean {
    this.checkStateTransition();
    return this.state === "half-open";
  }

  /**
   * Record a successful request
   *
   * Resets failure count and closes circuit if half-open
   */
  recordSuccess(): void {
    const previousState = this.state;

    if (this.state === "half-open") {
      // Successful test request - close the circuit
      this.transitionTo("closed");
      logger.info("Circuit breaker closed after successful test", {
        provider: this.providerName,
        previousState,
        newState: "closed",
      });
    }

    // Reset failure count on any success
    this.failures = 0;
    this.lastFailure = null;
  }

  /**
   * Record a failed request
   *
   * AC-6.1.5: Opens circuit after 5 consecutive failures
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    const previousState = this.state;

    if (this.state === "half-open") {
      // Failed test request - reopen the circuit
      this.transitionTo("open");
      this.openedAt = new Date();

      logger.warn("Circuit breaker reopened after failed test", {
        provider: this.providerName,
        previousState,
        newState: "open",
        resetTimeoutMs: this.config.resetTimeoutMs,
      });
    } else if (this.state === "closed" && this.failures >= this.config.failureThreshold) {
      // AC-6.1.5: 5 consecutive failures opens circuit
      this.transitionTo("open");
      this.openedAt = new Date();

      logger.error("Circuit breaker opened due to consecutive failures", {
        provider: this.providerName,
        previousState,
        newState: "open",
        consecutiveFailures: this.failures,
        failureThreshold: this.config.failureThreshold,
        resetTimeoutMs: this.config.resetTimeoutMs,
      });
    } else {
      // Still closed, log the failure
      logger.warn("Provider failure recorded", {
        provider: this.providerName,
        state: this.state,
        consecutiveFailures: this.failures,
        failureThreshold: this.config.failureThreshold,
      });
    }
  }

  /**
   * Check if request should be allowed
   *
   * @throws ProviderError if circuit is open
   */
  checkRequest(): void {
    this.checkStateTransition();

    if (this.state === "open") {
      const nextAttempt = this.getNextAttemptTime();
      throw new ProviderError(
        `Provider ${this.providerName} circuit is open - disabled until ${nextAttempt?.toISOString()}`,
        PROVIDER_ERROR_CODES.CIRCUIT_OPEN,
        this.providerName,
        {
          state: this.state,
          openedAt: this.openedAt?.toISOString(),
          nextAttemptAt: nextAttempt?.toISOString(),
          consecutiveFailures: this.failures,
        }
      );
    }
  }

  /**
   * Execute an operation through the circuit breaker
   *
   * Automatically records success/failure and checks state
   *
   * @param operation - Async operation to execute
   * @returns Result of the operation
   * @throws ProviderError if circuit is open or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.checkRequest();

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker
   *
   * Useful for administrative operations or testing
   */
  reset(): void {
    const previousState = this.state;

    this.state = "closed";
    this.failures = 0;
    this.lastFailure = null;
    this.openedAt = null;

    if (previousState !== "closed") {
      logger.info("Circuit breaker manually reset", {
        provider: this.providerName,
        previousState,
        newState: "closed",
      });

      this.onStateChange?.("closed", "closed");
    }
  }

  /**
   * Check and perform state transitions
   *
   * AC-6.1.5: After 5 minutes, transition from open to half-open
   */
  private checkStateTransition(): void {
    if (this.state !== "open" || !this.openedAt) {
      return;
    }

    const now = Date.now();
    const openedTime = this.openedAt.getTime();
    const timeSinceOpen = now - openedTime;

    // AC-6.1.5: After 5 minutes, allow a single test request
    if (timeSinceOpen >= this.config.resetTimeoutMs) {
      this.transitionTo("half-open");

      logger.info("Circuit breaker transitioned to half-open", {
        provider: this.providerName,
        previousState: "open",
        newState: "half-open",
        timeSinceOpenMs: timeSinceOpen,
        resetTimeoutMs: this.config.resetTimeoutMs,
      });
    }
  }

  /**
   * Transition to a new state
   *
   * Emits telemetry metrics for observability dashboards
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // Emit metrics for observability
    this.emitStateTransitionMetric(oldState, newState);

    this.onStateChange?.(oldState, newState);
  }

  /**
   * Emit telemetry metrics for circuit breaker state transitions
   *
   * These metrics can be collected by observability tools (Datadog, Prometheus, etc.)
   * for monitoring provider health across the system.
   */
  private emitStateTransitionMetric(fromState: CircuitState, toState: CircuitState): void {
    // Log as a structured metric that can be parsed by log aggregators
    logger.info("Circuit breaker state transition", {
      metric: "circuit_breaker.state_change",
      provider: this.providerName,
      fromState,
      toState,
      consecutiveFailures: this.failures,
      timestamp: new Date().toISOString(),
    });

    // Emit specific metrics based on the transition type
    if (toState === "open") {
      logger.warn("Circuit breaker OPENED - provider disabled", {
        metric: "circuit_breaker.opened",
        provider: this.providerName,
        consecutiveFailures: this.failures,
        failureThreshold: this.config.failureThreshold,
        resetTimeoutMs: this.config.resetTimeoutMs,
        nextAttemptAt: this.getNextAttemptTime()?.toISOString(),
      });
    } else if (toState === "closed" && fromState !== "closed") {
      logger.info("Circuit breaker CLOSED - provider recovered", {
        metric: "circuit_breaker.closed",
        provider: this.providerName,
        previousState: fromState,
      });
    }
  }

  /**
   * Calculate when the next attempt will be allowed
   */
  private getNextAttemptTime(): Date | null {
    if (this.state !== "open" || !this.openedAt) {
      return null;
    }

    return new Date(this.openedAt.getTime() + this.config.resetTimeoutMs);
  }
}

// =============================================================================
// CIRCUIT BREAKER REGISTRY
// =============================================================================

/**
 * Registry for managing multiple circuit breakers
 *
 * Provides a centralized way to manage circuit breakers for different providers
 */
export class CircuitBreakerRegistry {
  private readonly breakers: Map<string, CircuitBreaker> = new Map();
  private readonly defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  getBreaker(providerName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(providerName);

    if (!breaker) {
      breaker = new CircuitBreaker({
        providerName,
        ...this.defaultConfig,
        ...config,
      });
      this.breakers.set(providerName, breaker);
    }

    return breaker;
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates(): CircuitBreakerState[] {
    return Array.from(this.breakers.values()).map((breaker) => breaker.getState());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default circuit breaker registry
 */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_CIRCUIT_BREAKER_CONFIG };
export type { CircuitBreakerConfig };
