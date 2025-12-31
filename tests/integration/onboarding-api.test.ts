/**
 * Onboarding API Integration Tests
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.3: Tip Dismissal Persistence
 * AC-3.5.4: Reset Onboarding Tips Option
 *
 * Tests for the onboarding API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock session for authenticated requests
let mockSession: { userId: string; email: string } | null = null;

// Mock dismissed tips state
let mockDismissedTips: string[] = [];
let mockCompletedAt: Date | null = null;

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, ...args: unknown[]) => {
      if (!mockSession) {
        return new Response(
          JSON.stringify({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return handler(request, mockSession, ...args);
    };
  }),
}));

// Mock the onboarding service
vi.mock("@/lib/services/onboarding-service", () => ({
  onboardingService: {
    getDismissedTips: vi.fn(() =>
      Promise.resolve({
        tipsDismissed: mockDismissedTips,
        completedAt: mockCompletedAt,
      })
    ),
    dismissTip: vi.fn((userId: string, tipId: string) => {
      if (!mockDismissedTips.includes(tipId)) {
        mockDismissedTips.push(tipId);
      }
      return Promise.resolve();
    }),
    resetAllTips: vi.fn(() => {
      mockDismissedTips = [];
      mockCompletedAt = null;
      return Promise.resolve();
    }),
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

// Create test request helper
function createRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest("http://localhost:3000/api/user/onboarding", init);
}

describe("Onboarding API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { userId: "test-user-123", email: "test@example.com" };
    mockDismissedTips = [];
    mockCompletedAt = null;
  });

  afterEach(() => {
    mockSession = null;
  });

  describe("GET /api/user/onboarding", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const { GET } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Authentication required");
    });

    it("should return empty dismissed tips for new user", async () => {
      const { GET } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.tipsDismissed).toEqual([]);
      expect(body.data.completedAt).toBeNull();
      expect(body.data.totalTips).toBeGreaterThan(0);
    });

    it("should return dismissed tips when present", async () => {
      mockDismissedTips = ["pie-chart-interaction"];

      const { GET } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.tipsDismissed).toEqual(["pie-chart-interaction"]);
    });
  });

  describe("POST /api/user/onboarding", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const { POST } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("POST", { tipId: "pie-chart-interaction" });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });

    it("should dismiss a tip successfully", async () => {
      const { POST } = await import("@/app/api/user/onboarding/route");

      // Dismiss a tip
      const postRequest = createRequest("POST", {
        tipId: "pie-chart-interaction",
      });
      const postResponse = await POST(postRequest, {
        params: Promise.resolve({}),
      });

      expect(postResponse.status).toBe(200);
      const postBody = await postResponse.json();
      expect(postBody.data.success).toBe(true);
      expect(postBody.data.tipId).toBe("pie-chart-interaction");
      expect(postBody.data.tipsDismissed).toContain("pie-chart-interaction");
    });

    it("should return 400 for empty tipId", async () => {
      const { POST } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("POST", { tipId: "" });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("should return 400 for missing tipId", async () => {
      const { POST } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("POST", {});
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/user/onboarding", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const { DELETE } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("DELETE");
      const response = await DELETE(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });

    it("should reset all tips successfully", async () => {
      mockDismissedTips = ["pie-chart-interaction", "allocation-indicator"];

      const { DELETE } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("DELETE");
      const response = await DELETE(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.success).toBe(true);
      expect(body.data.message).toContain("reset");
    });

    it("should work even when no tips are dismissed", async () => {
      const { DELETE } = await import("@/app/api/user/onboarding/route");
      const request = createRequest("DELETE");
      const response = await DELETE(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.success).toBe(true);
    });
  });

  describe("Full flow integration", () => {
    it("should support complete dismiss -> reset cycle", async () => {
      const { GET, POST, DELETE } = await import("@/app/api/user/onboarding/route");

      // 1. Initial state - no dismissed tips
      let getResponse = await GET(createRequest("GET"), {
        params: Promise.resolve({}),
      });
      expect((await getResponse.json()).data.tipsDismissed).toEqual([]);

      // 2. Dismiss a tip
      await POST(createRequest("POST", { tipId: "pie-chart-interaction" }), {
        params: Promise.resolve({}),
      });

      // 3. Verify tip is dismissed
      getResponse = await GET(createRequest("GET"), {
        params: Promise.resolve({}),
      });
      expect((await getResponse.json()).data.tipsDismissed).toContain("pie-chart-interaction");

      // 4. Reset all tips
      await DELETE(createRequest("DELETE"), { params: Promise.resolve({}) });

      // 5. Verify tips are cleared
      getResponse = await GET(createRequest("GET"), {
        params: Promise.resolve({}),
      });
      expect((await getResponse.json()).data.tipsDismissed).toEqual([]);
    });
  });
});
