/**
 * Extended Score Inputs API Tests
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.1: View All Input Values Used
 * AC-6.9.2: View Each Criterion Evaluation Result
 * AC-6.9.3: View Criteria Version Used for Calculation
 *
 * Tests for the extended /api/scores/[assetId]/inputs endpoint:
 * - criteriaVersion object in response
 * - evaluations array format
 * - correlationId in response
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/scores/[assetId]/inputs/route";

// =============================================================================
// MOCKS
// =============================================================================

vi.mock("@/lib/auth/middleware", () => ({
  withAuth: (
    handler: (
      request: NextRequest,
      session: { userId: string; email: string },
      context: unknown
    ) => Promise<Response>
  ) => {
    return async (request: NextRequest, context: unknown) => {
      const mockSession = {
        userId: "test-user-id",
        email: "test@example.com",
      };
      return handler(request, mockSession, context);
    };
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/services/score-service", () => ({
  getAssetScore: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
}));

// =============================================================================
// TEST SETUP
// =============================================================================

const mockScoreService = vi.mocked(await import("@/lib/services/score-service"));
const mockDb = vi.mocked(await import("@/lib/db"));

function createMockRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/scores/test-asset-id/inputs");
}

function createMockParams(assetId: string = "550e8400-e29b-41d4-a716-446655440000") {
  return {
    params: Promise.resolve({ assetId }),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("GET /api/scores/[assetId]/inputs - Extended Response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for invalid asset ID format", async () => {
    const request = createMockRequest();
    const params = createMockParams("invalid-uuid");

    const response = await GET(request, params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("should return 404 when no score found", async () => {
    mockScoreService.getAssetScore.mockResolvedValue(null);

    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toContain("No score found");
  });

  it("should return extended response with criteriaVersionInfo", async () => {
    // Mock score service
    mockScoreService.getAssetScore.mockResolvedValue({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      symbol: "AAPL",
      score: "75.0000",
      breakdown: [
        {
          criterionId: "crit-1",
          criterionName: "P/E Ratio",
          matched: true,
          pointsAwarded: 10,
          actualValue: "20.5",
          skippedReason: null,
        },
      ],
      criteriaVersionId: "cv-123",
      calculatedAt: new Date("2025-12-11T10:00:00Z"),
      isFresh: true,
    });

    // Mock database queries
    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    // Mock prices query (empty)
    mockSelectChain.limit.mockResolvedValueOnce([]);

    // Mock fundamentals query (empty)
    mockSelectChain.limit.mockResolvedValueOnce([]);

    // Mock exchange rates query (empty)
    mockSelectChain.limit.mockResolvedValueOnce([]);

    // Mock criteria version query
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        id: "cv-123",
        name: "Growth Criteria",
        version: 2,
        createdAt: new Date("2025-12-01T00:00:00Z"),
        criteria: [
          {
            id: "crit-1",
            name: "P/E Ratio",
            metric: "pe_ratio",
            operator: "lt",
            value: "30",
            points: 10,
            requiredFundamentals: ["pe_ratio"],
            sortOrder: 1,
          },
        ],
      },
    ]);

    // Mock calculation events query (for correlationId)
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        correlationId: "corr-456",
      },
    ]);

    mockDb.db.select.mockReturnValue(
      mockSelectChain as unknown as ReturnType<typeof mockDb.db.select>
    );

    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, params);

    expect(response.status).toBe(200);

    const body = await response.json();

    // AC-6.9.3: Verify criteriaVersionInfo is present
    expect(body.data.criteriaVersionInfo).toBeDefined();

    // AC-6.9.2: Verify evaluations array is present
    expect(body.data.evaluations).toBeDefined();
    expect(Array.isArray(body.data.evaluations)).toBe(true);

    // Verify correlationId is present
    expect(body.data).toHaveProperty("correlationId");

    // Verify score object is present
    expect(body.data.score).toBeDefined();
    expect(body.data.score.final).toBeDefined();
    expect(body.data.score.maxPossible).toBeDefined();
    expect(body.data.score.percentage).toBeDefined();
  });

  it("should include operator and threshold in evaluations", async () => {
    mockScoreService.getAssetScore.mockResolvedValue({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      symbol: "AAPL",
      score: "75.0000",
      breakdown: [
        {
          criterionId: "crit-1",
          criterionName: "P/E Ratio",
          matched: true,
          pointsAwarded: 10,
          actualValue: "20.5",
          skippedReason: null,
        },
      ],
      criteriaVersionId: "cv-123",
      calculatedAt: new Date("2025-12-11T10:00:00Z"),
      isFresh: true,
    });

    // Mock database queries
    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    mockSelectChain.limit
      .mockResolvedValueOnce([]) // prices
      .mockResolvedValueOnce([]) // fundamentals
      .mockResolvedValueOnce([]) // rates
      .mockResolvedValueOnce([
        {
          id: "cv-123",
          name: "Growth Criteria",
          version: 2,
          createdAt: new Date(),
          criteria: [
            {
              id: "crit-1",
              name: "P/E Ratio",
              metric: "pe_ratio",
              operator: "lt",
              value: "30",
              points: 10,
              requiredFundamentals: ["pe_ratio"],
              sortOrder: 1,
            },
          ],
        },
      ])
      .mockResolvedValueOnce([{ correlationId: "corr-456" }]);

    mockDb.db.select.mockReturnValue(
      mockSelectChain as unknown as ReturnType<typeof mockDb.db.select>
    );

    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);

    // Check evaluation structure
    const evaluation = body.data.evaluations[0];
    expect(evaluation).toHaveProperty("operator");
    expect(evaluation).toHaveProperty("threshold");
    expect(evaluation).toHaveProperty("actualValue");
    expect(evaluation).toHaveProperty("passed");
    expect(evaluation).toHaveProperty("pointsAwarded");
    expect(evaluation).toHaveProperty("maxPoints");
  });

  it("should handle between operator with range threshold", async () => {
    mockScoreService.getAssetScore.mockResolvedValue({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      symbol: "AAPL",
      score: "75.0000",
      breakdown: [
        {
          criterionId: "crit-range",
          criterionName: "P/E Between",
          matched: true,
          pointsAwarded: 10,
          actualValue: "15.0",
          skippedReason: null,
        },
      ],
      criteriaVersionId: "cv-123",
      calculatedAt: new Date("2025-12-11T10:00:00Z"),
      isFresh: true,
    });

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    mockSelectChain.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cv-123",
          name: "Growth Criteria",
          version: 2,
          createdAt: new Date(),
          criteria: [
            {
              id: "crit-range",
              name: "P/E Between",
              metric: "pe_ratio",
              operator: "between",
              value: "10",
              value2: "20",
              points: 10,
              requiredFundamentals: ["pe_ratio"],
              sortOrder: 1,
            },
          ],
        },
      ])
      .mockResolvedValueOnce([{ correlationId: "corr-456" }]);

    mockDb.db.select.mockReturnValue(
      mockSelectChain as unknown as ReturnType<typeof mockDb.db.select>
    );

    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);

    const evaluation = body.data.evaluations[0];
    expect(evaluation.operator).toBe("between");
    expect(evaluation.threshold).toEqual({
      min: "10",
      max: "20",
    });
  });
});
