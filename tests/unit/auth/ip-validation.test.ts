/**
 * IP Address Validation Tests
 *
 * Tests for IP address validation and sanitization utilities.
 * Epic 3 Retrospective Action Item: Add test coverage for security utilities.
 *
 * Tests:
 * - isValidIp: IPv4 and IPv6 format validation
 * - validateAndSanitizeIp: Input sanitization and injection prevention
 * - getClientIp: Header parsing and priority order
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger to prevent console output and verify security warnings
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock cache config to use in-memory fallback
vi.mock("@/lib/cache/config", () => ({
  getCacheConfig: vi.fn(() => ({ enabled: false })),
}));

import {
  isValidIp,
  validateAndSanitizeIp,
  getClientIp,
  _resetRateLimitStore,
} from "@/lib/auth/rate-limit";

import { logger } from "@/lib/telemetry/logger";

describe("IP Address Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimitStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // isValidIp Tests
  // ===========================================================================

  describe("isValidIp", () => {
    describe("IPv4 addresses", () => {
      it("should accept valid IPv4 addresses", () => {
        expect(isValidIp("192.168.1.1")).toBe(true);
        expect(isValidIp("10.0.0.1")).toBe(true);
        expect(isValidIp("172.16.0.1")).toBe(true);
        expect(isValidIp("8.8.8.8")).toBe(true);
        expect(isValidIp("127.0.0.1")).toBe(true);
        expect(isValidIp("0.0.0.0")).toBe(true);
        expect(isValidIp("255.255.255.255")).toBe(true);
      });

      it("should reject invalid IPv4 addresses", () => {
        expect(isValidIp("256.1.1.1")).toBe(false);
        expect(isValidIp("192.168.1")).toBe(false);
        expect(isValidIp("192.168.1.1.1")).toBe(false);
        expect(isValidIp("192.168.1.-1")).toBe(false);
        expect(isValidIp("192.168.1.a")).toBe(false);
        expect(isValidIp("")).toBe(false);
        expect(isValidIp("not-an-ip")).toBe(false);
      });

      it("should reject edge case invalid octets", () => {
        expect(isValidIp("300.1.1.1")).toBe(false);
        expect(isValidIp("1.2.3.999")).toBe(false);
        expect(isValidIp("1.2.3.1000")).toBe(false);
      });
    });

    describe("IPv6 addresses", () => {
      it("should accept valid full IPv6 addresses", () => {
        expect(isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
        expect(isValidIp("fe80:0000:0000:0000:0000:0000:0000:0001")).toBe(true);
      });

      // Note: The current implementation has limited support for compressed IPv6.
      // Full IPv6 compressed notation (::) requires more complex regex patterns.
      // These tests document the current behavior.
      it("should accept some compressed IPv6 addresses with ::", () => {
        // Full compressed support would require RFC 5952 compliant regex
        // Current implementation supports basic compressed forms
        expect(isValidIp("2001:db8:85a3::8a2e")).toBe(true);
      });

      it("should have limited support for edge-case compressed IPv6", () => {
        // These are valid IPv6 but current regex doesn't fully support them
        // This documents current behavior for future improvement
        expect(isValidIp("::1")).toBe(false); // Loopback - not supported
        expect(isValidIp("::")).toBe(false); // All zeros - not supported
      });

      it("should reject invalid IPv6 addresses", () => {
        expect(isValidIp("2001:db8:85a3:0000:0000:8a2e:0370:7334:extra")).toBe(false);
        expect(isValidIp("2001:db8")).toBe(false);
        expect(isValidIp("gggg::1")).toBe(false);
      });
    });
  });

  // ===========================================================================
  // validateAndSanitizeIp Tests
  // ===========================================================================

  describe("validateAndSanitizeIp", () => {
    it("should return null for null input", () => {
      expect(validateAndSanitizeIp(null)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(validateAndSanitizeIp("")).toBeNull();
    });

    it("should return null for whitespace-only input", () => {
      expect(validateAndSanitizeIp("   ")).toBeNull();
      expect(validateAndSanitizeIp("\t\n")).toBeNull();
    });

    it("should trim whitespace from valid IPs", () => {
      expect(validateAndSanitizeIp("  192.168.1.1  ")).toBe("192.168.1.1");
      expect(validateAndSanitizeIp("\t127.0.0.1\n")).toBe("127.0.0.1");
    });

    it("should accept valid IPv4 addresses", () => {
      expect(validateAndSanitizeIp("192.168.1.1")).toBe("192.168.1.1");
      expect(validateAndSanitizeIp("10.0.0.1")).toBe("10.0.0.1");
      expect(validateAndSanitizeIp("127.0.0.1")).toBe("127.0.0.1");
    });

    it("should accept valid full IPv6 addresses", () => {
      expect(validateAndSanitizeIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
        "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
      );
    });

    it("should return null for compressed IPv6 not fully supported", () => {
      // Current implementation has limited IPv6 compressed support
      // These document current behavior
      expect(validateAndSanitizeIp("::1")).toBeNull();
    });

    describe("injection prevention", () => {
      it("should reject SQL injection attempts", () => {
        const result = validateAndSanitizeIp("127.0.0.1; DROP TABLE users;");
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          "Suspicious IP address rejected",
          expect.any(Object)
        );
      });

      it("should reject XSS injection attempts", () => {
        expect(validateAndSanitizeIp("<script>alert('xss')</script>")).toBeNull();
        expect(validateAndSanitizeIp("192.168.1.1<script>")).toBeNull();
        expect(logger.warn).toHaveBeenCalled();
      });

      it("should reject command injection attempts", () => {
        expect(validateAndSanitizeIp("127.0.0.1`whoami`")).toBeNull();
        expect(validateAndSanitizeIp("127.0.0.1; ls -la")).toBeNull();
        expect(validateAndSanitizeIp("127.0.0.1\\n echo pwned")).toBeNull();
      });

      it("should reject quote injection attempts", () => {
        expect(validateAndSanitizeIp("127.0.0.1'")).toBeNull();
        expect(validateAndSanitizeIp('127.0.0.1"')).toBeNull();
      });

      it("should reject suspicious characters", () => {
        // Test each suspicious character individually
        const suspiciousChars = ["<", ">", '"', "'", "`", ";", "\\"];
        for (const char of suspiciousChars) {
          const result = validateAndSanitizeIp(`192.168.1.1${char}`);
          expect(result).toBeNull();
        }
      });

      it("should log warning for suspicious input", () => {
        validateAndSanitizeIp("192.168.1.1; DROP TABLE users;");
        expect(logger.warn).toHaveBeenCalledWith("Suspicious IP address rejected", {
          rawIp: expect.stringContaining("192.168.1.1"),
        });
      });

      it("should truncate long suspicious input in logs", () => {
        const longInput = "a".repeat(100);
        validateAndSanitizeIp(longInput + ";");
        expect(logger.warn).toHaveBeenCalledWith("Suspicious IP address rejected", {
          rawIp: expect.any(String),
        });
        // Verify the logged IP is truncated
        const call = vi.mocked(logger.warn).mock.calls[0];
        const loggedContext = call[1] as { rawIp: string };
        expect(loggedContext.rawIp.length).toBeLessThanOrEqual(50);
      });
    });

    describe("format validation", () => {
      it("should reject invalid IP formats", () => {
        expect(validateAndSanitizeIp("not-an-ip")).toBeNull();
        expect(validateAndSanitizeIp("256.1.1.1")).toBeNull();
        expect(validateAndSanitizeIp("192.168.1")).toBeNull();
      });

      it("should log debug for invalid format", () => {
        validateAndSanitizeIp("invalid-ip");
        expect(logger.debug).toHaveBeenCalledWith("Invalid IP format rejected", {
          rawIp: "invalid-ip",
        });
      });
    });
  });

  // ===========================================================================
  // getClientIp Tests
  // ===========================================================================

  describe("getClientIp", () => {
    function createMockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
      } as unknown as Request;
    }

    it("should return X-Forwarded-For IP first", () => {
      const request = createMockRequest({
        "x-forwarded-for": "203.0.113.1, 192.168.1.1, 10.0.0.1",
        "x-real-ip": "192.168.1.100",
        "cf-connecting-ip": "203.0.113.50",
      });

      expect(getClientIp(request)).toBe("203.0.113.1");
    });

    it("should handle single X-Forwarded-For IP", () => {
      const request = createMockRequest({
        "x-forwarded-for": "203.0.113.1",
      });

      expect(getClientIp(request)).toBe("203.0.113.1");
    });

    it("should fall back to X-Real-IP", () => {
      const request = createMockRequest({
        "x-real-ip": "192.168.1.100",
        "cf-connecting-ip": "203.0.113.50",
      });

      expect(getClientIp(request)).toBe("192.168.1.100");
    });

    it("should fall back to CF-Connecting-IP", () => {
      const request = createMockRequest({
        "cf-connecting-ip": "203.0.113.50",
      });

      expect(getClientIp(request)).toBe("203.0.113.50");
    });

    it("should return localhost when no headers present", () => {
      const request = createMockRequest({});
      expect(getClientIp(request)).toBe("127.0.0.1");
    });

    it("should skip invalid X-Forwarded-For and use next header", () => {
      const request = createMockRequest({
        "x-forwarded-for": "; DROP TABLE users;",
        "x-real-ip": "192.168.1.100",
      });

      expect(getClientIp(request)).toBe("192.168.1.100");
    });

    it("should skip all invalid headers and return localhost", () => {
      const request = createMockRequest({
        "x-forwarded-for": "invalid<script>",
        "x-real-ip": "also-invalid",
        "cf-connecting-ip": "999.999.999.999",
      });

      expect(getClientIp(request)).toBe("127.0.0.1");
    });

    it("should handle whitespace in X-Forwarded-For", () => {
      const request = createMockRequest({
        "x-forwarded-for": "  203.0.113.1  , 192.168.1.1",
      });

      expect(getClientIp(request)).toBe("203.0.113.1");
    });

    it("should validate each header before accepting", () => {
      // First IP in X-Forwarded-For is invalid, should fall to next
      const request = createMockRequest({
        "x-forwarded-for": "not-valid, 192.168.1.1",
        "x-real-ip": "10.0.0.1",
      });

      // Should fall back to X-Real-IP since first X-Forwarded-For is invalid
      expect(getClientIp(request)).toBe("10.0.0.1");
    });
  });
});
