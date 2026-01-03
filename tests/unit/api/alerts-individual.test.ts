/**
 * Individual Alert API Route Tests
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.5: Snooze functionality
 * AC-9.1.3: Alert dismissible by user
 *
 * Tests GET and PATCH /api/alerts/[alertId] endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies using vi.hoisted
const { mockGetAlertById, mockUpdateAlert } = vi.hoisted(() => ({
  mockGetAlertById: vi.fn(),
  mockUpdateAlert: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  withAuth: <T>(
    handler: (
      request: NextRequest,
      session: { userId: string; email: string },
      context: { params: Promise<{ alertId?: string }> }
    ) => Promise<T>
  ) => {
    return async (request: NextRequest, context: { params: Promise<{ alertId?: string }> }) => {
      const mockSession = { userId: "user-123", email: "test@example.com" };
      return handler(request, mockSession, context);
    };
  },
}));

vi.mock("@/lib/services/alert-service", () => ({
  alertService: {
    getAlertById: mockGetAlertById,
    updateAlert: mockUpdateAlert,
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET, PATCH } from "@/app/api/alerts/[alertId]/route";

describe("GET /api/alerts/[alertId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return alert when found", async () => {
    const mockAlert = {
      id: "alert-1",
      userId: "user-123",
      type: "opportunity",
      title: "Better Asset Found",
      message: "Test message",
      severity: "info",
      isRead: false,
      isDismissed: false,
      snoozedUntil: null,
      createdAt: new Date().toISOString(),
    };

    mockGetAlertById.mockResolvedValue(mockAlert);

    const request = new NextRequest("http://localhost/api/alerts/alert-1");
    const response = await GET(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("alert-1");
    expect(mockGetAlertById).toHaveBeenCalledWith("user-123", "alert-1");
  });

  it("should return 404 when alert not found", async () => {
    mockGetAlertById.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/alerts/nonexistent");
    const response = await GET(request, {
      params: Promise.resolve({ alertId: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("should return 404 when alertId is missing", async () => {
    const request = new NextRequest("http://localhost/api/alerts/");
    const response = await GET(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/alerts/[alertId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update alert isRead status", async () => {
    const mockAlert = {
      id: "alert-1",
      userId: "user-123",
      type: "opportunity",
      isRead: true,
      isDismissed: false,
      snoozedUntil: null,
    };

    mockGetAlertById.mockResolvedValue({ ...mockAlert, isRead: false });
    mockUpdateAlert.mockResolvedValue(mockAlert);

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isRead).toBe(true);
  });

  it("should update alert isDismissed status", async () => {
    const mockAlert = {
      id: "alert-1",
      userId: "user-123",
      type: "opportunity",
      isRead: false,
      isDismissed: true,
      snoozedUntil: null,
    };

    mockGetAlertById.mockResolvedValue({ ...mockAlert, isDismissed: false });
    mockUpdateAlert.mockResolvedValue(mockAlert);

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({ isDismissed: true }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isDismissed).toBe(true);
  });

  it("should update alert snoozedUntil timestamp", async () => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 24);

    const mockAlert = {
      id: "alert-1",
      userId: "user-123",
      type: "opportunity",
      isRead: false,
      isDismissed: false,
      snoozedUntil: snoozedUntil.toISOString(),
    };

    mockGetAlertById.mockResolvedValue({ ...mockAlert, snoozedUntil: null });
    mockUpdateAlert.mockResolvedValue(mockAlert);

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({ snoozedUntil: snoozedUntil.toISOString() }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.snoozedUntil).toBe(snoozedUntil.toISOString());
  });

  it("should clear snooze when snoozedUntil is null", async () => {
    const mockAlert = {
      id: "alert-1",
      userId: "user-123",
      type: "opportunity",
      isRead: false,
      isDismissed: false,
      snoozedUntil: null,
    };

    mockGetAlertById.mockResolvedValue({ ...mockAlert, snoozedUntil: new Date().toISOString() });
    mockUpdateAlert.mockResolvedValue(mockAlert);

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({ snoozedUntil: null }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.snoozedUntil).toBeNull();
  });

  it("should return 400 for invalid snoozedUntil format", async () => {
    mockGetAlertById.mockResolvedValue({ id: "alert-1" });

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({ snoozedUntil: "invalid-date" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("should return 404 when alert not found", async () => {
    mockGetAlertById.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/alerts/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 404 when update returns null", async () => {
    mockGetAlertById.mockResolvedValue({ id: "alert-1" });
    mockUpdateAlert.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("should update multiple fields at once", async () => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 24);

    const mockAlert = {
      id: "alert-1",
      userId: "user-123",
      type: "opportunity",
      isRead: true,
      isDismissed: false,
      snoozedUntil: snoozedUntil.toISOString(),
    };

    mockGetAlertById.mockResolvedValue({ ...mockAlert, isRead: false, snoozedUntil: null });
    mockUpdateAlert.mockResolvedValue(mockAlert);

    const request = new NextRequest("http://localhost/api/alerts/alert-1", {
      method: "PATCH",
      body: JSON.stringify({
        isRead: true,
        snoozedUntil: snoozedUntil.toISOString(),
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ alertId: "alert-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isRead).toBe(true);
    expect(data.data.snoozedUntil).toBe(snoozedUntil.toISOString());
  });
});
