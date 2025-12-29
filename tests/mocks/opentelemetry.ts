/**
 * Shared OpenTelemetry Mocks for Vitest 4.x
 *
 * Story 1.7: Enable All Skipped Tests
 * AC 1.7.1: Telemetry Unit Tests Enabled
 *
 * IMPORTANT: Due to vi.hoisted() restrictions, mocks must be defined inline
 * in test files using vi.hoisted(). This file provides reference patterns
 * and utility types for OpenTelemetry mocking.
 *
 * Usage Pattern:
 * ```typescript
 * // In your test file - mocks MUST be defined inline with vi.hoisted()
 * const { mockSpan, mockTracer, getTracerMock } = vi.hoisted(() => {
 *   const mockSpan = {
 *     setAttribute: vi.fn(),
 *     setStatus: vi.fn(),
 *     end: vi.fn(),
 *     recordException: vi.fn(),
 *   };
 *   const mockTracer = {
 *     startSpan: vi.fn().mockReturnValue(mockSpan),
 *   };
 *   const getTracerMock = vi.fn().mockReturnValue(mockTracer);
 *   return { mockSpan, mockTracer, getTracerMock };
 * });
 *
 * // Mock using the hoisted variables
 * vi.mock("@opentelemetry/api", () => ({
 *   trace: { getTracer: getTracerMock },
 *   SpanStatusCode: { OK: 0, ERROR: 2 },
 * }));
 * ```
 */

/**
 * SpanStatusCode enum values for assertions
 * (Matches @opentelemetry/api SpanStatusCode)
 */
export const MockSpanStatusCode = {
  UNSET: 1,
  OK: 0,
  ERROR: 2,
} as const;

/**
 * Type for mock span object
 */
export interface MockSpan {
  setAttribute: ReturnType<typeof import("vitest").vi.fn>;
  setStatus: ReturnType<typeof import("vitest").vi.fn>;
  end: ReturnType<typeof import("vitest").vi.fn>;
  recordException: ReturnType<typeof import("vitest").vi.fn>;
  spanContext?: ReturnType<typeof import("vitest").vi.fn>;
  isRecording?: ReturnType<typeof import("vitest").vi.fn>;
  updateName?: ReturnType<typeof import("vitest").vi.fn>;
  addEvent?: ReturnType<typeof import("vitest").vi.fn>;
}

/**
 * Type for mock tracer object
 */
export interface MockTracer {
  startSpan: ReturnType<typeof import("vitest").vi.fn>;
  startActiveSpan?: ReturnType<typeof import("vitest").vi.fn>;
}
