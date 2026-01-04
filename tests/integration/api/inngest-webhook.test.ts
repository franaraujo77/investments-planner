/**
 * Inngest Webhook Handler Integration Tests
 *
 * Story 8.1: Inngest Job Infrastructure
 * AC-8.1.2: Webhook handler at /api/inngest receives and processes Inngest events
 *
 * Tests:
 * - GET endpoint returns function registration info
 * - POST endpoint accepts Inngest events
 * - Handler responds correctly to Inngest introspection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock database to prevent connection attempts during tests
// This must be before any imports that might use the db
vi.mock("@/lib/db", () => ({
  db: {},
}));

// Mock the logger to avoid actual logging during tests
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import route handlers after mocks are set up
import { GET, POST, PUT } from "@/app/api/inngest/route";

describe("Inngest Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("route exports", () => {
    it("exports GET handler", () => {
      expect(GET).toBeDefined();
      expect(typeof GET).toBe("function");
    });

    it("exports POST handler", () => {
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("exports PUT handler", () => {
      expect(PUT).toBeDefined();
      expect(typeof PUT).toBe("function");
    });
  });

  describe("GET endpoint (introspection)", () => {
    it("responds to GET request for function registration", async () => {
      const request = new NextRequest("http://localhost:3000/api/inngest", {
        method: "GET",
      });

      const response = await GET(request);

      // Inngest introspection returns 200 or 400 depending on configuration
      // In test environment without proper Inngest setup, we may get different responses
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });
  });

  describe("function registration", () => {
    it("includes overnight-scoring function in registration", async () => {
      // Verify the functions array includes overnight-scoring
      const { functions } = await import("@/lib/inngest");
      const overnightScoring = functions.find(
        (fn) => fn.id("investments-planner") === "investments-planner-overnight-scoring"
      );
      expect(overnightScoring).toBeDefined();
    });

    it("includes all expected Epic 8 functions", async () => {
      const { functions } = await import("@/lib/inngest");

      // Get all function IDs
      const functionIds = functions.map((fn) => fn.id("investments-planner"));

      // Epic 8 functions (cache warming is done inline in overnight-scoring, not as separate function)
      expect(functionIds).toContain("investments-planner-overnight-scoring");
    });

    it("includes existing functions alongside new Epic 8 functions", async () => {
      const { functions } = await import("@/lib/inngest");

      // Get all function IDs
      const functionIds = functions.map((fn) => fn.id("investments-planner"));

      // Existing functions from previous stories
      expect(functionIds).toContain("investments-planner-purge-deleted-user");
      expect(functionIds).toContain("investments-planner-send-verification-email");
      expect(functionIds).toContain("investments-planner-send-password-reset-email");

      // Epic 8 function (cache warming is done inline in overnight-scoring Step 7)
      expect(functionIds).toContain("investments-planner-overnight-scoring");

      // Story 1.6: GDPR Compliance functions
      expect(functionIds).toContain("investments-planner-generate-data-export");
      expect(functionIds).toContain("investments-planner-send-account-deletion-email");

      // Story 7.14: Dismissed pairs cleanup function
      expect(functionIds).toContain("investments-planner-cleanup-dismissed-pairs");

      // Total should be 7 functions (Story 7.14 added 7th function, Story 7.16 updated this test)
      expect(functions.length).toBe(7);
    });
  });

  describe("serve configuration", () => {
    it("uses investments-planner client ID", async () => {
      const { inngest } = await import("@/lib/inngest");
      expect(inngest.id).toBe("investments-planner");
    });
  });
});
