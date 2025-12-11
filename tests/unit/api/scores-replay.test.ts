/**
 * Score Replay API Tests
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.5: Replay Produces Identical Results (Deterministic)
 *
 * Tests for POST /api/scores/[assetId]/replay endpoint:
 * - Authentication requirement
 * - Correlation ID validation
 * - Replay verification response
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/scores/[assetId]/replay/route";

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

vi.mock("@/lib/api/responses", () => ({
  successResponse: (data: unknown) => NextResponse.json({ data }, { status: 200 }),
  errorResponse: (error: string, code: string) => {
    // Map error codes to status codes
    const statusMap: Record<string, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      INTERNAL_ERROR: 500,
    };
    return NextResponse.json({ error, code }, { status: statusMap[code] ?? 500 });
  },
}));

vi.mock("@/lib/api/error-codes", () => ({
  VALIDATION_ERRORS: {
    INVALID_INPUT: "VALIDATION_ERROR",
  },
  NOT_FOUND_ERRORS: {
    RESOURCE_NOT_FOUND: "NOT_FOUND",
  },
  INTERNAL_ERRORS: {
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
}));

vi.mock("@/lib/events/replay", () => ({
  verifyDeterminism: vi.fn(),
  replayCalculation: vi.fn(),
}));

// =============================================================================
// TEST SETUP
// =============================================================================

const mockReplay = vi.mocked(await import("@/lib/events/replay"));

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/scores/test-asset-id/replay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createMockParams(assetId: string = "550e8400-e29b-41d4-a716-446655440000") {
  return {
    params: Promise.resolve({ assetId }),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("POST /api/scores/[assetId]/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for missing correlationId", async () => {
    const request = createMockRequest({});
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for invalid correlationId format", async () => {
    const request = createMockRequest({
      correlationId: "not-a-uuid",
    });
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toContain("Invalid correlation ID");
  });

  it("should return 404 when no events found for correlationId", async () => {
    mockReplay.verifyDeterminism.mockResolvedValue({
      verified: false,
      result: {
        success: false,
        correlationId: "550e8400-e29b-41d4-a716-446655440001",
        originalResults: [],
        replayResults: [],
        matches: false,
        error: "No events found for correlation ID: 550e8400-e29b-41d4-a716-446655440001",
      },
    });

    const request = createMockRequest({
      correlationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("should return 200 with verified=true for deterministic replay", async () => {
    mockReplay.verifyDeterminism.mockResolvedValue({
      verified: true,
      result: {
        success: true,
        correlationId: "550e8400-e29b-41d4-a716-446655440001",
        originalResults: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "75.0000",
            maxPossibleScore: "100",
            percentage: "75",
            breakdown: [],
          },
        ],
        replayResults: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "75.0000",
            maxPossibleScore: "100",
            percentage: "75",
            breakdown: [],
          },
        ],
        matches: true,
      },
    });

    const request = createMockRequest({
      correlationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.verified).toBe(true);
    expect(body.data.matches).toBe(true);
    expect(body.data.correlationId).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(body.data.assetCount).toBe(1);
    expect(body.data.originalScore).toBe("75.0000");
    expect(body.data.replayScore).toBe("75.0000");
  });

  it("should return 200 with verified=false for non-deterministic replay", async () => {
    mockReplay.verifyDeterminism.mockResolvedValue({
      verified: false,
      result: {
        success: true,
        correlationId: "550e8400-e29b-41d4-a716-446655440001",
        originalResults: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "75.0000",
            maxPossibleScore: "100",
            percentage: "75",
            breakdown: [],
          },
        ],
        replayResults: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "70.0000", // Different!
            maxPossibleScore: "100",
            percentage: "70",
            breakdown: [],
          },
        ],
        matches: false,
        discrepancies: [
          {
            assetId: "asset-1",
            originalScore: "75.0000",
            replayScore: "70.0000",
          },
        ],
      },
    });

    const request = createMockRequest({
      correlationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.verified).toBe(false);
    expect(body.data.matches).toBe(false);
    expect(body.data.discrepancies).toHaveLength(1);
    expect(body.data.discrepancies[0]).toEqual({
      assetId: "asset-1",
      originalScore: "75.0000",
      replayScore: "70.0000",
    });
  });

  it("should return 500 for replay failure", async () => {
    mockReplay.verifyDeterminism.mockResolvedValue({
      verified: false,
      result: {
        success: false,
        correlationId: "550e8400-e29b-41d4-a716-446655440001",
        originalResults: [],
        replayResults: [],
        matches: false,
        error: "INPUTS_CAPTURED event not found",
      },
    });

    const request = createMockRequest({
      correlationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("should aggregate scores from multiple assets", async () => {
    mockReplay.verifyDeterminism.mockResolvedValue({
      verified: true,
      result: {
        success: true,
        correlationId: "550e8400-e29b-41d4-a716-446655440001",
        originalResults: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "75.0000",
            maxPossibleScore: "100",
            percentage: "75",
            breakdown: [],
          },
          {
            assetId: "asset-2",
            symbol: "GOOGL",
            score: "50.0000",
            maxPossibleScore: "100",
            percentage: "50",
            breakdown: [],
          },
        ],
        replayResults: [
          {
            assetId: "asset-1",
            symbol: "AAPL",
            score: "75.0000",
            maxPossibleScore: "100",
            percentage: "75",
            breakdown: [],
          },
          {
            assetId: "asset-2",
            symbol: "GOOGL",
            score: "50.0000",
            maxPossibleScore: "100",
            percentage: "50",
            breakdown: [],
          },
        ],
        matches: true,
      },
    });

    const request = createMockRequest({
      correlationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    const params = createMockParams();

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.assetCount).toBe(2);
    // 75 + 50 = 125
    expect(body.data.originalScore).toBe("125.0000");
    expect(body.data.replayScore).toBe("125.0000");
  });
});
