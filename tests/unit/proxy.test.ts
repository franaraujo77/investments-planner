/**
 * Proxy Tests
 *
 * Tests for Next.js 16 proxy (route protection and authentication)
 * Covers all authentication flows and route protection scenarios.
 *
 * Run with: pnpm test tests/unit/proxy.test.ts
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy, config } from "@/proxy";
import { COOKIE_NAMES } from "@/lib/auth/constants";

// Mock the jwt module
vi.mock("@/lib/auth/jwt", () => ({
  verifyAccessToken: vi.fn(),
}));

import { verifyAccessToken } from "@/lib/auth/jwt";

/**
 * Helper to create a mock NextRequest
 */
function createMockRequest(pathname: string, accessToken?: string): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  const request = new NextRequest(url);

  if (accessToken) {
    // Create a new request with the cookie set
    const headers = new Headers();
    headers.set("cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${accessToken}`);
    return new NextRequest(url, { headers });
  }

  return request;
}

/**
 * Helper to check if response is a redirect
 */
function isRedirect(response: NextResponse): boolean {
  return response.status >= 300 && response.status < 400;
}

/**
 * Helper to get redirect location
 */
function getRedirectLocation(response: NextResponse): string | null {
  return response.headers.get("location");
}

describe("Proxy - Protected Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect unauthenticated users from protected routes to login", async () => {
    // Arrange: Access / without token
    const request = createMockRequest("/");

    // Act
    const response = await proxy(request);

    // Assert: Should redirect to /login with redirect param
    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
    expect(location).toContain("redirect=%2F");
  });

  it("should redirect unauthenticated users from /portfolio to login", async () => {
    const request = createMockRequest("/portfolio");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
    expect(location).toContain("redirect=%2Fportfolio");
  });

  it("should redirect unauthenticated users from /settings to login", async () => {
    const request = createMockRequest("/settings");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
  });

  it("should redirect unauthenticated users from /criteria to login", async () => {
    const request = createMockRequest("/criteria");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
  });

  it("should redirect unauthenticated users from /strategy to login", async () => {
    const request = createMockRequest("/strategy");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
  });

  it("should redirect unauthenticated users from /history to login", async () => {
    const request = createMockRequest("/history");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
  });

  it("should redirect unauthenticated users from nested protected routes", async () => {
    const request = createMockRequest("/portfolio/123");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");
  });

  it("should allow authenticated users to access protected routes", async () => {
    // Arrange: Mock successful token verification
    (verifyAccessToken as Mock).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const request = createMockRequest("/", "valid-token");

    // Act
    const response = await proxy(request);

    // Assert: Should pass through (NextResponse.next())
    expect(isRedirect(response)).toBe(false);
    expect(verifyAccessToken).toHaveBeenCalledWith("valid-token");
  });

  it("should allow authenticated users to access /portfolio", async () => {
    (verifyAccessToken as Mock).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const request = createMockRequest("/portfolio", "valid-token");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should clear invalid cookies and redirect to login for expired token", async () => {
    // Arrange: Mock token verification failure (expired)
    (verifyAccessToken as Mock).mockRejectedValue(new Error("Token expired"));

    const request = createMockRequest("/", "expired-token");

    // Act
    const response = await proxy(request);

    // Assert: Should redirect to login and clear cookie
    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");

    // Check that cookie is deleted (uses Expires=1970 to delete)
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toContain(COOKIE_NAMES.ACCESS_TOKEN);
    expect(setCookieHeader).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("should clear invalid cookies and redirect to login for tampered token", async () => {
    (verifyAccessToken as Mock).mockRejectedValue(new Error("Invalid signature"));

    const request = createMockRequest("/settings", "tampered-token");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toContain("/login");

    // Check that cookie is deleted (uses Expires=1970 to delete)
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toContain("Expires=Thu, 01 Jan 1970");
  });
});

