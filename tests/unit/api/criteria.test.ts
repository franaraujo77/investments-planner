/**
 * Criteria API Unit Tests
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Tests for /api/criteria endpoints:
 * - GET /api/criteria - List all criteria sets
 * - POST /api/criteria - Create a new criteria set
 * - GET /api/criteria/:id - Get a single criteria set
 * - PATCH /api/criteria/:id - Update a criteria set
 * - DELETE /api/criteria/:id - Soft delete a criteria set
 *
 * AC-5.1.1: Create new criterion
 * AC-5.1.3: Criteria organized by market/asset type
 * AC-5.1.4: CRUD operations
 * AC-5.1.6: Immutable versioning
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK CONTROL VARIABLES
// =============================================================================

const mockState = {
  session: null as { userId: string } | null,
  getCriteriaResult: [] as unknown[],
  getByIdResult: null as unknown,
  createResult: null as unknown,
  updateResult: null as unknown,
  canCreate: true,
  throwNotFound: false,
  throwLimitError: false,
  validationError: false,
};

// Export for mock access
export { mockState };

// =============================================================================
// MOCKS
// =============================================================================

// Mock the criteria service
vi.mock("@/lib/services/criteria-service", () => {
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
    getCriteriaSetsForUser: vi.fn(async () => {
      const { mockState: state } = await import("./criteria.test");
      return state.getCriteriaResult;
    }),
    getCriteriaById: vi.fn(async () => {
      const { mockState: state } = await import("./criteria.test");
      if (state.throwNotFound) {
        return null;
      }
      return state.getByIdResult;
    }),
    createCriteriaSet: vi.fn(async () => {
      const { mockState: state } = await import("./criteria.test");
      if (state.throwLimitError) {
        throw new CriteriaSetLimitError();
      }
      return state.createResult;
    }),
    updateCriteriaSet: vi.fn(async () => {
      const { mockState: state } = await import("./criteria.test");
      if (state.throwNotFound) {
        throw new CriteriaNotFoundError();
      }
      return state.updateResult;
    }),
    deleteCriteriaSet: vi.fn(async () => {
      const { mockState: state } = await import("./criteria.test");
      if (state.throwNotFound) {
        throw new CriteriaNotFoundError();
      }
      return;
    }),
    canCreateCriteriaSet: vi.fn(async () => {
      const { mockState: state } = await import("./criteria.test");
      return state.canCreate;
    }),
    CriteriaNotFoundError,
    CriteriaSetLimitError,
  };
});

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context?: unknown) => {
      const { mockState: state } = await import("./criteria.test");
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

// Mock API responses
vi.mock("@/lib/api/responses", () => ({
  handleDbError: vi.fn((error) => ({ message: error.message })),
  databaseError: vi.fn((error, context) => {
    return new Response(JSON.stringify({ error: error.message, code: "DATABASE_ERROR", context }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }),
}));

// Mock validation schemas
vi.mock("@/lib/validations/criteria-schemas", () => ({
  createCriteriaSetSchema: {
    safeParse: vi.fn((data) => {
      // Import mockState dynamically to check validation error flag
      const isValid = !data._forceValidationError;
      if (!isValid) {
        return {
          success: false,
          error: {
            flatten: () => ({ fieldErrors: { name: ["Name is required"] } }),
          },
        };
      }
      return { success: true, data };
    }),
  },
  updateCriteriaSetSchema: {
    safeParse: vi.fn((data) => {
      const isValid = !data._forceValidationError;
      if (!isValid) {
        return {
          success: false,
          error: {
            flatten: () => ({ fieldErrors: { name: ["Invalid name"] } }),
          },
        };
      }
      return { success: true, data };
    }),
  },
  queryCriteriaSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  MAX_CRITERIA_SETS_PER_USER: 50,
}));

// Import route handlers after mocks
import { GET as GETList, POST } from "@/app/api/criteria/route";
import { GET as GETSingle, PATCH, DELETE } from "@/app/api/criteria/[id]/route";

// Mock criteria data
const mockCriteriaVersion = {
  id: "criteria-123",
  userId: "user-123",
  assetType: "stock",
  targetMarket: "BR_BANKS",
  name: "Test Criteria",
  criteria: [
    {
      id: "criterion-1",
      name: "High Dividend",
      metric: "dividend_yield",
      operator: "gt",
      value: "4.0",
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

describe("Criteria API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.session = { userId: "user-123" };
    mockState.getCriteriaResult = [mockCriteriaVersion];
    mockState.getByIdResult = mockCriteriaVersion;
    mockState.createResult = mockCriteriaVersion;
    mockState.updateResult = { ...mockCriteriaVersion, version: 2 };
    mockState.canCreate = true;
    mockState.throwNotFound = false;
    mockState.throwLimitError = false;
    mockState.validationError = false;
  });

  describe("GET /api/criteria (List)", () => {
    it("should return 200 with criteria list", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria");

      const response = await GETList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.meta.count).toBe(1);
    });

    it("should return 401 when not authenticated", async () => {
      mockState.session = null;

      const request = new NextRequest("http://localhost:3000/api/criteria");

      const response = await GETList(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should include canCreate in meta", async () => {
      mockState.canCreate = true;

      const request = new NextRequest("http://localhost:3000/api/criteria");

      const response = await GETList(request);
      const data = await response.json();

      expect(data.meta.canCreate).toBe(true);
    });

    it("should include limit in meta", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria");

      const response = await GETList(request);
      const data = await response.json();

      expect(data.meta.limit).toBe(50);
    });

    it("should handle empty criteria list", async () => {
      mockState.getCriteriaResult = [];

      const request = new NextRequest("http://localhost:3000/api/criteria");

      const response = await GETList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.meta.count).toBe(0);
    });
  });

  describe("POST /api/criteria (Create - AC-5.1.1)", () => {
    it("should return 201 with created criteria", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: "stock",
          targetMarket: "BR_BANKS",
          name: "New Criteria",
          criteria: [
            {
              name: "Test Rule",
              metric: "dividend_yield",
              operator: "gt",
              value: "4.0",
              points: 10,
              requiredFundamentals: [],
              sortOrder: 0,
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      mockState.session = null;

      const request = new NextRequest("http://localhost:3000/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for validation error", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _forceValidationError: true }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 409 when limit exceeded", async () => {
      mockState.throwLimitError = true;

      const request = new NextRequest("http://localhost:3000/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: "stock",
          targetMarket: "BR_BANKS",
          name: "New Criteria",
          criteria: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.code).toBe("LIMIT_EXCEEDED");
    });
  });

  describe("GET /api/criteria/:id (Single)", () => {
    it("should return 200 with criteria", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123");

      const response = await GETSingle(request, {
        params: Promise.resolve({ id: "criteria-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("criteria-123");
    });

    it("should return 401 when not authenticated", async () => {
      mockState.session = null;

      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123");

      const response = await GETSingle(request, {
        params: Promise.resolve({ id: "criteria-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 when criteria not found", async () => {
      mockState.getByIdResult = null;

      const request = new NextRequest("http://localhost:3000/api/criteria/non-existent");

      const response = await GETSingle(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/criteria/:id (Update - AC-5.1.4, AC-5.1.6)", () => {
    it("should return 200 with updated criteria", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "criteria-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      mockState.session = null;

      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "criteria-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for validation error", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _forceValidationError: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "criteria-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 when criteria not found", async () => {
      mockState.throwNotFound = true;

      const request = new NextRequest("http://localhost:3000/api/criteria/non-existent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/criteria/:id (Soft Delete)", () => {
    it("should return 200 on successful delete", async () => {
      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "criteria-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      mockState.session = null;

      const request = new NextRequest("http://localhost:3000/api/criteria/criteria-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "criteria-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 when criteria not found", async () => {
      mockState.throwNotFound = true;

      const request = new NextRequest("http://localhost:3000/api/criteria/non-existent", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });
});
