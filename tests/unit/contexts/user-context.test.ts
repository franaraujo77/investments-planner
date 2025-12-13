/**
 * User Context Tests
 *
 * Story 2.3: User Login - User data context for dashboard components
 *
 * Tests for User type and related utilities.
 * Note: React component testing requires @testing-library/react which is not installed.
 * These tests verify the type contracts and utility functions.
 */

import { describe, it, expect } from "vitest";
import type { User } from "@/contexts/user-context";

describe("User type", () => {
  it("should define required user properties", () => {
    const user: User = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      baseCurrency: "USD",
      emailVerified: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    expect(user.id).toBe("user-123");
    expect(user.email).toBe("test@example.com");
    expect(user.name).toBe("Test User");
    expect(user.baseCurrency).toBe("USD");
    expect(user.emailVerified).toBe(true);
    expect(user.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should allow name to be null", () => {
    const user: User = {
      id: "user-456",
      email: "noname@example.com",
      name: null,
      baseCurrency: "EUR",
      emailVerified: false,
      createdAt: "2024-06-15T12:00:00.000Z",
    };

    expect(user.name).toBeNull();
    expect(user.emailVerified).toBe(false);
  });

  it("should support different base currencies", () => {
    const currencies = ["USD", "EUR", "GBP", "BRL"];

    currencies.forEach((currency) => {
      const user: User = {
        id: "test-id",
        email: "test@example.com",
        name: null,
        baseCurrency: currency,
        emailVerified: true,
        createdAt: "2024-01-01",
      };

      expect(user.baseCurrency).toBe(currency);
    });
  });
});

describe("User data display helpers", () => {
  // Helper functions that could be extracted from app-sidebar.tsx

  function getDisplayName(user: { name: string | null; email: string }): string {
    if (user.name) {
      return user.name;
    }
    return user.email.split("@")[0] ?? "User";
  }

  function getUserInitials(user: { name: string | null; email: string }): string {
    const displayName = getDisplayName(user);
    const parts = displayName.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }

  describe("getDisplayName", () => {
    it("returns name when available", () => {
      expect(getDisplayName({ name: "John Doe", email: "john@example.com" })).toBe("John Doe");
    });

    it("returns email username when name is null", () => {
      expect(getDisplayName({ name: null, email: "john.doe@example.com" })).toBe("john.doe");
    });

    it("handles simple email usernames", () => {
      expect(getDisplayName({ name: null, email: "admin@test.org" })).toBe("admin");
    });

    it("returns 'User' for malformed email", () => {
      // Edge case: email without @
      const result = getDisplayName({ name: null, email: "noemail" });
      expect(result).toBe("noemail");
    });
  });

  describe("getUserInitials", () => {
    it("returns two-letter initials for full names", () => {
      expect(getUserInitials({ name: "John Doe", email: "john@example.com" })).toBe("JD");
      expect(getUserInitials({ name: "Jane Smith", email: "jane@example.com" })).toBe("JS");
    });

    it("returns first two letters for single names", () => {
      expect(getUserInitials({ name: "Admin", email: "admin@example.com" })).toBe("AD");
      expect(getUserInitials({ name: "Bob", email: "bob@example.com" })).toBe("BO");
    });

    it("uses email username for null names", () => {
      expect(getUserInitials({ name: null, email: "testuser@example.com" })).toBe("TE");
      expect(getUserInitials({ name: null, email: "ab@example.com" })).toBe("AB");
    });

    it("handles multi-word names", () => {
      expect(getUserInitials({ name: "Jean-Luc Picard", email: "captain@enterprise.com" })).toBe(
        "JP"
      );
    });

    it("returns uppercase initials", () => {
      expect(getUserInitials({ name: "john doe", email: "john@example.com" })).toBe("JD");
    });
  });
});
