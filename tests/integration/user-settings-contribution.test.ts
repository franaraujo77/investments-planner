/**
 * User Settings Contribution API Route Tests
 *
 * Story 6.1: Monthly Contribution Input
 * AC-6.1.2: Contribution Validation
 *
 * Tests for the user settings API endpoints related to contribution management.
 * Tests the route handler logic with mocked auth and service layers.
 *
 * NOTE: These tests mock the service layer to isolate route handler behavior.
 * True end-to-end database integration is covered by E2E tests in Playwright.
 * This provides faster feedback on API contract and validation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock session for authenticated requests
let mockSession: { userId: string; email: string } | null = null;

// Mock user settings state
let mockUserSettings: {
  defaultContribution: string | null;
  baseCurrency: string;
} = {
  defaultContribution: null,
  baseCurrency: "USD",
};

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

// Mock the user service
vi.mock("@/lib/services/user-service", () => ({
  getUserSettings: vi.fn(() => {
    if (!mockSession) {
      return Promise.resolve(null);
    }
    return Promise.resolve(mockUserSettings);
  }),
  updateDefaultContribution: vi.fn((userId: string, contribution: string | null) => {
    if (userId !== mockSession?.userId) {
      throw new Error("User not found");
    }
    mockUserSettings.defaultContribution = contribution;
    return Promise.resolve(mockUserSettings);
  }),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  redactUserId: (id: string) => `***${id.slice(-4)}`,
}));

// Mock API responses
vi.mock("@/lib/api/responses", () => ({
  handleDbError: vi.fn((error: unknown, _operation: string, _context: Record<string, unknown>) => {
    if (error instanceof Error) {
      return { message: error.message, code: "DATABASE_ERROR" };
    }
    return { message: "Unknown error", code: "DATABASE_ERROR" };
  }),
  databaseError: vi.fn((error: { message: string; code: string }, _resource: string) => {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
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

  return new NextRequest("http://localhost:3000/api/user/settings", init);
}

describe("User Settings Contribution API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { userId: "test-user-123", email: "test@example.com" };
    mockUserSettings = {
      defaultContribution: null,
      baseCurrency: "USD",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockSession = null;
  });

  describe("GET /api/user/settings", () => {
    it("should return user settings with default contribution (AC-6.1.2)", async () => {
      mockUserSettings.defaultContribution = "2000.00";

      const { GET } = await import("@/app/api/user/settings/route");
      const request = createRequest("GET");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.settings.defaultContribution).toBe("2000.00");
      expect(data.data.settings.baseCurrency).toBe("USD");
    });

    it("should return null default contribution when not set", async () => {
      const { GET } = await import("@/app/api/user/settings/route");
      const request = createRequest("GET");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.settings.defaultContribution).toBeNull();
    });

    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const { GET } = await import("@/app/api/user/settings/route");
      const request = createRequest("GET");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  describe("PATCH /api/user/settings", () => {
    it("should save default contribution successfully (AC-6.1.2)", async () => {
      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", { defaultContribution: "2500.00" });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.settings.defaultContribution).toBe("2500.00");
    });

    it("should clear default contribution when set to null", async () => {
      mockUserSettings.defaultContribution = "2000.00";

      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", { defaultContribution: null });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.settings.defaultContribution).toBeNull();
    });

    it("should load saved default on subsequent GET", async () => {
      // First, save a default contribution
      const { PATCH, GET } = await import("@/app/api/user/settings/route");
      const patchRequest = createRequest("PATCH", { defaultContribution: "3000.00" });
      await PATCH(patchRequest);

      // Then, fetch settings
      const getRequest = createRequest("GET");
      const response = await GET(getRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.settings.defaultContribution).toBe("3000.00");
    });

    it("should reject zero contribution", async () => {
      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", { defaultContribution: "0" });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should reject negative contribution", async () => {
      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", { defaultContribution: "-100" });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should reject non-numeric contribution", async () => {
      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", { defaultContribution: "abc" });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should reject empty request body", async () => {
      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", {});
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const { PATCH } = await import("@/app/api/user/settings/route");
      const request = createRequest("PATCH", { defaultContribution: "2000.00" });
      const response = await PATCH(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Full Contribution Flow", () => {
    it("should support complete save and load flow (AC-6.1.2)", async () => {
      const { GET, PATCH } = await import("@/app/api/user/settings/route");

      // 1. Initially no default contribution
      let response = await GET(createRequest("GET"));
      let data = await response.json();
      expect(data.data.settings.defaultContribution).toBeNull();

      // 2. Save a default contribution
      response = await PATCH(createRequest("PATCH", { defaultContribution: "5000.00" }));
      data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.settings.defaultContribution).toBe("5000.00");

      // 3. Verify it persists
      response = await GET(createRequest("GET"));
      data = await response.json();
      expect(data.data.settings.defaultContribution).toBe("5000.00");

      // 4. Update to a new value
      response = await PATCH(createRequest("PATCH", { defaultContribution: "7500.00" }));
      data = await response.json();
      expect(data.data.settings.defaultContribution).toBe("7500.00");

      // 5. Clear the default
      response = await PATCH(createRequest("PATCH", { defaultContribution: null }));
      data = await response.json();
      expect(data.data.settings.defaultContribution).toBeNull();

      // 6. Verify cleared
      response = await GET(createRequest("GET"));
      data = await response.json();
      expect(data.data.settings.defaultContribution).toBeNull();
    });
  });
});
