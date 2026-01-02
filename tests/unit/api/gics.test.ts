/**
 * GICS Reference Data API Unit Tests
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS Three-Tier Hierarchy
 * AC-5.7.7: Reference Data Seed
 *
 * @module tests/unit/api/gics.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/data/gics/route";

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

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("GET /api/data/gics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const request = new NextRequest("http://localhost/api/data/gics");

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return GICS reference data when authenticated", async () => {
    const request = new NextRequest("http://localhost/api/data/gics", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.sectors).toBeDefined();
    expect(body.data.industryGroups).toBeDefined();
    expect(body.data.industries).toBeDefined();
    expect(body.data.stats).toBeDefined();
  });

  it("should return all 11 GICS sectors", async () => {
    const request = new NextRequest("http://localhost/api/data/gics", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.data.sectors).toHaveLength(11);
    expect(body.data.stats.sectorCount).toBe(11);

    // Check that all sectors have required fields
    for (const sector of body.data.sectors) {
      expect(sector.id).toBeDefined();
      expect(sector.name).toBeDefined();
      expect(sector.id).toHaveLength(2);
    }
  });

  it("should return industry groups with correct structure", async () => {
    const request = new NextRequest("http://localhost/api/data/gics", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.data.industryGroups.length).toBeGreaterThanOrEqual(24);

    // Check structure
    const firstGroup = body.data.industryGroups[0];
    expect(firstGroup.id).toBeDefined();
    expect(firstGroup.name).toBeDefined();
    expect(firstGroup.sectorId).toBeDefined();
    expect(firstGroup.id).toHaveLength(4);
    expect(firstGroup.sectorId).toHaveLength(2);
  });

  it("should return industries with correct structure", async () => {
    const request = new NextRequest("http://localhost/api/data/gics", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.data.industries.length).toBeGreaterThanOrEqual(74);

    // Check structure
    const firstIndustry = body.data.industries[0];
    expect(firstIndustry.id).toBeDefined();
    expect(firstIndustry.name).toBeDefined();
    expect(firstIndustry.industryGroupId).toBeDefined();
    expect(firstIndustry.id).toHaveLength(6);
    expect(firstIndustry.industryGroupId).toHaveLength(4);
  });

  it("should include stats matching data counts", async () => {
    const request = new NextRequest("http://localhost/api/data/gics", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.data.stats.sectorCount).toBe(body.data.sectors.length);
    expect(body.data.stats.industryGroupCount).toBe(body.data.industryGroups.length);
    expect(body.data.stats.industryCount).toBe(body.data.industries.length);
  });

  it("should include specific known sectors", async () => {
    const request = new NextRequest("http://localhost/api/data/gics", {
      headers: {
        authorization: "Bearer test-token",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    const sectorNames = body.data.sectors.map((s: { name: string }) => s.name);

    expect(sectorNames).toContain("Information Technology");
    expect(sectorNames).toContain("Financials");
    expect(sectorNames).toContain("Health Care");
    expect(sectorNames).toContain("Energy");
    expect(sectorNames).toContain("Materials");
    expect(sectorNames).toContain("Industrials");
    expect(sectorNames).toContain("Consumer Discretionary");
    expect(sectorNames).toContain("Consumer Staples");
    expect(sectorNames).toContain("Utilities");
    expect(sectorNames).toContain("Real Estate");
    expect(sectorNames).toContain("Communication Services");
  });
});
