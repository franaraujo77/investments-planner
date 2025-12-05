/**
 * Asset Subclasses API Unit Tests
 *
 * Story 4.2: Define Subclasses
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * Tests for asset subclasses API endpoints:
 * - GET /api/asset-classes/[id]/subclasses: List subclasses for a class
 * - POST /api/asset-classes/[id]/subclasses: Create new subclass
 * - GET /api/asset-subclasses/[id]: Get single subclass
 * - PATCH /api/asset-subclasses/[id]: Update subclass
 * - DELETE /api/asset-subclasses/[id]: Delete subclass
 * - GET /api/asset-classes/[id]/validate-subclasses: Validate subclass ranges
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK DATA
// =============================================================================

let mockSession: { userId: string } | null = null;
let mockSubclasses: any[] = [];
let mockCanCreate = true;

const mockSubclass = {
  id: "subclass-123",
  classId: "class-456",
  name: "Government Bonds",
  targetMin: "20.00",
  targetMax: "30.00",
  maxAssets: "5",
  minAllocationValue: "50.00",
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAssetClass = {
  id: "class-456",
  userId: "user-789",
  name: "Fixed Income",
  targetMin: "40.00",
  targetMax: "50.00",
};

// =============================================================================
// MOCKS
// =============================================================================

// Mock the asset class service
vi.mock("@/lib/services/asset-class-service", () => ({
  getSubclassesForClass: vi.fn(() => Promise.resolve(mockSubclasses)),
  createSubclass: vi.fn((userId: string, classId: string, data: any) =>
    Promise.resolve({ ...mockSubclass, ...data, classId })
  ),
  getSubclassById: vi.fn((userId: string, id: string) => {
    const found = mockSubclasses.find((s) => s.id === id);
    return Promise.resolve(found || null);
  }),
  updateSubclass: vi.fn((userId: string, id: string, data: any) => {
    const found = mockSubclasses.find((s) => s.id === id);
    if (!found) throw new (class SubclassNotFoundError extends Error {})();
    return Promise.resolve({ ...found, ...data });
  }),
  deleteSubclass: vi.fn(() => Promise.resolve()),
  canCreateSubclass: vi.fn(() => Promise.resolve(mockCanCreate)),
  getAssetCountBySubclass: vi.fn(() => Promise.resolve(0)),
  validateSubclassAllocationRanges: vi.fn(() =>
    Promise.resolve({
      valid: true,
      parentClass: mockAssetClass,
      warnings: [],
    })
  ),
  AssetClassNotFoundError: class AssetClassNotFoundError extends Error {
    constructor(message = "Asset class not found") {
      super(message);
      this.name = "AssetClassNotFoundError";
    }
  },
  SubclassNotFoundError: class SubclassNotFoundError extends Error {
    constructor(message = "Subclass not found") {
      super(message);
      this.name = "SubclassNotFoundError";
    }
  },
  SubclassLimitError: class SubclassLimitError extends Error {
    constructor(message = "Subclass limit reached") {
      super(message);
      this.name = "SubclassLimitError";
    }
  },
  MAX_SUBCLASSES_PER_CLASS: 10,
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
  createSubclassSchema: {
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
  updateSubclassSchema: {
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
  deleteSubclassQuerySchema: {
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

import {
  GET as GET_SUBCLASSES,
  POST as POST_SUBCLASS,
} from "@/app/api/asset-classes/[id]/subclasses/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/asset-subclasses/[id]/route";
import { GET as GET_VALIDATE } from "@/app/api/asset-classes/[id]/validate-subclasses/route";

// =============================================================================
// TESTS
// =============================================================================

describe("Asset Subclasses API", () => {
  const mockUserId = "user-789";
  const mockClassId = "class-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { userId: mockUserId };
    mockSubclasses = [mockSubclass];
    mockCanCreate = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // GET /api/asset-classes/[id]/subclasses
  // ===========================================================================

  describe("GET /api/asset-classes/[id]/subclasses", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_SUBCLASSES(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 for non-existent parent class", async () => {
      const { getSubclassesForClass, AssetClassNotFoundError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(getSubclassesForClass).mockRejectedValueOnce(new AssetClassNotFoundError());

      const request = new NextRequest("http://localhost/api/asset-classes/non-existent/subclasses");
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await GET_SUBCLASSES(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return empty list when no subclasses (AC-4.2.1)", async () => {
      mockSubclasses = [];

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_SUBCLASSES(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.count).toBe(0);
    });

    it("should return list of subclasses with meta (AC-4.2.1)", async () => {
      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_SUBCLASSES(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Government Bonds");
      expect(data.meta.count).toBe(1);
      expect(data.meta.limit).toBe(10);
      expect(data.meta.canCreate).toBe(true);
    });
  });

  // ===========================================================================
  // POST /api/asset-classes/[id]/subclasses
  // ===========================================================================

  describe("POST /api/asset-classes/[id]/subclasses", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`,
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Subclass" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await POST_SUBCLASS(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for empty name", async () => {
      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`,
        {
          method: "POST",
          body: JSON.stringify({ name: "" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await POST_SUBCLASS(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent parent class", async () => {
      const { createSubclass, AssetClassNotFoundError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(createSubclass).mockRejectedValueOnce(new AssetClassNotFoundError());

      const request = new NextRequest(
        "http://localhost/api/asset-classes/non-existent/subclasses",
        {
          method: "POST",
          body: JSON.stringify({ name: "New Subclass" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await POST_SUBCLASS(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 409 when subclass limit exceeded", async () => {
      const { createSubclass, SubclassLimitError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(createSubclass).mockRejectedValueOnce(new SubclassLimitError());

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`,
        {
          method: "POST",
          body: JSON.stringify({ name: "New Subclass" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await POST_SUBCLASS(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.code).toBe("LIMIT_EXCEEDED");
    });

    it("should return 201 with created subclass (AC-4.2.2)", async () => {
      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/subclasses`,
        {
          method: "POST",
          body: JSON.stringify({ name: "Corporate Bonds" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await POST_SUBCLASS(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("Corporate Bonds");
    });
  });

  // ===========================================================================
  // GET /api/asset-subclasses/[id]
  // ===========================================================================

  describe("GET /api/asset-subclasses/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123");
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await GET_BY_ID(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 for non-existent subclass", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/non-existent");
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await GET_BY_ID(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return subclass for valid id", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123");
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await GET_BY_ID(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("subclass-123");
      expect(data.data.name).toBe("Government Bonds");
    });
  });

  // ===========================================================================
  // PATCH /api/asset-subclasses/[id]
  // ===========================================================================

  describe("PATCH /api/asset-subclasses/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid data", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "a".repeat(51) }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when min exceeds max (AC-4.4.4)", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "PATCH",
        body: JSON.stringify({ targetMin: "40.00", targetMax: "20.00" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent subclass", async () => {
      const { updateSubclass, SubclassNotFoundError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(updateSubclass).mockRejectedValueOnce(new SubclassNotFoundError());

      const request = new NextRequest("http://localhost/api/asset-subclasses/non-existent", {
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

    it("should return 200 with updated subclass (AC-4.2.3, AC-4.4.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Name",
          targetMin: "15.00",
          targetMax: "25.00",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await PATCH(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Updated Name");
    });

    it("should update maxAssets (AC-4.5.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "PATCH",
        body: JSON.stringify({ maxAssets: 3 }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await PATCH(request, context as any);

      expect(response.status).toBe(200);
    });

    it("should update minAllocationValue (AC-4.6.1)", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "PATCH",
        body: JSON.stringify({ minAllocationValue: "75.00" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await PATCH(request, context as any);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // DELETE /api/asset-subclasses/[id]
  // ===========================================================================

  describe("DELETE /api/asset-subclasses/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 for non-existent subclass", async () => {
      mockSubclasses = [];

      const request = new NextRequest("http://localhost/api/asset-subclasses/non-existent", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return warning when subclass has assets (AC-4.2.5)", async () => {
      const { getAssetCountBySubclass } = await import("@/lib/services/asset-class-service");
      vi.mocked(getAssetCountBySubclass).mockResolvedValueOnce(2);

      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.warning).toBe(true);
      expect(data.assetCount).toBe(2);
    });

    it("should delete when no assets (AC-4.2.4)", async () => {
      const request = new NextRequest("http://localhost/api/asset-subclasses/subclass-123", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should force delete when force=true", async () => {
      const { getAssetCountBySubclass } = await import("@/lib/services/asset-class-service");
      vi.mocked(getAssetCountBySubclass).mockResolvedValueOnce(2);

      const request = new NextRequest(
        "http://localhost/api/asset-subclasses/subclass-123?force=true",
        { method: "DELETE" }
      );
      const context = { params: Promise.resolve({ id: "subclass-123" }) };

      const response = await DELETE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET /api/asset-classes/[id]/validate-subclasses
  // ===========================================================================

  describe("GET /api/asset-classes/[id]/validate-subclasses", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/validate-subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_VALIDATE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 for non-existent parent class", async () => {
      const { validateSubclassAllocationRanges, AssetClassNotFoundError } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(validateSubclassAllocationRanges).mockRejectedValueOnce(
        new AssetClassNotFoundError()
      );

      const request = new NextRequest(
        "http://localhost/api/asset-classes/non-existent/validate-subclasses"
      );
      const context = { params: Promise.resolve({ id: "non-existent" }) };

      const response = await GET_VALIDATE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return validation result (AC-4.4.2, AC-4.4.3)", async () => {
      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/validate-subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_VALIDATE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.valid).toBe(true);
      expect(data.data.warnings).toEqual([]);
    });

    it("should return warnings when subclass max exceeds parent (AC-4.4.2)", async () => {
      const { validateSubclassAllocationRanges } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(validateSubclassAllocationRanges).mockResolvedValueOnce({
        valid: false,
        parentClass: mockAssetClass,
        warnings: [
          {
            type: "SUBCLASS_MAX_EXCEEDS_PARENT",
            message: "Subclass max exceeds parent class max",
            subclassId: "subclass-123",
            subclassMax: "60.00",
            parentMax: "50.00",
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/validate-subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_VALIDATE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.valid).toBe(false);
      expect(data.data.warnings).toHaveLength(1);
      expect(data.data.warnings[0].type).toBe("SUBCLASS_MAX_EXCEEDS_PARENT");
    });

    it("should return warnings when subclass mins exceed parent max (AC-4.4.3)", async () => {
      const { validateSubclassAllocationRanges } =
        await import("@/lib/services/asset-class-service");
      vi.mocked(validateSubclassAllocationRanges).mockResolvedValueOnce({
        valid: false,
        parentClass: mockAssetClass,
        warnings: [
          {
            type: "SUBCLASS_MINS_EXCEED_PARENT_MAX",
            message: "Sum of subclass minimums exceeds parent maximum",
            totalSubclassMins: "55.00",
            parentMax: "50.00",
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost/api/asset-classes/${mockClassId}/validate-subclasses`
      );
      const context = { params: Promise.resolve({ id: mockClassId }) };

      const response = await GET_VALIDATE(request, context as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.valid).toBe(false);
      expect(data.data.warnings[0].type).toBe("SUBCLASS_MINS_EXCEED_PARENT_MAX");
    });
  });
});
