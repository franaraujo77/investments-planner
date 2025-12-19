/**
 * Alerts API Routes Unit Tests
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 *
 * AC-9.1.2: Alert has formatted message showing both assets and scores
 * AC-9.1.3: Alert dismissible by user
 *
 * Tests for:
 * - GET /api/alerts - List alerts with pagination
 * - PATCH /api/alerts/[id]/read - Mark alert as read
 * - PATCH /api/alerts/[id]/dismiss - Dismiss alert
 * - DELETE /api/alerts/dismiss-all - Dismiss all alerts
 * - GET /api/alerts/unread/count - Get unread count
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
const mockGetAlerts = vi.fn();
const mockMarkAsRead = vi.fn();
const mockDismissAlert = vi.fn();
const mockDismissAllAlerts = vi.fn();
const mockGetUnreadCount = vi.fn();

vi.mock("@/lib/services/alert-service", () => ({
  alertService: {
    getAlerts: () => mockGetAlerts(),
    markAsRead: (userId: string, alertId: string) => mockMarkAsRead(userId, alertId),
    dismissAlert: (userId: string, alertId: string) => mockDismissAlert(userId, alertId),
    dismissAllAlerts: (userId: string, type?: string) => mockDismissAllAlerts(userId, type),
    getUnreadCount: (userId: string) => mockGetUnreadCount(userId),
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

describe("Alerts API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAlert = {
    id: "alert-123",
    userId: "test-user-123",
    type: "opportunity",
    title: "VOO scores higher than your AAPL",
    message: "VOO scores 85.00 vs your AAPL (70.00). Consider swapping?",
    severity: "info",
    metadata: {
      currentAssetId: "asset-1",
      currentAssetSymbol: "AAPL",
      currentScore: "70",
      betterAssetId: "asset-2",
      betterAssetSymbol: "VOO",
      betterScore: "85",
      scoreDifference: "15",
      assetClassId: "class-1",
      assetClassName: "US Stocks",
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readAt: null,
    dismissedAt: null,
  };

  describe("GET /api/alerts", () => {
    it("should return 200 with alerts and pagination meta", async () => {
      mockGetAlerts.mockResolvedValue({
        alerts: [mockAlert],
        totalCount: 1,
        metadata: { limit: 50, offset: 0 },
      });

      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts");

      const response = await GET(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.meta).toEqual({
        page: 1,
        limit: 50,
        totalCount: 1,
        totalPages: 1,
      });
    });

    it("should handle pagination parameters", async () => {
      mockGetAlerts.mockResolvedValue({
        alerts: [mockAlert],
        totalCount: 100,
        metadata: { limit: 10, offset: 20 },
      });

      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts?page=3&limit=10");

      const response = await GET(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.meta.page).toBe(3);
      expect(json.meta.limit).toBe(10);
      expect(json.meta.totalPages).toBe(10);
    });

    it("should handle type filter", async () => {
      mockGetAlerts.mockResolvedValue({
        alerts: [mockAlert],
        totalCount: 1,
        metadata: { limit: 50, offset: 0 },
      });

      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts?type=opportunity");

      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it("should handle isRead filter", async () => {
      mockGetAlerts.mockResolvedValue({
        alerts: [],
        totalCount: 0,
        metadata: { limit: 50, offset: 0 },
      });

      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts?isRead=false");

      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it("should return empty array when no alerts", async () => {
      mockGetAlerts.mockResolvedValue({
        alerts: [],
        totalCount: 0,
        metadata: { limit: 50, offset: 0 },
      });

      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts");

      const response = await GET(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual([]);
      expect(json.meta.totalCount).toBe(0);
    });

    it("should return 400 for invalid query parameters", async () => {
      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts?type=invalid_type");

      const response = await GET(req);

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /api/alerts/[id]/read", () => {
    describe("AC-9.1.3: Alert dismissible by user (read is soft action)", () => {
      it("should return 200 with updated alert when marked as read", async () => {
        const readAlert = { ...mockAlert, isRead: true, readAt: new Date().toISOString() };
        mockMarkAsRead.mockResolvedValue(readAlert);

        const { PATCH } = await import("@/app/api/alerts/[id]/read/route");
        const req = new NextRequest("http://localhost:3000/api/alerts/alert-123/read");

        const response = await PATCH(req, {
          params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
        });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.isRead).toBe(true);
      });

      it("should return 404 when alert not found", async () => {
        mockMarkAsRead.mockResolvedValue(null);

        const { PATCH } = await import("@/app/api/alerts/[id]/read/route");
        const req = new NextRequest("http://localhost:3000/api/alerts/nonexistent/read");

        const response = await PATCH(req, {
          params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 400 for invalid alert ID format", async () => {
        const { PATCH } = await import("@/app/api/alerts/[id]/read/route");
        const req = new NextRequest("http://localhost:3000/api/alerts/invalid-id/read");

        const response = await PATCH(req, {
          params: Promise.resolve({ id: "invalid-id" }),
        });

        expect(response.status).toBe(400);
      });
    });
  });

  describe("PATCH /api/alerts/[id]/dismiss", () => {
    describe("AC-9.1.3: Alert dismissible by user", () => {
      it("should return 200 with dismissed alert", async () => {
        const dismissedAlert = {
          ...mockAlert,
          isDismissed: true,
          dismissedAt: new Date().toISOString(),
        };
        mockDismissAlert.mockResolvedValue(dismissedAlert);

        const { PATCH } = await import("@/app/api/alerts/[id]/dismiss/route");
        const req = new NextRequest("http://localhost:3000/api/alerts/alert-123/dismiss");

        const response = await PATCH(req, {
          params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
        });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.isDismissed).toBe(true);
      });

      it("should return 404 when alert not found", async () => {
        mockDismissAlert.mockResolvedValue(null);

        const { PATCH } = await import("@/app/api/alerts/[id]/dismiss/route");
        const req = new NextRequest("http://localhost:3000/api/alerts/nonexistent/dismiss");

        const response = await PATCH(req, {
          params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 400 for invalid alert ID format", async () => {
        const { PATCH } = await import("@/app/api/alerts/[id]/dismiss/route");
        const req = new NextRequest("http://localhost:3000/api/alerts/bad-id/dismiss");

        const response = await PATCH(req, {
          params: Promise.resolve({ id: "bad-id" }),
        });

        expect(response.status).toBe(400);
      });
    });
  });

  describe("DELETE /api/alerts/dismiss-all", () => {
    it("should return 200 with dismissed count", async () => {
      mockDismissAllAlerts.mockResolvedValue(5);

      const { DELETE } = await import("@/app/api/alerts/dismiss-all/route");
      const req = new NextRequest("http://localhost:3000/api/alerts/dismiss-all");

      const response = await DELETE(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.dismissedCount).toBe(5);
    });

    it("should handle type filter", async () => {
      mockDismissAllAlerts.mockResolvedValue(3);

      const { DELETE } = await import("@/app/api/alerts/dismiss-all/route");
      const req = new NextRequest("http://localhost:3000/api/alerts/dismiss-all?type=opportunity");

      const response = await DELETE(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.dismissedCount).toBe(3);
    });

    it("should return 0 when no alerts to dismiss", async () => {
      mockDismissAllAlerts.mockResolvedValue(0);

      const { DELETE } = await import("@/app/api/alerts/dismiss-all/route");
      const req = new NextRequest("http://localhost:3000/api/alerts/dismiss-all");

      const response = await DELETE(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.dismissedCount).toBe(0);
    });

    it("should return 400 for invalid type filter", async () => {
      const { DELETE } = await import("@/app/api/alerts/dismiss-all/route");
      const req = new NextRequest("http://localhost:3000/api/alerts/dismiss-all?type=invalid");

      const response = await DELETE(req);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/alerts/unread/count", () => {
    it("should return 200 with unread count", async () => {
      mockGetUnreadCount.mockResolvedValue(7);

      const { GET } = await import("@/app/api/alerts/unread/count/route");
      const req = new NextRequest("http://localhost:3000/api/alerts/unread/count");

      const response = await GET(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.count).toBe(7);
    });

    it("should return 0 when no unread alerts", async () => {
      mockGetUnreadCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/alerts/unread/count/route");
      const req = new NextRequest("http://localhost:3000/api/alerts/unread/count");

      const response = await GET(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.count).toBe(0);
    });
  });

  describe("AC-9.1.2: Alert has formatted message", () => {
    it("should return alert with formatted message containing both assets and scores", async () => {
      mockGetAlerts.mockResolvedValue({
        alerts: [mockAlert],
        totalCount: 1,
        metadata: { limit: 50, offset: 0 },
      });

      const { GET } = await import("@/app/api/alerts/route");
      const req = new NextRequest("http://localhost:3000/api/alerts");

      const response = await GET(req);
      const json = await response.json();

      const alert = json.data[0];

      // Verify message format
      expect(alert.message).toContain("VOO");
      expect(alert.message).toContain("AAPL");
      expect(alert.message).toContain("85.00");
      expect(alert.message).toContain("70.00");
      expect(alert.message).toContain("Consider swapping?");

      // Verify metadata contains both asset details
      expect(alert.metadata.currentAssetSymbol).toBe("AAPL");
      expect(alert.metadata.betterAssetSymbol).toBe("VOO");
      expect(alert.metadata.currentScore).toBe("70");
      expect(alert.metadata.betterScore).toBe("85");
      expect(alert.metadata.scoreDifference).toBe("15");
    });
  });
});
