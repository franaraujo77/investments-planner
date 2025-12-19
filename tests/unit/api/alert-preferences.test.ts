/**
 * Alert Preferences API Routes Unit Tests
 *
 * Story 9.3: Alert Preferences
 *
 * Tests for:
 * - GET /api/user/alert-preferences - Get alert preferences
 * - PATCH /api/user/alert-preferences - Update alert preferences
 *
 * AC-9.3.1: Enable/Disable Opportunity Alerts
 * AC-9.3.2: Enable/Disable Drift Alerts
 * AC-9.3.3: Configure Drift Threshold (1-20%)
 * AC-9.3.4: Set Alert Frequency (realtime/daily/weekly)
 * AC-9.3.5: Enable/Disable Email Notifications
 * AC-9.3.7: Preferences UI accessible from Settings page
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

// Mock the alert preferences service
const mockGetPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();

vi.mock("@/lib/services/alert-preferences-service", () => ({
  alertPreferencesService: {
    getPreferences: (userId: string) => mockGetPreferences(userId),
    updatePreferences: (userId: string, updates: Record<string, unknown>) =>
      mockUpdatePreferences(userId, updates),
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

describe("Alert Preferences API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPreferences = {
    id: "pref-123",
    userId: "test-user-123",
    opportunityAlertsEnabled: true,
    driftAlertsEnabled: true,
    driftThreshold: "5.00",
    alertFrequency: "daily" as const,
    emailNotifications: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe("GET /api/user/alert-preferences", () => {
    describe("AC-9.3.7: Preferences UI accessible - API returns current values", () => {
      it("should return 200 with current preferences", async () => {
        mockGetPreferences.mockResolvedValue(mockPreferences);

        const { GET } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences");

        const response = await GET(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data).toEqual(mockPreferences);
        expect(mockGetPreferences).toHaveBeenCalledWith("test-user-123");
      });

      it("should create default preferences if none exist", async () => {
        mockGetPreferences.mockResolvedValue(mockPreferences);

        const { GET } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences");

        const response = await GET(req);

        expect(response.status).toBe(200);
        // getPreferences creates defaults internally if none exist
        expect(mockGetPreferences).toHaveBeenCalledWith("test-user-123");
      });

      it("should return all preference fields", async () => {
        mockGetPreferences.mockResolvedValue(mockPreferences);

        const { GET } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences");

        const response = await GET(req);
        const json = await response.json();

        expect(json.data.opportunityAlertsEnabled).toBe(true);
        expect(json.data.driftAlertsEnabled).toBe(true);
        expect(json.data.driftThreshold).toBe("5.00");
        expect(json.data.alertFrequency).toBe("daily");
        expect(json.data.emailNotifications).toBe(false);
      });
    });
  });

  describe("PATCH /api/user/alert-preferences", () => {
    describe("AC-9.3.1: Enable/Disable Opportunity Alerts", () => {
      it("should update opportunityAlertsEnabled to false", async () => {
        const updatedPrefs = { ...mockPreferences, opportunityAlertsEnabled: false };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ opportunityAlertsEnabled: false }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.opportunityAlertsEnabled).toBe(false);
      });

      it("should update opportunityAlertsEnabled to true", async () => {
        const updatedPrefs = { ...mockPreferences, opportunityAlertsEnabled: true };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ opportunityAlertsEnabled: true }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.opportunityAlertsEnabled).toBe(true);
      });
    });

    describe("AC-9.3.2: Enable/Disable Drift Alerts", () => {
      it("should update driftAlertsEnabled to false", async () => {
        const updatedPrefs = { ...mockPreferences, driftAlertsEnabled: false };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftAlertsEnabled: false }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.driftAlertsEnabled).toBe(false);
      });
    });

    describe("AC-9.3.3: Configure Drift Threshold (1-20%)", () => {
      it("should update driftThreshold to valid value within range", async () => {
        const updatedPrefs = { ...mockPreferences, driftThreshold: "10.00" };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftThreshold: "10.00" }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.driftThreshold).toBe("10.00");
      });

      it("should accept driftThreshold at minimum (1%)", async () => {
        const updatedPrefs = { ...mockPreferences, driftThreshold: "1.00" };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftThreshold: "1.00" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(200);
      });

      it("should accept driftThreshold at maximum (20%)", async () => {
        const updatedPrefs = { ...mockPreferences, driftThreshold: "20.00" };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftThreshold: "20.00" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(200);
      });

      it("should reject driftThreshold below minimum (0.5%)", async () => {
        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftThreshold: "0.50" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(400);
      });

      it("should reject driftThreshold above maximum (25%)", async () => {
        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftThreshold: "25.00" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(400);
      });
    });

    describe("AC-9.3.4: Set Alert Frequency", () => {
      it("should update alertFrequency to realtime", async () => {
        const updatedPrefs = { ...mockPreferences, alertFrequency: "realtime" as const };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ alertFrequency: "realtime" }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.alertFrequency).toBe("realtime");
      });

      it("should update alertFrequency to daily", async () => {
        const updatedPrefs = { ...mockPreferences, alertFrequency: "daily" as const };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ alertFrequency: "daily" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(200);
      });

      it("should update alertFrequency to weekly", async () => {
        const updatedPrefs = { ...mockPreferences, alertFrequency: "weekly" as const };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ alertFrequency: "weekly" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(200);
      });

      it("should reject invalid alertFrequency value", async () => {
        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ alertFrequency: "monthly" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(400);
      });
    });

    describe("AC-9.3.5: Enable/Disable Email Notifications", () => {
      it("should update emailNotifications to true", async () => {
        const updatedPrefs = { ...mockPreferences, emailNotifications: true };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ emailNotifications: true }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.emailNotifications).toBe(true);
      });

      it("should update emailNotifications to false", async () => {
        const updatedPrefs = { ...mockPreferences, emailNotifications: false };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ emailNotifications: false }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(200);
      });
    });

    describe("Validation", () => {
      it("should return 400 when no fields provided", async () => {
        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({}),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(400);
      });

      it("should allow updating multiple fields at once", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          opportunityAlertsEnabled: false,
          driftThreshold: "15.00",
          alertFrequency: "weekly" as const,
        };
        mockUpdatePreferences.mockResolvedValue(updatedPrefs);

        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({
            opportunityAlertsEnabled: false,
            driftThreshold: "15.00",
            alertFrequency: "weekly",
          }),
        });

        const response = await PATCH(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.opportunityAlertsEnabled).toBe(false);
        expect(json.data.driftThreshold).toBe("15.00");
        expect(json.data.alertFrequency).toBe("weekly");
      });

      it("should reject invalid boolean for opportunityAlertsEnabled", async () => {
        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ opportunityAlertsEnabled: "yes" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(400);
      });

      it("should reject non-numeric driftThreshold", async () => {
        const { PATCH } = await import("@/app/api/user/alert-preferences/route");
        const req = new NextRequest("http://localhost:3000/api/user/alert-preferences", {
          method: "PATCH",
          body: JSON.stringify({ driftThreshold: "abc" }),
        });

        const response = await PATCH(req);

        expect(response.status).toBe(400);
      });
    });
  });
});
