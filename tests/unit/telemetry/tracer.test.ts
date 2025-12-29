/**
 * Tracer Utilities Tests
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * Story 1.7: Enable All Skipped Tests (AC 1.7.1)
 *
 * AC1: Job execution creates a span with: job name, user_id, duration, asset_count
 * AC2: Span attributes capture timing breakdown
 *
 * Tests for span creation and attribute management.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted() to ensure mocks are available before vi.mock() hoisting
// The factory function must be self-contained (no external imports)
const { mockSpan, mockTracer, getTracerMock } = vi.hoisted(() => {
  const mockSpan = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
    recordException: vi.fn(),
    spanContext: vi.fn().mockReturnValue({
      traceId: "test-trace-id",
      spanId: "test-span-id",
    }),
    isRecording: vi.fn().mockReturnValue(true),
    updateName: vi.fn(),
    addEvent: vi.fn(),
  };

  const mockTracer = {
    startSpan: vi.fn().mockReturnValue(mockSpan),
    startActiveSpan: vi.fn(),
  };

  const getTracerMock = vi.fn().mockReturnValue(mockTracer);

  return { mockSpan, mockTracer, getTracerMock };
});

// Mock SpanStatusCode values
const MockSpanStatusCode = {
  OK: 0,
  ERROR: 2,
} as const;

// Mock @opentelemetry/api using shared hoisted mocks
vi.mock("@opentelemetry/api", () => ({
  trace: {
    getTracer: getTracerMock,
  },
  SpanStatusCode: {
    OK: 0,
    ERROR: 2,
    UNSET: 1,
  },
  context: {
    active: vi.fn(),
    with: vi.fn((_ctx, fn) => fn()),
  },
  propagation: {
    extract: vi.fn(),
    inject: vi.fn(),
  },
}));

describe("createJobSpan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a span with the specified name", async () => {
    // Arrange
    const { createJobSpan, SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Act
    const span = createJobSpan("overnight-scoring");

    // Assert
    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      "overnight-scoring",
      expect.objectContaining({
        attributes: expect.objectContaining({
          [SpanAttributes.JOB_NAME]: "overnight-scoring",
        }),
      })
    );
    expect(span).toBe(mockSpan);
  });

  it("should set user_id attribute when provided", async () => {
    // Arrange
    const { createJobSpan, SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Act
    createJobSpan("test-job", { userId: "user-123" });

    // Assert
    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      "test-job",
      expect.objectContaining({
        attributes: expect.objectContaining({
          [SpanAttributes.USER_ID]: "user-123",
        }),
      })
    );
  });

  it("should set asset_count attribute when provided", async () => {
    // Arrange
    const { createJobSpan, SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Act
    createJobSpan("test-job", { assetCount: 50 });

    // Assert
    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      "test-job",
      expect.objectContaining({
        attributes: expect.objectContaining({
          [SpanAttributes.ASSET_COUNT]: 50,
        }),
      })
    );
  });

  it("should set market attribute when provided", async () => {
    // Arrange
    const { createJobSpan, SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Act
    createJobSpan("test-job", { market: "NYSE" });

    // Assert
    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      "test-job",
      expect.objectContaining({
        attributes: expect.objectContaining({
          [SpanAttributes.MARKET]: "NYSE",
        }),
      })
    );
  });

  it("should set all job attributes together", async () => {
    // Arrange
    const { createJobSpan, SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Act
    createJobSpan("overnight-scoring", {
      userId: "user-456",
      assetCount: 100,
      market: "B3",
    });

    // Assert
    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      "overnight-scoring",
      expect.objectContaining({
        attributes: expect.objectContaining({
          [SpanAttributes.JOB_NAME]: "overnight-scoring",
          [SpanAttributes.USER_ID]: "user-456",
          [SpanAttributes.ASSET_COUNT]: 100,
          [SpanAttributes.MARKET]: "B3",
        }),
      })
    );
  });
});

describe("withSpan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create and end span automatically", async () => {
    // Arrange
    const { withSpan } = await import("@/lib/telemetry/tracer");

    // Act
    await withSpan("test-job", async () => {
      return "result";
    });

    // Assert
    expect(mockTracer.startSpan).toHaveBeenCalledWith("test-job", expect.any(Object));
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it("should return the callback result", async () => {
    // Arrange
    const { withSpan } = await import("@/lib/telemetry/tracer");

    // Act
    const result = await withSpan("test-job", async () => {
      return { data: "test" };
    });

    // Assert
    expect(result).toEqual({ data: "test" });
  });

  it("should set status to OK on success", async () => {
    // Arrange
    const { withSpan } = await import("@/lib/telemetry/tracer");

    // Act
    await withSpan("test-job", async () => "success");

    // Assert
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: MockSpanStatusCode.OK,
    });
  });

  it("should set status to ERROR and re-throw on failure", async () => {
    // Arrange
    const { withSpan } = await import("@/lib/telemetry/tracer");
    const testError = new Error("Test error");

    // Act & Assert
    await expect(
      withSpan("test-job", async () => {
        throw testError;
      })
    ).rejects.toThrow("Test error");

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: MockSpanStatusCode.ERROR,
      message: "Test error",
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it("should pass span to callback for attribute setting", async () => {
    // Arrange
    const { withSpan, SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Act
    await withSpan("test-job", async (span) => {
      span.setAttribute(SpanAttributes.ASSET_COUNT, 25);
      return "done";
    });

    // Assert
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(SpanAttributes.ASSET_COUNT, 25);
  });
});

describe("getTracer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a tracer with the specified name", async () => {
    // Arrange
    const { getTracer } = await import("@/lib/telemetry/tracer");

    // Act
    getTracer("custom-tracer");

    // Assert
    expect(getTracerMock).toHaveBeenCalledWith("custom-tracer");
  });

  it("should use default service name when not specified", async () => {
    // Arrange
    const { getTracer } = await import("@/lib/telemetry/tracer");
    const { DEFAULT_SERVICE_NAME } = await import("@/lib/telemetry/config");

    // Act
    getTracer();

    // Assert
    expect(getTracerMock).toHaveBeenCalledWith(DEFAULT_SERVICE_NAME);
  });
});

describe("SpanAttributes constants", () => {
  it("should define all required attribute keys", async () => {
    // Arrange
    const { SpanAttributes } = await import("@/lib/telemetry/tracer");

    // Assert
    expect(SpanAttributes.JOB_NAME).toBe("job.name");
    expect(SpanAttributes.USER_ID).toBe("user.id");
    expect(SpanAttributes.ASSET_COUNT).toBe("asset.count");
    expect(SpanAttributes.MARKET).toBe("market");
    expect(SpanAttributes.DURATION_MS).toBe("duration_ms");
    expect(SpanAttributes.FETCH_RATES_MS).toBe("fetch_rates_ms");
    expect(SpanAttributes.FETCH_PRICES_MS).toBe("fetch_prices_ms");
    expect(SpanAttributes.COMPUTE_SCORES_MS).toBe("compute_scores_ms");
    expect(SpanAttributes.TOTAL_DURATION_MS).toBe("total_duration_ms");
  });
});
