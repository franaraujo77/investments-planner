/**
 * Error Handling Utilities Tests
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * AC3: Errors set span status to ERROR with message
 *
 * Tests for span error handling and recording.
 * NOTE: Tests will be executable after Vitest is installed in Story 1-7.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpanStatusCode } from "@opentelemetry/api";

// Mock span for testing
const mockSpan = {
  setAttribute: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
  end: vi.fn(),
};

describe("setSpanError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set span status to ERROR with error message", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");
    const error = new Error("Something went wrong");

    // Act
    setSpanError(mockSpan as any, error);

    // Assert
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "Something went wrong",
    });
  });

  it("should record exception with full details", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");
    const error = new Error("Database connection failed");
    error.name = "DatabaseError";

    // Act
    setSpanError(mockSpan as any, error);

    // Assert
    expect(mockSpan.recordException).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "DatabaseError",
        message: "Database connection failed",
      })
    );
  });

  it("should include stack trace in exception", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");
    const error = new Error("Test error");

    // Act
    setSpanError(mockSpan as any, error);

    // Assert
    expect(mockSpan.recordException).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.stringContaining("Error: Test error"),
      })
    );
  });

  it("should set exception attributes for querying", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");
    const error = new Error("Query failed");
    error.name = "QueryError";

    // Act
    setSpanError(mockSpan as any, error);

    // Assert
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("exception.type", "QueryError");
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("exception.message", "Query failed");
  });

  it("should NOT end the span (caller responsibility)", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");
    const error = new Error("Test error");

    // Act
    setSpanError(mockSpan as any, error);

    // Assert
    expect(mockSpan.end).not.toHaveBeenCalled();
  });

  it("should handle string errors", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");

    // Act
    setSpanError(mockSpan as any, "Simple string error");

    // Assert
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "Simple string error",
    });
  });

  it("should handle object errors without Error prototype", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");
    const errorObj = { message: "Custom error object", code: 500 };

    // Act
    setSpanError(mockSpan as any, errorObj);

    // Assert
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "Custom error object",
    });
  });

  it("should handle unknown error types", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");

    // Act
    setSpanError(mockSpan as any, 42);

    // Assert
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "42",
    });
  });

  it("should handle null errors gracefully", async () => {
    // Arrange
    const { setSpanError } = await import("@/lib/telemetry/errors");

    // Act
    setSpanError(mockSpan as any, null);

    // Assert
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: expect.any(String),
    });
  });
});

describe("withErrorRecording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return result on success without recording error", async () => {
    // Arrange
    const { withErrorRecording } = await import("@/lib/telemetry/errors");

    // Act
    const result = await withErrorRecording(mockSpan as any, async () => {
      return "success";
    });

    // Assert
    expect(result).toBe("success");
    expect(mockSpan.setStatus).not.toHaveBeenCalled();
    expect(mockSpan.recordException).not.toHaveBeenCalled();
  });

  it("should record error and re-throw on failure", async () => {
    // Arrange
    const { withErrorRecording } = await import("@/lib/telemetry/errors");
    const testError = new Error("Operation failed");

    // Act & Assert
    await expect(
      withErrorRecording(mockSpan as any, async () => {
        throw testError;
      })
    ).rejects.toThrow("Operation failed");

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "Operation failed",
    });
  });

  it("should preserve original error when re-throwing", async () => {
    // Arrange
    const { withErrorRecording } = await import("@/lib/telemetry/errors");

    class CustomError extends Error {
      code = "CUSTOM_001";
    }
    const testError = new CustomError("Custom error");

    // Act & Assert
    try {
      await withErrorRecording(mockSpan as any, async () => {
        throw testError;
      });
    } catch (caught) {
      expect(caught).toBe(testError);
      expect((caught as CustomError).code).toBe("CUSTOM_001");
    }
  });
});

describe("getSafeErrorMessage", () => {
  it("should return error message", async () => {
    // Arrange
    const { getSafeErrorMessage } = await import("@/lib/telemetry/errors");
    const error = new Error("Database error");

    // Act
    const message = getSafeErrorMessage(error);

    // Assert
    expect(message).toBe("Database error");
  });

  it("should truncate long messages", async () => {
    // Arrange
    const { getSafeErrorMessage } = await import("@/lib/telemetry/errors");
    const longMessage = "A".repeat(1000);
    const error = new Error(longMessage);

    // Act
    const message = getSafeErrorMessage(error, 100);

    // Assert
    expect(message.length).toBeLessThanOrEqual(103); // 100 + "..."
    expect(message.endsWith("...")).toBe(true);
  });

  it("should handle non-Error types", async () => {
    // Arrange
    const { getSafeErrorMessage } = await import("@/lib/telemetry/errors");

    // Act
    const message = getSafeErrorMessage("string error");

    // Assert
    expect(message).toBe("string error");
  });
});