describe("Proxy - Public Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow unauthenticated access to /login", async () => {
    const request = createMockRequest("/login");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should allow unauthenticated access to /register", async () => {
    const request = createMockRequest("/register");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should allow unauthenticated access to /verify", async () => {
    const request = createMockRequest("/verify");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should allow unauthenticated access to /verify-pending", async () => {
    const request = createMockRequest("/verify-pending");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should allow unauthenticated access to /reset-password", async () => {
    const request = createMockRequest("/reset-password");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should redirect authenticated users from /login to dashboard", async () => {
    (verifyAccessToken as Mock).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const request = createMockRequest("/login", "valid-token");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toBe("http://localhost:3000/");
  });

  it("should redirect authenticated users from /register to dashboard", async () => {
    (verifyAccessToken as Mock).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const request = createMockRequest("/register", "valid-token");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
    const location = getRedirectLocation(response);
    expect(location).toBe("http://localhost:3000/");
  });

  it("should NOT redirect authenticated users from /verify to dashboard", async () => {
    // Users might need to complete verification even when authenticated
    (verifyAccessToken as Mock).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const request = createMockRequest("/verify", "valid-token");

    const response = await proxy(request);

    // Should NOT redirect - user might need to verify email
    expect(isRedirect(response)).toBe(false);
  });

  it("should NOT redirect authenticated users from /verify-pending to dashboard", async () => {
    (verifyAccessToken as Mock).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const request = createMockRequest("/verify-pending", "valid-token");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });

  it("should clear invalid token on public routes and continue", async () => {
    (verifyAccessToken as Mock).mockRejectedValue(new Error("Token expired"));

    const request = createMockRequest("/login", "expired-token");

    const response = await proxy(request);

    // Should NOT redirect - continue to public route
    expect(isRedirect(response)).toBe(false);

    // But should clear the invalid cookie (uses Expires=1970 to delete)
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toContain(COOKIE_NAMES.ACCESS_TOKEN);
    expect(setCookieHeader).toContain("Expires=Thu, 01 Jan 1970");
  });
});

describe("Proxy - Static Files and Special Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip proxy for /_next/static files", async () => {
    const request = createMockRequest("/_next/static/chunks/main.js");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
    // verifyAccessToken should NOT be called for static files
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("should skip proxy for /_next/image optimization", async () => {
    const request = createMockRequest("/_next/image?url=/logo.png");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("should skip proxy for favicon.ico", async () => {
    const request = createMockRequest("/favicon.ico");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("should skip proxy for files with extensions", async () => {
    const request = createMockRequest("/images/logo.png");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("should skip proxy for CSS files", async () => {
    const request = createMockRequest("/styles/main.css");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("should skip proxy for JavaScript files", async () => {
    const request = createMockRequest("/scripts/app.js");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });
});

describe("Proxy - Route Matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should match exact protected route /", async () => {
    const request = createMockRequest("/");

    const response = await proxy(request);

    // Without token, should redirect
    expect(isRedirect(response)).toBe(true);
  });

  it("should match protected route with trailing path", async () => {
    const request = createMockRequest("/portfolio/asset/123");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(true);
  });

  it("should not match partial route names", async () => {
    // /login-help should NOT match /login protection rules
    // This tests that we don't have a false positive
    const request = createMockRequest("/login-help");

    const response = await proxy(request);

    // This is an unknown route, should pass through
    expect(isRedirect(response)).toBe(false);
  });

  it("should handle routes that are neither protected nor public", async () => {
    // An unknown route should pass through
    const request = createMockRequest("/unknown-route");

    const response = await proxy(request);

    expect(isRedirect(response)).toBe(false);
  });
});

describe("Proxy - Configuration", () => {
  it("should export a valid matcher configuration", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  it("should have matcher that excludes static files", () => {
    const matcher = config.matcher[0];
    expect(matcher).toContain("_next/static");
    expect(matcher).toContain("_next/image");
    expect(matcher).toContain("favicon.ico");
  });
});

describe("Proxy - Redirect Parameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include correct redirect parameter for /", async () => {
    const request = createMockRequest("/");

    const response = await proxy(request);

    const location = getRedirectLocation(response);
    expect(location).toBe("http://localhost:3000/login?redirect=%2F");
  });

  it("should include correct redirect parameter for /portfolio", async () => {
    const request = createMockRequest("/portfolio");

    const response = await proxy(request);

    const location = getRedirectLocation(response);
    expect(location).toBe("http://localhost:3000/login?redirect=%2Fportfolio");
  });

  it("should include correct redirect parameter for nested routes", async () => {
    const request = createMockRequest("/settings/profile");

    const response = await proxy(request);

    const location = getRedirectLocation(response);
    expect(location).toBe("http://localhost:3000/login?redirect=%2Fsettings%2Fprofile");
  });
});
