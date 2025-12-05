/**
 * Asset Classes API Unit Tests
 *
 * Story 4.1: Define Asset Classes
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * Tests for asset classes API endpoints:
 * - GET /api/asset-classes: List all asset classes
 * - POST /api/asset-classes: Create new asset class
 * - GET /api/asset-classes/[id]: Get single asset class
 * - PATCH /api/asset-classes/[id]: Update asset class
 * - DELETE /api/asset-classes/[id]: Delete asset class
 * - GET /api/asset-classes/validate: Validate allocation ranges
 * - GET /api/asset-classes/summary: Get allocation summary
 * - GET /api/asset-classes/asset-counts: Get asset count status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK DATA
// =============================================================================

let mockSession: { userId: string } | null = null;
let mockAssetClasses: any[] = [];
let mockCanCreate = true;

const mockAssetClass = {
  id: "class-123",
  userId: "user-456",
  name: "Fixed Income",
  icon: "💰",
  targetMin: "40.00",
  targetMax: "50.00",
  maxAssets: "10",
  minAllocationValue: "100.00",
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// MOCKS
// =============================================================================

// Mock the asset class service
vi.mock("@/lib/services/asset-class-service", () => ({
  getClassesForUser: vi.fn(() => Promise.resolve(mockAssetClasses)),
  createClass: vi.fn((userId: string, data: any) =>
    Promise.resolve({ ...mockAssetClass, ...data, userId })
  ),
  getAssetClassById: vi.fn((userId: string, id: string) => {
    const found = mockAssetClasses.find((c) => c.id === id);
    return Promise.resolve(found || null);
  }),
  updateClass: vi.fn((userId: string, id: string, data: any) => {
    const found = mockAssetClasses.find((c) => c.id === id);
    if (!found) throw new (class AssetClassNotFoundError extends Error {})();
    return Promise.resolve({ ...found, ...data });
  }),
  deleteClass: vi.fn(() => Promise.resolve()),
  canCreateAssetClass: vi.fn(() => Promise.resolve(mockCanCreate)),
  getAssetCountByClass: vi.fn(() => Promise.resolve(0)),
  validateAllocationRanges: vi.fn(() => Promise.resolve({ valid: true, errors: [], warnings: [] })),
  getAllocationSummary: vi.fn(() =>
    Promise.resolve({
      totalMinimums: "40.00",
      totalMaximums: "50.00",
      unallocatedMinimum: "60.00",
      classCount: 1,
      classesWithRanges: 1,
    })
  ),
  getAssetCountStatus: vi.fn(() => Promise.resolve([])),
  AssetClassNotFoundError: class AssetClassNotFoundError extends Error {
    constructor(message = "Asset class not found") {
      super(message);
      this.name = "AssetClassNotFoundError";
    }
  },
  AssetClassLimitError: class AssetClassLimitError extends Error {
    constructor(message = "Asset class limit reached") {
      super(message);
      this.name = "AssetClassLimitError";
    }
  },
  MAX_ASSET_CLASSES_PER_USER: 10,
}));

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context?: any) => {
      if (!mockSession) {
        return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handler(request, mockSession, context);
    };
  }),
}));

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock validation schemas
vi.mock("@/lib/validations/asset-class-schemas", () => ({
  createAssetClassSchema: {
    safeParse: vi.fn((data) => {
      if (!data.name || data.name.length === 0) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { name: ["Name is required"] },
            }),
          },
        };
      }
      if (data.name.length > 50) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { name: ["Name must be 50 characters or less"] },
            }),
          },
        };
      }
      return { success: true, data };
    }),
  },
  updateAssetClassSchema: {
    safeParse: vi.fn((data) => {
      if (data.name !== undefined && data.name.length > 50) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { name: ["Name must be 50 characters or less"] },
            }),
          },
        };
      }
      if (data.targetMin && data.targetMax) {
        const min = parseFloat(data.targetMin);
        const max = parseFloat(data.targetMax);
        if (min > max) {
          return {
            success: false,
            error: {
              flatten: () => ({
                fieldErrors: { targetMin: ["Minimum cannot exceed maximum"] },
              }),
            },
          };
        }
      }
      return { success: true, data };
    }),
  },
  deleteAssetClassQuerySchema: {
    safeParse: vi.fn((data) => {
      return {
        success: true,
        data: { force: data.force === "true" },
      };
    }),
  },
}));

// =============================================================================
// IMPORT ROUTES AFTER MOCKS
// =============================================================================

import { GET, POST } from "@/app/api/asset-classes/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/asset-classes/[id]/route";
import { GET as GET_VALIDATE } from "@/app/api/asset-classes/validate/route";
import { GET as GET_SUMMARY } from "@/app/api/asset-classes/summary/route";
import { GET as GET_ASSET_COUNTS } from "@/app/api/asset-classes/asset-counts/route";

// =============================================================================
// TESTS
// =============================================================================

describe("Asset Classes API", () => {
  const mockUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { userId: mockUserId };
    mockAssetClasses = [mockAssetClass];
    mockCanCreate = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // GET /api/asset-classes
  // ===========================================================================

  describe("GET /api/asset-classes", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return empty list for new user (AC-4.1.1)", async () => {
      mockAssetClasses = [];

      const request = new NextRequest("http://localhost/api/asset-classes");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.count).toBe(0);
    });

    it("should return list of asset classes with meta (AC-4.1.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Fixed Income");
      expect(data.meta.count).toBe(1);
      expect(data.meta.limit).toBe(10);
      expect(data.meta.canCreate).toBe(true);
    });

    it("should set canCreate to false when limit reached", async () => {
      mockCanCreate = false;

      const request = new NextRequest("http://localhost/api/asset-classes");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.canCreate).toBe(false);
    });
  });

  // ===========================================================================
  // POST /api/asset-classes
  // ===========================================================================

  describe("POST /api/asset-classes", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes", {
        method: "POST",
        body: JSON.stringify({ name: "Test Class" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for empty name", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.details.name).toBeDefined();
    });

    it("should return 400 for name exceeding 50 characters", async () => {
      const longName = "a".repeat(51);

      const request = new NextRequest("http://localhost/api/asset-classes", {
        method: "POST",
        body: JSON.stringify({ name: longName }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 201 with created class for valid request (AC-4.1.2)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes", {
        method: "POST",
        body: JSON.stringify({ name: "Variable Income", icon: "📈" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("Variable Income");
      expect(data.data.icon).toBe("📈");
    });

    it("should return 409 when asset class limit exceeded", async () => {
      const { createClass, AssetClassLimitError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(createClass).mockRejectedValueOnce(new AssetClassLimitError());

      const request = new NextRequest("http://localhost/api/asset-classes", {
        method: "POST",
        body: JSON.stringify({ name: "New Class" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.code).toBe("LIMIT_EXCEEDED");
    });
  });

  // ===========================================================================
  // GET /api/asset-classes/[id]
  // ===========================================================================

  describe("GET /api/asset-classes/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes/class-123");
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await GET_BY_ID(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 for non-existent class", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/non-existent");
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await GET_BY_ID(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return asset class for valid id", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123");
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await GET_BY_ID(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("class-123");
      expect(data.data.name).toBe("Fixed Income");
    });
  });

  // ===========================================================================
  // PATCH /api/asset-classes/[id]
  // ===========================================================================

  describe("PATCH /api/asset-classes/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid data", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "a".repeat(51) }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when min exceeds max (AC-4.3.2)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "PATCH",
        body: JSON.stringify({ targetMin: "60.00", targetMax: "40.00" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent class", async () => {
      const { updateClass, AssetClassNotFoundError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(updateClass).mockRejectedValueOnce(new AssetClassNotFoundError());

      const request = new NextRequest("http://localhost/api/asset-classes/non-existent", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 200 with updated class (AC-4.1.3, AC-4.3.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Name",
          targetMin: "35.00",
          targetMax: "45.00",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Updated Name");
    });

    it("should update maxAssets (AC-4.5.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "PATCH",
        body: JSON.stringify({ maxAssets: 5 }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await PATCH(request, context as any);

      expect(response.status).toBe(200);
    });

    it("should update minAllocationValue (AC-4.6.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "PATCH",
        body: JSON.stringify({ minAllocationValue: "200.00" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await PATCH(request, context as any);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // DELETE /api/asset-classes/[id]
  // ===========================================================================

  describe("DELETE /api/asset-classes/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 for non-existent class", async () => {
      mockAssetClasses = [];

      const request = new NextRequest("http://localhost/api/asset-classes/non-existent", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return warning when class has assets (AC-4.1.5)", async () => {
      const { getAssetCountByClass } = await import("@/lib/services/asset-class-service");
      vi.mocked(getAssetCountByClass).mockResolvedValueOnce(3);

      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.warning).toBe(true);
      expect(data.assetCount).toBe(3);
      expect(data.message).toContain("force=true");
    });

    it("should delete when no assets (AC-4.1.4)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/class-123", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should force delete when force=true", async () => {
      const { getAssetCountByClass } = await import("@/lib/services/asset-class-service");
      vi.mocked(getAssetCountByClass).mockResolvedValueOnce(3);

      const request = new NextRequest("http://localhost/api/asset-classes/class-123?force=true", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "class-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET /api/asset-classes/validate
  // ===========================================================================

  describe("GET /api/asset-classes/validate", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes/validate");
      const response = await GET_VALIDATE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return validation result (AC-4.3.3)", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/validate");
      const response = await GET_VALIDATE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.warnings).toEqual([]);
    });

    it("should return warnings when sum of minimums exceeds 100%", async () => {
      const { validateAllocationRanges } = await import("@/lib/services/asset-class-service");
      vi.mocked(validateAllocationRanges).mockResolvedValueOnce({
        valid: false,
        errors: [],
        warnings: [
          {
            type: "MINIMUM_SUM_EXCEEDS_100",
            message: "Total minimums exceed 100%",
            totalMinimums: "120.00",
            affectedClasses: ["class-1", "class-2"],
          },
        ],
      });

      const request = new NextRequest("http://localhost/api/asset-classes/validate");
      const response = await GET_VALIDATE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.warnings).toHaveLength(1);
      expect(data.warnings[0].type).toBe("MINIMUM_SUM_EXCEEDS_100");
    });
  });

  // ===========================================================================
  // GET /api/asset-classes/summary
  // ===========================================================================

  describe("GET /api/asset-classes/summary", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes/summary");
      const response = await GET_SUMMARY(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return allocation summary", async () => {
      const request = new NextRequest("http://localhost/api/asset-classes/summary");
      const response = await GET_SUMMARY(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalMinimums).toBe("40.00");
      expect(data.totalMaximums).toBe("50.00");
      expect(data.classCount).toBe(1);
    });
  });

  // ===========================================================================
  // GET /api/asset-classes/asset-counts
  // ===========================================================================

  describe("GET /api/asset-classes/asset-counts", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-classes/asset-counts");
      const response = await GET_ASSET_COUNTS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return asset count status (AC-4.5.4)", async () => {
      const { getAssetCountStatus } = await import("@/lib/services/asset-class-service");
      vi.mocked(getAssetCountStatus).mockResolvedValueOnce([
        {
          classId: "class-123",
          className: "Fixed Income",
          currentCount: 3,
          maxAssets: 10,
          isOverLimit: false,
          subclasses: [],
        },
      ]);

      const request = new NextRequest("http://localhost/api/asset-classes/asset-counts");
      const response = await GET_ASSET_COUNTS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].currentCount).toBe(3);
      expect(data.data[0].isOverLimit).toBe(false);
    });

    it("should show isOverLimit true when count exceeds max (AC-4.5.2)", async () => {
      const { getAssetCountStatus } = await import("@/lib/services/asset-class-service");
      vi.mocked(getAssetCountStatus).mockResolvedValueOnce([
        {
          classId: "class-123",
          className: "Fixed Income",
          currentCount: 12,
          maxAssets: 10,
          isOverLimit: true,
          subclasses: [],
        },
      ]);

      const request = new NextRequest("http://localhost/api/asset-classes/asset-counts");
      const response = await GET_ASSET_COUNTS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].isOverLimit).toBe(true);
    });
  });
});
