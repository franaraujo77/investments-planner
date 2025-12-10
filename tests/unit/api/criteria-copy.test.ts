/**
 * Criteria Copy API Unit Tests
 *
 * Story 5.5: Copy Criteria Set
 *
 * Tests for POST /api/criteria/:id/copy endpoint:
 * - AC-5.5.1: Copy action available
 * - AC-5.5.2: Target market selection
 * - AC-5.5.3: Copied criteria naming
 * - AC-5.5.4: Copy confirmation with new UUIDs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK CONTROL VARIABLES (must be declared before vi.mock for hoisting)
// =============================================================================

// Use a global object to control mock behavior (avoids hoisting issues)
const mockState = {
  session: null as { userId: string } | null,
  copyResult: null as { criteriaVersion: unknown; copiedCount: number } | null,
  throwNotFound: false,
  throwLimitError: false,
};

// =============================================================================
// MOCKS (hoisted to top of file by vitest)
// =============================================================================

// Mock the criteria service - define error classes inline to avoid hoisting issues
vi.mock("@/lib/services/criteria-service", () => {
  // Define error classes inside the factory function
  class CriteriaNotFoundError extends Error {
    constructor() {
      super("Criteria set not found");
      this.name = "CriteriaNotFoundError";
    }
  }

  class CriteriaSetLimitError extends Error {
    constructor() {
      super("Maximum criteria sets reached");
      this.name = "CriteriaSetLimitError";
    }
  }

  return {
    copyCriteriaSet: vi.fn(async () => {
      // Access mockState from outer scope (module-level object is accessible)
      const { mockState: state } = await import("./criteria-copy.test");
      if (state.throwNotFound) {
        throw new CriteriaNotFoundError();
      }
      if (state.throwLimitError) {
        throw new CriteriaSetLimitError();
      }
      return state.copyResult;
    }),
    CriteriaNotFoundError,
    CriteriaSetLimitError,
  };
});

// Export mockState so the mock can access it
export { mockState };

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context?: unknown) => {
      // Access mockState dynamically
      const { mockState: state } = await import("./criteria-copy.test");
      if (!state.session) {
        return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handler(request, state.session, context);
    };
  }),
}));

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the validation schemas
vi.mock("@/lib/validations/criteria-schemas", () => ({
  copyCriteriaSchema: {
    safeParse: vi.fn((data) => ({
      success: true,
      data,
    })),
  },
}));

// Import the route handler after mocks
import { POST } from "@/app/api/criteria/[id]/copy/route";

// Mock criteria version for success responses
const mockCriteriaVersion = {
  id: "new-criteria-id",
  userId: "user-123",
  assetType: "stock",
  targetMarket: "BR_BANKS",
  name: "Test Criteria (Copy)",
  criteria: [
    {
      id: "new-criterion-1",
      name: "High Dividend",
      metric: "dividend_yield",
      operator: "gt",
      value: "4.0",
      value2: null,
      points: 10,
      requiredFundamentals: ["dividend_yield"],
      sortOrder: 0,
    },
  ],
  version: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Criteria Copy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.session = { userId: "user-123" };
    mockState.copyResult = {
      criteriaVersion: mockCriteriaVersion,
      copiedCount: 1,
    };
    mockState.throwNotFound = false;
    mockState.throwLimitError = false;
  });

  describe("POST /api/criteria/:id/copy", () => {
    it("should return 201 with copied criteria on success", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toBeDefined();
      expect(data.data.criteriaVersion).toBeDefined();
      expect(data.data.copiedCount).toBe(1);
    });

    it("should accept custom name in request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Custom Copy" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });

      expect(response.status).toBe(201);
    });

    it("should accept targetMarket in request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMarket: "US_TECH" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });

      expect(response.status).toBe(201);
    });

    it("should return 401 when not authenticated", async () => {
      mockState.session = null;

      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 when source criteria not found", async () => {
      mockState.throwNotFound = true;

      const request = new NextRequest("http://localhost:3000/api/criteria/non-existent/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 409 when criteria set limit exceeded", async () => {
      mockState.throwLimitError = true;

      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.code).toBe("LIMIT_EXCEEDED");
    });

    it("should accept empty request body (defaults)", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });

      expect(response.status).toBe(201);
    });

    it("should include copiedCount in response", async () => {
      mockState.copyResult = {
        criteriaVersion: mockCriteriaVersion,
        copiedCount: 5,
      };

      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.copiedCount).toBe(5);
    });
  });

  describe("Error handling", () => {
    it("should return NOT_FOUND code for CriteriaNotFoundError", async () => {
      mockState.throwNotFound = true;

      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });
      const data = await response.json();

      expect(data.code).toBe("NOT_FOUND");
      expect(data.error).toBeDefined();
    });

    it("should return LIMIT_EXCEEDED code for CriteriaSetLimitError", async () => {
      mockState.throwLimitError = true;

      const request = new NextRequest("http://localhost:3000/api/criteria/source-id/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "source-id" }) });
      const data = await response.json();

      expect(data.code).toBe("LIMIT_EXCEEDED");
      expect(data.error).toBeDefined();
    });
  });
});
