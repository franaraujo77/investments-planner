/**
 * Classifications API Unit Tests
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.5: Classification API
 *
 * @module tests/unit/api/classifications.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/data/classifications/route";

// Mock auth middleware
type AuthHandler = (
  request: Request,
  session: { userId: string; email: string }
) => Promise<Response>;
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: (handler: AuthHandler) => {
    return async (request: Request) => {
      // Check for auth header
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Call handler with mock session
      return handler(request, {
        userId: "test-user-id",
        email: "test@example.com",
      });
    };
  },
}));

// Mock classification service
vi.mock("@/lib/services/classification", () => ({
  getAssetClassifications: vi.fn().mockResolvedValue({
    classifications: new Map([
      [
        "AAPL",
        {
          gicsIndustryId: "451030",
          gicsIndustryGroupId: "4510",
          gicsSectorId: "45",
          industryName: "Software",
          industryGroupName: "Software & Services",
          sectorName: "Information Technology",
          confidence: "0.95",
          source: "test",
          cacheUpdatedAt: new Date(),
        },
      ],
    ]),
    failed: ["INVALID"],
    stats: {
      total: 2,
      found: 1,
      fromCache: 1,
      fromProvider: 0,
      stale: 0,
      failed: 1,
    },
  }),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("GET /api/data/classifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const request = new NextRequest("http://localhost/api/data/classifications?symbols=AAPL");

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when symbols parameter is missing", async () => {
    const request = new NextRequest("http://localhost/api/data/classifications", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when symbols parameter is empty", async () => {
    const request = new NextRequest("http://localhost/api/data/classifications?symbols=", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return classifications for valid symbols", async () => {
    const request = new NextRequest(
      "http://localhost/api/data/classifications?symbols=AAPL,INVALID",
      {
        headers: {
          authorization: "Bearer test-token",
        },
      }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.classifications).toHaveLength(1);
    expect(body.data.classifications[0].symbol).toBe("AAPL");
    expect(body.data.classifications[0].gicsIndustryId).toBe("451030");
    expect(body.data.classifications[0].sectorName).toBe("Information Technology");
    expect(body.data.failed).toContain("INVALID");
    expect(body.data.stats.found).toBe(1);
    expect(body.data.stats.failed).toBe(1);
  });

  it("should normalize symbols to uppercase", async () => {
    const { getAssetClassifications } = await import("@/lib/services/classification");

    const request = new NextRequest("http://localhost/api/data/classifications?symbols=aapl,msft", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    await GET(request);

    expect(getAssetClassifications).toHaveBeenCalledWith(["AAPL", "MSFT"]);
  });

  it("should include stats in response", async () => {
    const request = new NextRequest("http://localhost/api/data/classifications?symbols=AAPL", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.data.stats).toEqual({
      total: 2,
      found: 1,
      fromCache: 1,
      fromProvider: 0,
      stale: 0,
      failed: 1,
    });
  });
});
