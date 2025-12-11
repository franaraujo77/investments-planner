/**
 * Data Refresh API Tests
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.4: Rate Limit of 5 Refreshes Per Hour Per User
 * AC-6.6.5: Rate Limit Exceeded Shows Countdown
 *
 * Tests for POST /api/data/refresh endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/data/refresh/route";

// Mock auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: <T>(
    handler: (
      request: NextRequest,
      session: { userId: string; email: string },
      context: { params: Promise<Record<string, string>> }
    ) => Promise<T>
  ) => {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      // Simulate authenticated user
      return handler(request, { userId: "test-user-123", email: "test@example.com" }, context);
    };
  },
}));

// Mock rate limiter - define inside the mock factory to avoid hoisting issues
vi.mock("@/lib/rate-limit", () => ({
  refreshRateLimiter: {
    checkLimit: vi.fn(),
    recordRefresh: vi.fn(),
    getStatus: vi.fn(),
    reset: vi.fn(),
  },
  MAX_REFRESHES_PER_HOUR: 5,
}));

// Mock data refresh service - define inside the mock factory
vi.mock("@/lib/services/data-refresh-service", () => ({
  dataRefreshService: {
    refresh: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules to get references
import { refreshRateLimiter } from "@/lib/rate-limit";
import { dataRefreshService } from "@/lib/services/data-refresh-service";

// Type the mocked modules
const mockRateLimiter = vi.mocked(refreshRateLimiter);
const mockRefreshService = vi.mocked(dataRefreshService);

describe("POST /api/data/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-10T12:00:00Z"));

    // Default mock implementations
    mockRateLimiter.checkLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: new Date("2025-12-10T13:00:00Z"),
    });

    mockRateLimiter.recordRefresh.mockResolvedValue(undefined);

    mockRefreshService.refresh.mockResolvedValue({
      success: true,
      refreshedAt: new Date("2025-12-10T12:00:00Z"),
      durationMs: 150,
      refreshedTypes: ["rates"],
      providers: { rates: "exchangerate-api" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create request
  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost:3000/api/data/refresh", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Helper context
  const context = { params: Promise.resolve({}) };

  describe("successful refresh", () => {
    it("should return 200 for valid refresh request", async () => {
      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);

      expect(response.status).toBe(200);
    });

    it("should return refreshed timestamp in response", async () => {
      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.data.refreshedAt).toBe("2025-12-10T12:00:00.000Z");
    });

    it("should return remaining refreshes count", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 3,
        resetAt: new Date("2025-12-10T13:00:00Z"),
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.data.remaining).toBeGreaterThanOrEqual(0);
    });

    it("should return next refresh available time", async () => {
      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.data.nextRefreshAvailable).toBeDefined();
    });

    it("should return providers that served data", async () => {
      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.data.providers).toEqual({ rates: "exchangerate-api" });
    });

    it("should return refreshed types", async () => {
      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.data.refreshedTypes).toContain("rates");
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date("2025-12-10T12:45:00Z"),
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);

      expect(response.status).toBe(429);
    });

    it("should include reset time in 429 response", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date("2025-12-10T12:45:00Z"),
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.details.resetAt).toBe("2025-12-10T12:45:00.000Z");
    });

    it("should include Retry-After header in 429 response", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date("2025-12-10T12:45:00Z"),
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const retryAfter = response.headers.get("Retry-After");

      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    });

    it("should include remaining=0 in 429 response", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date("2025-12-10T12:45:00Z"),
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.details.remaining).toBe(0);
    });

    it("should include error code RATE_LIMIT_EXCEEDED", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date("2025-12-10T12:45:00Z"),
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should record refresh after successful operation", async () => {
      const request = createRequest({ type: "rates" });

      await POST(request, context);

      expect(mockRateLimiter.recordRefresh).toHaveBeenCalledWith("test-user-123");
    });

    it("should not record refresh when rate limited", async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date("2025-12-10T12:45:00Z"),
      });

      const request = createRequest({ type: "rates" });

      await POST(request, context);

      expect(mockRateLimiter.recordRefresh).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("should return 400 for invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/data/refresh", {
        method: "POST",
        body: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, context);

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing type", async () => {
      const request = createRequest({});

      const response = await POST(request, context);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid type", async () => {
      const request = createRequest({ type: "invalid" });

      const response = await POST(request, context);

      expect(response.status).toBe(400);
    });

    it("should accept valid type: prices", async () => {
      const request = createRequest({ type: "prices", symbols: ["PETR4"] });

      const response = await POST(request, context);

      expect(response.status).toBe(200);
    });

    it("should accept valid type: rates", async () => {
      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);

      expect(response.status).toBe(200);
    });

    it("should accept valid type: fundamentals", async () => {
      const request = createRequest({ type: "fundamentals", symbols: ["PETR4"] });

      const response = await POST(request, context);

      expect(response.status).toBe(200);
    });

    it("should accept valid type: all", async () => {
      const request = createRequest({ type: "all", symbols: ["PETR4"] });

      const response = await POST(request, context);

      expect(response.status).toBe(200);
    });

    it("should accept optional symbols array", async () => {
      const request = createRequest({
        type: "prices",
        symbols: ["PETR4", "VALE3"],
      });

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      expect(mockRefreshService.refresh).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ["PETR4", "VALE3"],
        })
      );
    });
  });

  describe("error handling", () => {
    it("should return 502 when refresh service fails", async () => {
      mockRefreshService.refresh.mockResolvedValue({
        success: false,
        refreshedAt: new Date(),
        durationMs: 100,
        refreshedTypes: [],
        providers: {},
        error: "Provider failed",
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);

      expect(response.status).toBe(502);
    });

    it("should return error message when refresh fails", async () => {
      mockRefreshService.refresh.mockResolvedValue({
        success: false,
        refreshedAt: new Date(),
        durationMs: 100,
        refreshedTypes: [],
        providers: {},
        error: "All providers failed",
      });

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);
      const data = await response.json();

      expect(data.error).toBe("All providers failed");
    });

    it("should return 500 for unexpected errors", async () => {
      mockRefreshService.refresh.mockRejectedValue(new Error("Unexpected error"));

      const request = createRequest({ type: "rates" });

      const response = await POST(request, context);

      expect(response.status).toBe(500);
    });
  });

  describe("service integration", () => {
    it("should call refresh service with correct parameters", async () => {
      const request = createRequest({
        type: "all",
        symbols: ["PETR4", "VALE3"],
      });

      await POST(request, context);

      expect(mockRefreshService.refresh).toHaveBeenCalledWith({
        userId: "test-user-123",
        type: "all",
        symbols: ["PETR4", "VALE3"],
      });
    });

    it("should call rate limiter with user ID", async () => {
      const request = createRequest({ type: "rates" });

      await POST(request, context);

      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith("test-user-123");
    });
  });
});
