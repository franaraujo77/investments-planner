/**
 * Bulk Dismiss Alerts API Route Unit Tests
 *
 * Story 7.8: Opportunity Alerts Enhancements
 * AC-7.8.1: Dismiss All in Group Action
 *
 * Tests for:
 * - POST /api/alerts/bulk-dismiss - Dismiss multiple alerts at once
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: <T>(
    handler: (
      req: NextRequest,
      session: { userId: string },
      context: { params: Promise<Record<string, string>> }
    ) => Promise<T>
  ) => {
    return (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
      return handler(req, { userId: "test-user-123" }, context ?? { params: Promise.resolve({}) });
    };
  },
}));

// Mock the alert service
const mockDismissMultipleAlerts = vi.fn();

vi.mock("@/lib/services/alert-service", () => ({
  alertService: {
    dismissMultipleAlerts: (userId: string, alertIds: string[]) =>
      mockDismissMultipleAlerts(userId, alertIds),
  },
}));

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/alerts/bulk-dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost:3000/api/alerts/bulk-dismiss", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  it("should dismiss all provided alerts and return success", async () => {
    const alertIds = [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
    ];

    mockDismissMultipleAlerts.mockResolvedValue({
      dismissedCount: 3,
      errors: [],
    });

    const { POST } = await import("@/app/api/alerts/bulk-dismiss/route");
    const response = await POST(createRequest({ alertIds }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.dismissedCount).toBe(3);
    expect(data.data.errors).toBeUndefined();
    expect(mockDismissMultipleAlerts).toHaveBeenCalledWith("test-user-123", alertIds);
  });

  it("should return partial success with errors when some alerts fail", async () => {
    const alertIds = [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
    ];

    mockDismissMultipleAlerts.mockResolvedValue({
      dismissedCount: 1,
      errors: [{ alertId: "550e8400-e29b-41d4-a716-446655440002", error: "Alert not found" }],
    });

    const { POST } = await import("@/app/api/alerts/bulk-dismiss/route");
    const response = await POST(createRequest({ alertIds }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.dismissedCount).toBe(1);
    expect(data.data.errors).toHaveLength(1);
    expect(data.data.errors[0].alertId).toBe("550e8400-e29b-41d4-a716-446655440002");
  });

  it("should return 400 when alertIds is empty", async () => {
    const { POST } = await import("@/app/api/alerts/bulk-dismiss/route");
    const response = await POST(createRequest({ alertIds: [] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should return 400 when alertIds contains invalid UUIDs", async () => {
    const { POST } = await import("@/app/api/alerts/bulk-dismiss/route");
    const response = await POST(createRequest({ alertIds: ["invalid-uuid", "also-invalid"] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should return 400 when alertIds exceeds maximum of 100", async () => {
    const alertIds = Array.from(
      { length: 101 },
      (_, i) => `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, "0")}`
    );

    const { POST } = await import("@/app/api/alerts/bulk-dismiss/route");
    const response = await POST(createRequest({ alertIds }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should return 400 when alertIds is missing from request body", async () => {
    const { POST } = await import("@/app/api/alerts/bulk-dismiss/route");
    const response = await POST(createRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
