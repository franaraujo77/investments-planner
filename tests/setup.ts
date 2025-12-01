/**
 * Shared Test Utilities
 *
 * Common utilities for unit and integration tests.
 * Import via: import { ... } from '../setup'
 */

import { vi } from "vitest";

/**
 * Reset all mocks between tests
 */
export function resetMocks(): void {
  vi.resetAllMocks();
}

/**
 * Clear all mocks without resetting implementation
 */
export function clearMocks(): void {
  vi.clearAllMocks();
}

/**
 * Mock environment variables for testing
 */
export function mockEnv(vars: Record<string, string>): void {
  const original = { ...process.env };

  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  return () => {
    Object.keys(vars).forEach((key) => {
      if (original[key] !== undefined) {
        process.env[key] = original[key];
      } else {
        delete process.env[key];
      }
    });
  };
}

/**
 * Create a mock date for testing
 */
export function mockDate(date: Date | string): () => void {
  const original = Date;
  const mockDate = new Date(date);

  vi.setSystemTime(mockDate);

  return () => {
    vi.useRealTimers();
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock function that tracks calls
 */
export function createMockFn<T extends (...args: unknown[]) => unknown>() {
  return vi.fn<T>();
}
