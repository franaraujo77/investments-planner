/**
 * User Context Tests
 *
 * Story 2.3: User Login - User data context for dashboard components
 *
 * Tests for User type contract.
 * Note: React component testing requires @testing-library/react which is not installed.
 *
 * For user display utility tests, see: tests/unit/lib/utils/user.test.ts
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
