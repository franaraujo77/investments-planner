/**
 * OpenTelemetry Setup Tests
 *
 * Story 1.5: OpenTelemetry Instrumentation
 * Story 1.7: Enable All Skipped Tests (AC 1.7.1)
 *
 * AC4: Traces export to OTLP HTTP endpoint (configurable via OTEL_EXPORTER_OTLP_ENDPOINT)
 *
 * Tests the SDK initialization and configuration handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
// _mockStart and _mockShutdown are created for the mock class but not directly used in tests
const { _mockStart, _mockShutdown, mockNodeSDKInstances, MockNodeSDK } = vi.hoisted(() => {
  const _mockStart = vi.fn();
  const _mockShutdown = vi.fn().mockResolvedValue(undefined);
  const mockNodeSDKInstances: object[] = [];

  // Create a named class for proper constructor tracking
  class MockNodeSDK {
    start = _mockStart;
    shutdown = _mockShutdown;
    constructor() {
      mockNodeSDKInstances.push(this);
    }
  }

  return { _mockStart, _mockShutdown, mockNodeSDKInstances, MockNodeSDK };
});

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: MockNodeSDK,
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: class MockOTLPTraceExporter {
    constructor() {
      // Empty mock constructor
    }
  },
}));

vi.mock("@opentelemetry/resources", () => ({
  Resource: class MockResource {
    constructor() {
      // Empty mock constructor
    }
  },
}));

vi.mock("@opentelemetry/sdk-trace-node", () => ({
  BatchSpanProcessor: class MockBatchSpanProcessor {
    constructor() {
      // Empty mock constructor
    }
  },
}));

describe("setupTelemetry", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear singleton state
    vi.resetModules();
    // Reset environment
    process.env = { ...originalEnv };
    // Clear instance tracker
    mockNodeSDKInstances.length = 0;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("when OTEL_EXPORTER_OTLP_ENDPOINT is set", () => {
    it("should initialize the SDK without errors", async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
      process.env.OTEL_SERVICE_NAME = "test-service";

      // Act
      const { setupTelemetry, isSetupComplete } = await import("@/lib/telemetry/setup");
      setupTelemetry();

      // Assert
      expect(isSetupComplete()).toBe(true);
    });

    it("should read service name from OTEL_SERVICE_NAME env var", async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
      process.env.OTEL_SERVICE_NAME = "custom-service-name";

      const { getTracerConfig } = await import("@/lib/telemetry/config");

      // Act
      const config = getTracerConfig();

      // Assert
      expect(config.serviceName).toBe("custom-service-name");
    });

    it("should use default service name when OTEL_SERVICE_NAME is not set", async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
      delete process.env.OTEL_SERVICE_NAME;

      const { getTracerConfig, DEFAULT_SERVICE_NAME } = await import("@/lib/telemetry/config");

      // Act
      const config = getTracerConfig();

      // Assert
      expect(config.serviceName).toBe(DEFAULT_SERVICE_NAME);
    });

    it("should read endpoint from environment", async () => {
      // Arrange
      const expectedEndpoint = "http://collector.example.com:4318";
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = expectedEndpoint;

      const { getTracerConfig } = await import("@/lib/telemetry/config");

      // Act
      const config = getTracerConfig();

      // Assert
      expect(config.endpoint).toBe(expectedEndpoint);
      expect(config.enabled).toBe(true);
    });
  });

  describe("when OTEL_EXPORTER_OTLP_ENDPOINT is NOT set", () => {
    it("should gracefully disable telemetry without errors", async () => {
      // Arrange
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

      // Act
      const { setupTelemetry, isSetupComplete } = await import("@/lib/telemetry/setup");

      // Should not throw
      expect(() => setupTelemetry()).not.toThrow();
      expect(isSetupComplete()).toBe(true);
    });

    it("should set enabled to false in config", async () => {
      // Arrange
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

      const { getTracerConfig } = await import("@/lib/telemetry/config");

      // Act
      const config = getTracerConfig();

      // Assert
      expect(config.enabled).toBe(false);
      expect(config.endpoint).toBeUndefined();
    });

    it("should not create SDK when disabled", async () => {
      // Arrange
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

      // Act
      const { setupTelemetry } = await import("@/lib/telemetry/setup");
      setupTelemetry();

      // Assert - no SDK instances should be created
      expect(mockNodeSDKInstances.length).toBe(0);
    });
  });

  describe("singleton behavior", () => {
    it("should only initialize once when called multiple times", async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";

      // Act
      const { setupTelemetry } = await import("@/lib/telemetry/setup");
      setupTelemetry();
      setupTelemetry();
      setupTelemetry();

      // Assert - only 1 SDK instance should be created despite 3 calls
      expect(mockNodeSDKInstances.length).toBe(1);
    });
  });
});

describe("getTracerConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return all configuration values", async () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
    process.env.OTEL_SERVICE_NAME = "my-service";
    process.env.OTEL_SERVICE_VERSION = "1.2.3";
    process.env.NODE_ENV = "production";

    const { getTracerConfig } = await import("@/lib/telemetry/config");

    // Act
    const config = getTracerConfig();

    // Assert
    expect(config).toEqual({
      serviceName: "my-service",
      serviceVersion: "1.2.3",
      endpoint: "http://localhost:4318",
      enabled: true,
      environment: "production",
    });
  });

  it("should use defaults when optional vars not set", async () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
    delete process.env.OTEL_SERVICE_NAME;
    delete process.env.OTEL_SERVICE_VERSION;
    delete process.env.NODE_ENV;

    const { getTracerConfig, DEFAULT_SERVICE_NAME, DEFAULT_SERVICE_VERSION } =
      await import("@/lib/telemetry/config");

    // Act
    const config = getTracerConfig();

    // Assert
    expect(config.serviceName).toBe(DEFAULT_SERVICE_NAME);
    expect(config.serviceVersion).toBe(DEFAULT_SERVICE_VERSION);
    expect(config.environment).toBe("development");
  });
});
