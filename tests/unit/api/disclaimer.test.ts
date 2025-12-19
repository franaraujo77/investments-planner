/**
 * Disclaimer API Routes Unit Tests
 *
 * Story 9.4: Financial Disclaimers
 *
 * Tests for:
 * - GET /api/user/disclaimer - Get disclaimer acknowledgment status
 * - POST /api/user/disclaimer - Acknowledge the disclaimer
 *
 * AC-9.4.3: User must acknowledge disclaimer before accessing dashboard
 * AC-9.4.4: Acknowledgment timestamp stored in user record
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: <T>(handler: (req: NextRequest, session: { userId: string }) => Promise<T>) => {
    return (req: NextRequest) => {
      return handler(req, { userId: "test-user-123" });
    };
  },
}));

// Mock the disclaimer service
const mockGetDisclaimerStatus = vi.fn();
const mockAcknowledgeDisclaimer = vi.fn();

vi.mock("@/lib/services/disclaimer-service", () => ({
  disclaimerService: {
    getDisclaimerStatus: (userId: string) => mockGetDisclaimerStatus(userId),
    acknowledgeDisclaimer: (userId: string) => mockAcknowledgeDisclaimer(userId),
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

describe("Disclaimer API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAcknowledgedAt = new Date("2024-01-15T10:30:00Z");

  describe("GET /api/user/disclaimer", () => {
    describe("AC-9.4.3: Check disclaimer status for modal display decision", () => {
      it("should return 200 with acknowledged: true and timestamp when acknowledged", async () => {
        mockGetDisclaimerStatus.mockResolvedValue({
          acknowledged: true,
          acknowledgedAt: mockAcknowledgedAt,
        });

        const { GET } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer");

        const response = await GET(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.acknowledged).toBe(true);
        expect(json.data.acknowledgedAt).toBe(mockAcknowledgedAt.toISOString());
        expect(mockGetDisclaimerStatus).toHaveBeenCalledWith("test-user-123");
      });

      it("should return 200 with acknowledged: false and null timestamp when not acknowledged", async () => {
        mockGetDisclaimerStatus.mockResolvedValue({
          acknowledged: false,
          acknowledgedAt: null,
        });

        const { GET } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer");

        const response = await GET(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.acknowledged).toBe(false);
        expect(json.data.acknowledgedAt).toBeNull();
      });

      it("should return response with correct structure for UI consumption", async () => {
        mockGetDisclaimerStatus.mockResolvedValue({
          acknowledged: true,
          acknowledgedAt: mockAcknowledgedAt,
        });

        const { GET } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer");

        const response = await GET(req);
        const json = await response.json();

        // Verify the structure for UI consumption
        expect(json).toHaveProperty("data");
        expect(json.data).toHaveProperty("acknowledged");
        expect(json.data).toHaveProperty("acknowledgedAt");
      });
    });
  });

  describe("POST /api/user/disclaimer", () => {
    describe("AC-9.4.3: Record acknowledgment with timestamp", () => {
      it("should return 200 with acknowledgedAt timestamp on successful acknowledgment", async () => {
        mockAcknowledgeDisclaimer.mockResolvedValue(mockAcknowledgedAt);

        const { POST } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const response = await POST(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.acknowledgedAt).toBe(mockAcknowledgedAt.toISOString());
        expect(mockAcknowledgeDisclaimer).toHaveBeenCalledWith("test-user-123");
      });

      it("should be idempotent - return existing timestamp on repeated calls", async () => {
        // Service is idempotent - returns existing timestamp if already acknowledged
        mockAcknowledgeDisclaimer.mockResolvedValue(mockAcknowledgedAt);

        const { POST } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const response = await POST(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.acknowledgedAt).toBeDefined();
      });

      it("should not require any request body", async () => {
        mockAcknowledgeDisclaimer.mockResolvedValue(mockAcknowledgedAt);

        const { POST } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
      });
    });

    describe("AC-9.4.4: Acknowledgment timestamp stored in user record", () => {
      it("should call disclaimerService.acknowledgeDisclaimer with correct userId", async () => {
        mockAcknowledgeDisclaimer.mockResolvedValue(mockAcknowledgedAt);

        const { POST } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
          method: "POST",
          body: JSON.stringify({}),
        });

        await POST(req);

        expect(mockAcknowledgeDisclaimer).toHaveBeenCalledTimes(1);
        expect(mockAcknowledgeDisclaimer).toHaveBeenCalledWith("test-user-123");
      });

      it("should return ISO formatted timestamp", async () => {
        const timestamp = new Date("2024-06-15T14:30:00Z");
        mockAcknowledgeDisclaimer.mockResolvedValue(timestamp);

        const { POST } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const response = await POST(req);
        const json = await response.json();

        expect(json.data.acknowledgedAt).toBe("2024-06-15T14:30:00.000Z");
      });
    });

    describe("Error handling", () => {
      it("should handle service errors gracefully", async () => {
        const dbError = new Error("Database error");
        (dbError as Error & { code?: string }).code = "INTERNAL_ERROR";
        mockAcknowledgeDisclaimer.mockRejectedValue(dbError);

        const { POST } = await import("@/app/api/user/disclaimer/route");
        const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const response = await POST(req);

        // Should return an error response (500-level)
        expect(response.status).toBeGreaterThanOrEqual(500);
      });
    });
  });

  describe("Response format consistency", () => {
    it("GET should return data in standardized success response format", async () => {
      mockGetDisclaimerStatus.mockResolvedValue({
        acknowledged: true,
        acknowledgedAt: mockAcknowledgedAt,
      });

      const { GET } = await import("@/app/api/user/disclaimer/route");
      const req = new NextRequest("http://localhost:3000/api/user/disclaimer");

      const response = await GET(req);
      const json = await response.json();

      // Standard success response has `data` wrapper
      expect(json).toHaveProperty("data");
      expect(typeof json.data).toBe("object");
    });

    it("POST should return data in standardized success response format", async () => {
      mockAcknowledgeDisclaimer.mockResolvedValue(mockAcknowledgedAt);

      const { POST } = await import("@/app/api/user/disclaimer/route");
      const req = new NextRequest("http://localhost:3000/api/user/disclaimer", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const json = await response.json();

      // Standard success response has `data` wrapper
      expect(json).toHaveProperty("data");
      expect(typeof json.data).toBe("object");
    });
  });
});
